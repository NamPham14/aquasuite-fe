import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { codApi } from '../src/features/finance/api/codApi.ts'
import { paymentVerificationApi } from '../src/features/finance/api/paymentVerificationApi.ts'
import { canReceiveCod, codStatusLabel, isUncertainCodError, isUuid, isVndAmount } from '../src/features/finance/lib/cod.ts'
import type { CodCollection } from '../src/features/finance/types/cod.types.ts'

const originalFetch = globalThis.fetch
const stores: ReturnType<typeof createStore>[] = []
function createStore() {
  return configureStore({ reducer: { [baseApi.reducerPath]: baseApi.reducer }, middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware) })
}
function storeForTest() { const store = createStore(); stores.push(store); return store }
afterEach(() => { globalThis.fetch = originalFetch; for (const store of stores.splice(0)) store.dispatch(baseApi.util.resetApiState()) })
const collection: CodCollection = {
  collectionId: '11111111-1111-4111-8111-111111111111', deliveryId: '22222222-2222-4222-8222-222222222222', orderId: 'order-1', customerId: 'customer-1', shipperId: 'shipper-1',
  amount: 22_220_000, status: 'PENDING', collectedAt: '2026-11-09T10:00:00Z', submittedAt: '2026-11-09T10:01:00Z', version: 0,
}

test('verified deposit refreshes only its order COD balance and subtracts it from collectible', async () => {
  const store = storeForTest()
  let verified = false
  const reads: Record<string, number> = {}
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    if (request.url.endsWith('/payment-verifications/deposit/verify')) {
      verified = true
      return Response.json({ data: { paymentId: 'deposit', status: 'VERIFIED' } })
    }
    const order = request.url.includes('/orders/other/') ? 'other' : 'one'
    reads[order] = (reads[order] ?? 0) + 1
    const outstanding = verified && order === 'one' ? 13_640_000 : 17_050_000
    return Response.json({ data: { orderId: order, storeOutstanding: outstanding, customerCollectible: outstanding, shipperHeld: 0, pendingClaimAmount: 0 } })
  }
  const first = store.dispatch(codApi.endpoints.getCodBalance.initiate('one'))
  const other = store.dispatch(codApi.endpoints.getCodBalance.initiate('other'))
  await Promise.all([first.unwrap(), other.unwrap()])
  assert.equal(store.getState().api.queries['getCodBalance("one")']?.status, 'fulfilled')
  await store.dispatch(paymentVerificationApi.endpoints.verifyPayment.initiate({ paymentId: 'deposit', orderId: 'one' })).unwrap()
  await new Promise(resolve => setTimeout(resolve, 50))
  assert.equal(codApi.endpoints.getCodBalance.select('one')(store.getState()).data?.customerCollectible, 13_640_000)
  assert.equal(reads.one, 2)
  assert.equal(reads.other, 1)
  first.unsubscribe(); other.unsubscribe()
})

test('only pending declarations can be received and self receipt is forbidden', () => {
  assert.equal(canReceiveCod(collection, 'accountant'), true)
  assert.equal(canReceiveCod(collection, collection.shipperId), false)
  assert.equal(canReceiveCod({ ...collection, status: 'VERIFIED' }, 'accountant'), false)
  assert.equal(canReceiveCod({ ...collection, status: 'REJECTED' }, 'accountant'), false)
  assert.equal(codStatusLabel('PENDING'), 'Chờ bàn giao tiền')
  assert.equal(codStatusLabel('VERIFIED'), 'Đã nhận tiền')
  assert.equal(isVndAmount(10_000_000_000_000), false)
  assert.equal(isUuid(collection.collectionId), true)
  assert.equal(isUuid('wrong'), false)
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
  const page = await store.dispatch(codApi.endpoints.getCodCollections.initiate({ page: 2, size: 20, status: 'VERIFIED', shipperId: 'shipper-1' })).unwrap()
  assert.equal(page.items[0]?.collectionId, collection.collectionId)
  const url = new URL(request!.url)
  assert.match(url.pathname, /\/finance\/cod\/collections$/)
  assert.equal(url.searchParams.get('page'), '2')
  assert.equal(url.searchParams.get('shipperId'), 'shipper-1')
  assert.equal(url.searchParams.get('status'), 'VERIFIED')
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
test('actual cash receipt and rejection use existing endpoints; removed remittance endpoints stay absent', async () => {
  const store = storeForTest()
  const requests: { url: string; body: unknown }[] = []
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    requests.push({ url: request.url, body: await request.json() })
    return Response.json({ data: collection })
  }
  await store.dispatch(codApi.endpoints.reviewCod.initiate({ id: collection.collectionId, accept: false, expectedVersion: 0, reason: 'Cash mismatch' })).unwrap()
  assert.match(requests[0]!.url, /\/reject$/)
  assert.deepEqual(requests[0]!.body, { expectedVersion: 0, reason: 'Cash mismatch' })
  await store.dispatch(codApi.endpoints.reviewCod.initiate({ id: collection.collectionId, accept: true, expectedVersion: 0 })).unwrap()
  assert.match(requests[1]!.url, /\/accept$/)
  assert.deepEqual(requests[1]!.body, { expectedVersion: 0 })
  assert.equal('remitCod' in codApi.endpoints, false)
  assert.equal('getCodHistory' in codApi.endpoints, false)
})
