import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { register } from 'node:module'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
register('./loader.mjs', import.meta.url)
const { deliveryIssueApi: api } = await import('../src/features/fulfillment/api/deliveryIssueApi.ts')
const { deliveryApi } = await import('../src/features/fulfillment/api/deliveryApi.ts')
const { validateDeliveryLines, canManageDeliveries, isUncertainDeliveryError } = await import('../src/features/fulfillment/components/deliveryIssueForm.ts')
const originalFetch = globalThis.fetch
const stores: ReturnType<typeof setup>[] = []
function setup() { const s = configureStore({ reducer: { api: baseApi.reducer }, middleware: (g) => g().concat(baseApi.middleware) }); stores.push(s); return s }
afterEach(() => { globalThis.fetch = originalFetch; stores.splice(0).forEach((s) => s.dispatch(baseApi.util.resetApiState())) })
const candidates = { orderId: 'order', salesInvoiceId: 'invoice', invoiceCode: 'INV-01', orderCode: 'SO-01', deliveryAddress: 'Address', eligible: true, maxCodAmount: 100000, items: [{ orderItemId: 'line', variantId: 'variant', productName: 'Lavabo', sku: 'SKU-01', orderedQty: 10, issuedQty: 3, remainingQty: 7, dispatchableQty: 7, heldQty: 2, availableQty: 5 }] }

test('issue PDF downloads a binary document and preserves JSON authorization errors', async () => {
  const store = setup()
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    assert.match(request.url, /\/fulfillment\/deliveries\/confirmed\/issue-note\.pdf$/)
    assert.equal(request.method, 'GET')
    assert.equal(request.cache, 'no-store')
    return new Response('%PDF-sample', { headers: { 'Content-Type': 'application/pdf' } })
  }
  const url = await store.dispatch(deliveryApi.endpoints.downloadIssueNote.initiate('confirmed')).unwrap()
  assert.match(url, /^blob:/)
  URL.revokeObjectURL(url)
  globalThis.fetch = async () => Response.json({ code: 'FUL_001', message: 'Not confirmed' }, { status: 409 })
  await assert.rejects(store.dispatch(deliveryApi.endpoints.downloadIssueNote.initiate('draft')).unwrap(),
    (error: unknown) => (error as { status: number; data: { code: string } }).status === 409
      && (error as { data: { code: string } }).data.code === 'FUL_001')
})

test('serial-managed lines are blocked with an actionable message before creating delivery', () => {
  const serial = { ...candidates, items: candidates.items.map((line) => ({ ...line, serialTracking: true })) }
  assert.match(validateDeliveryLines(serial, { line: '1' }), /quản lý serial/)
  assert.equal(validateDeliveryLines(candidates, { line: '1' }), '')
})

