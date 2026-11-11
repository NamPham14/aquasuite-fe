import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { codApi } from '../src/features/finance/api/codApi.ts'
import { buildCodRemittance, canRemitCod, codStatusLabel, isUncertainCodError, isUuid, isVndAmount } from '../src/features/finance/lib/cod.ts'
import type { CodCollection } from '../src/features/finance/types/cod.types.ts'

const originalFetch = globalThis.fetch
const stores: ReturnType<typeof createStore>[] = []
function createStore() {
  return configureStore({ reducer: { [baseApi.reducerPath]: baseApi.reducer }, middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware) })
}
function storeForTest() { const store = createStore(); stores.push(store); return store }
afterEach(() => { globalThis.fetch = originalFetch; for (const store of stores.splice(0)) store.dispatch(baseApi.util.resetApiState()) })
const collection: CodCollection = {
  collectionId: '11111111-1111-4111-8111-111111111111', deliveryId: '22222222-2222-4222-8222-222222222222', deliveryCode: 'DL-1', orderId: 'order-1', customerId: 'customer-1', shipperId: 'shipper-1',
  expectedAmount: 22_220_000, amount: 22_220_000, reviewStatus: 'ACCEPTED', collectedAt: '2026-11-09T10:00:00Z', submittedAt: '2026-11-09T10:01:00Z', version: 1,
  remittedAmount: 0, heldAmount: 22_220_000, remittanceStatus: 'PENDING_REMITTANCE',
}

test('partial COD handover preserves version, exact amount and remaining shipper responsibility', () => {
  const result = buildCodRemittance([collection], ['22000000'], 'accountant', 'counted', 'key')
  assert.equal(result.amount, 22_000_000)
  assert.equal(result.items[0]?.expectedVersion, 1)
  assert.equal(collection.heldAmount - result.amount, 220_000)
  assert.equal(result.idempotencyKey, 'key')
})
test('COD allocations reject self receipt, unreviewed claims, overpayment, mixed shippers and duplicates', () => {
  for (const items of [[], [collection, collection], [{ ...collection, reviewStatus: 'SUBMITTED' as const }], [collection, { ...collection, collectionId: 'other', shipperId: 'other' }]]) {
    assert.throws(() => buildCodRemittance(items, items.map(() => '1'), 'accountant', '', 'key'))
  }
  for (const amount of ['0', '-1', '0.5', '22220001', 'NaN', 'Infinity', '']) assert.throws(() => buildCodRemittance([collection], [amount], 'accountant', '', 'key'))
  assert.throws(() => buildCodRemittance([collection], ['1'], collection.shipperId, '', 'key'))
  assert.equal(canRemitCod({ ...collection, heldAmount: 0 }, 'accountant'), false)
  assert.equal(isVndAmount(10_000_000_000_000), false)
  assert.equal(isUuid(collection.collectionId), true)
  assert.equal(isUuid('wrong'), false)
})
test('batch receipt sums actual allocations for the same shipper only', () => {
  const result = buildCodRemittance([collection, { ...collection, collectionId: 'other', version: 3 }], ['100', '200'], 'accountant', '', 'key')
  assert.equal(result.amount, 300)
  assert.equal(result.items[1]?.expectedVersion, 3)
  assert.equal(codStatusLabel('SETTLED'), 'Đã nộp đủ')
  assert.equal(codStatusLabel(null), 'Chưa áp dụng')
})
test('uncertain outcomes require same-key retry; definite conflicts allow reload', () => {
  for (const error of [{ status: 'FETCH_ERROR' }, { status: 'TIMEOUT_ERROR' }, { status: 500 }, { status: 408 }]) assert.equal(isUncertainCodError(error), true)
  for (const status of [400, 403, 409, 413]) assert.equal(isUncertainCodError({ status }), false)
})
test('COD list uses items wrapper, zero-based paging and server filters', async () => {
  const store = storeForTest()
  let request: Request | undefined
  globalThis.fetch = async (input, init) => {
    request = new Request(input, init)
    return Response.json({ data: { items: [collection], page: 2, size: 20, totalElements: 41, totalPages: 3 } })
  }
  const page = await store.dispatch(codApi.endpoints.getCodCollections.initiate({ page: 2, size: 20, status: 'ACCEPTED', shipperId: 'shipper-1' })).unwrap()
  assert.equal(page.items[0]?.collectionId, collection.collectionId)
  const url = new URL(request!.url)
  assert.match(url.pathname, /\/finance\/cod\/collections$/)
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(url.searchParams.get('shipperId'), 'shipper-1')
  assert.equal(url.searchParams.get('status'), 'ACCEPTED')
})
test('claim uses JSON without a file and retries preserve the entire payload and key', async () => {
  const store = storeForTest()
  const bodies: unknown[] = []
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    assert.equal(request.method, 'POST')
    assert.match(request.url, /\/finance\/cod\/collections$/)
    assert.match(request.headers.get('content-type') ?? '', /application\/json/)
    bodies.push(await request.json())
    return bodies.length === 1 ? Response.json({ message: 'timeout' }, { status: 500 }) : Response.json({ data: collection })
  }
  const data = { deliveryId: collection.deliveryId, amount: 22_220_000, collectedAt: collection.collectedAt, note: 'cash', idempotencyKey: 'same-key' }
  await store.dispatch(codApi.endpoints.claimCod.initiate(data)).unwrap().catch(() => {})
  await store.dispatch(codApi.endpoints.claimCod.initiate(data)).unwrap()
  assert.deepEqual(bodies, [data, data])
  assert.equal('getCodProof' in codApi.endpoints, false)
})
test('review and remittance send optimistic versions and use distinct financial endpoints', async () => {
  const store = storeForTest()
  const requests: { url: string; body: unknown }[] = []
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    requests.push({ url: request.url, body: await request.json() })
    return Response.json({ data: collection })
  }
  await store.dispatch(codApi.endpoints.reviewCod.initiate({ id: collection.collectionId, accept: false, expectedVersion: 1, reason: 'unreadable' })).unwrap()
  assert.match(requests[0]!.url, /\/reject$/)
  assert.deepEqual(requests[0]!.body, { expectedVersion: 1, reason: 'unreadable' })
  const body = buildCodRemittance([collection], ['200'], 'accountant', '', 'same-key')
  await store.dispatch(codApi.endpoints.remitCod.initiate(body)).unwrap()
  assert.match(requests[1]!.url, /\/finance\/cod\/remittances$/)
  assert.deepEqual(requests[1]!.body, body)
})