test('candidates retain quantities separately and use the UC39 invoice endpoint', async () => {
  const store = setup()
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init)
    assert.equal(new URL(req.url).pathname, '/api/v1/fulfillment/sales-invoices/invoice/delivery-candidates')
    return Response.json({ data: candidates })
  }
  const result = await store.dispatch(api.endpoints.getDeliveryCandidates.initiate('invoice')).unwrap()
  assert.equal(result.items[0].remainingQty, 7); assert.equal(result.items[0].heldQty, 2); assert.equal(result.items[0].availableQty, 5)
})
test('create retry preserves client UUID and payload; no stock issue is invoked during creation', async () => {
  const store = setup(), calls: { path: string; body: unknown }[] = []
  const body = { deliveryId: '11111111-1111-4111-8111-111111111111', warehouseCode: 'WH_MAIN' as const, recipientName: 'Người nhận', recipientPhone: '0901234567', deliveryAddress: 'Địa chỉ', scheduledDate: '2026-11-13T09:00:00+07:00', codAmount: 0, note: null, items: [{ orderItemId: 'line', quantity: 2.25 }] }
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init); calls.push({ path: new URL(req.url).pathname, body: await req.json() })
    return calls.length === 1 ? Response.json({ message: 'Unavailable' }, { status: 503 }) : Response.json({ data: { deliveryId: body.deliveryId, deliveryStatus: 'DRAFT' } })
  }
  await assert.rejects(store.dispatch(api.endpoints.createDelivery.initiate({ invoiceId: 'invoice', body })).unwrap())
  const result = await store.dispatch(api.endpoints.createDelivery.initiate({ invoiceId: 'invoice', body })).unwrap()
  assert.deepEqual(calls[0], calls[1]); assert.deepEqual(calls[0].body, body)
  assert.equal(calls[0].path, '/api/v1/fulfillment/sales-invoices/invoice/deliveries'); assert.equal(result.deliveryStatus, 'DRAFT')
})
test('confirm/cancel use bodyless POST and confirmation invalidates reservation/inventory/delivery reads', async () => {
  const store = setup()
  const calls: Request[] = []
  globalThis.fetch = async (input, init) => { const req = new Request(input, init); calls.push(req); return Response.json({ data: { deliveryId: 'draft', deliveryStatus: 'DISPATCHED' } }) }
  await store.dispatch(api.util.upsertQueryData('getDeliveryCandidates', 'invoice', candidates))
  const invalidated = api.util.selectInvalidatedBy(store.getState(), ['Inventory', 'SalesOrder', 'Delivery'])
  assert.ok(invalidated.some((q) => q.endpointName === 'getDeliveryCandidates'))
  for (const action of ['confirm-issue', 'cancel-draft'] as const) await store.dispatch(api.endpoints.issueDelivery.initiate({ id: 'draft', action })).unwrap()
  for (let i = 0; i < calls.length; i++) { assert.equal(calls[i].method, 'POST'); assert.equal(await calls[i].text(), '') }
  assert.match(calls[0].url, /draft\/confirm-issue$/); assert.match(calls[1].url, /draft\/cancel-draft$/)
})
test('quantity validation uses dispatchable capacity, supports two decimals and max 100 lines', () => {
  const limited = { ...candidates, items: candidates.items.map(line => ({ ...line, dispatchableQty: 2 })) }
  assert.ok(validateDeliveryLines(limited, { line: '3' }))
  assert.equal(validateDeliveryLines(limited, { line: '2' }), '')
  assert.equal(validateDeliveryLines(candidates, { line: '7' }), '')
  assert.equal(validateDeliveryLines(candidates, { line: '0.01' }), '')
  for (const value of ['0', '-1', '7.01', '0.001', 'NaN', '1e1', '10000000000']) assert.ok(validateDeliveryLines(candidates, { line: value }), value)
  const many = { ...candidates, items: Array.from({ length: 101 }, (_, i) => ({ ...candidates.items[0], orderItemId: `line-${i}` })) }
  assert.ok(validateDeliveryLines(many, Object.fromEntries(many.items.map((l) => [l.orderItemId, '1']))))
  assert.equal(canManageDeliveries(['SHOP_OWNER']), true); assert.equal(canManageDeliveries(['ACCOUNTANT']), true)
  assert.equal(canManageDeliveries(['SHIPPER']), false); assert.equal(canManageDeliveries(['ADMIN']), false)
  for (const status of ['FETCH_ERROR', 'TIMEOUT_ERROR', 500, 503, 408]) assert.equal(isUncertainDeliveryError({ status }), true)
  for (const status of [400, 403, 404, 409]) assert.equal(isUncertainDeliveryError({ status }), false)
})

test('draft editing uses PUT with the original identity and source items', async () => {
  const store = setup()
  const body = { deliveryId: 'draft', warehouseCode: 'WH_MAIN' as const, recipientName: 'Recipient', recipientPhone: '0901234567', deliveryAddress: 'Address', scheduledDate: null, codAmount: 50000, note: null, items: [{ orderItemId: 'line', quantity: 2 }] }
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init)
    assert.equal(req.method, 'PUT')
    assert.ok(req.url.endsWith('/fulfillment/deliveries/draft/draft'))
    assert.deepEqual(await req.json(), body)
    return Response.json({ data: { deliveryId: 'draft', deliveryStatus: 'DRAFT' } })
  }
  const result = await store.dispatch(api.endpoints.updateDeliveryDraft.initiate({ id: 'draft', body })).unwrap()
  assert.equal(result.deliveryId, 'draft')
})
