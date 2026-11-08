import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { reservationApi } from '../src/features/sales/api/reservationApi.ts'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

test('UC29 uses real order pagination, payment summary and reservation commands with read-only Finance receipts without demo fields', async () => {
  const requests: { path: string; method: string; body: unknown }[] = []
  const payment = { orderId: 'order-1', totalAmount: 100000000, depositRequired: 30000000, verifiedPaid: 20000000, pendingAmount: 10000000, remaining: 80000000, depositSatisfied: false }
  const view = { orderId: 'order-1', reservationRequested: true, payment, lines: [{ orderItemId: 'item-1', quantity: 10 }], lineStatuses: [], warehouseCode: 'WH_MAIN', status: 'AWAITING_DEPOSIT' }
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const url = new URL(request.url)
    requests.push({ path: url.pathname + url.search, method: request.method, body: request.method === 'POST' && !url.pathname.endsWith('/retry') ? await request.json() : undefined })
    const data = url.pathname.endsWith('/sales/orders') ? { content: [{ orderId: 'order-1', orderCode: 'DH01', payment, depositStatus: 'AWAITING_DEPOSIT' }], totalPages: 3, totalElements: 41 }
      : url.pathname.endsWith('/payments') ? (request.method === 'GET' ? [] : { transactionId: 'pay-1', status: 'PENDING' }) : view
    return new Response(JSON.stringify({ success: true, data }), { headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  const store = configureStore({ reducer: { [baseApi.reducerPath]: baseApi.reducer }, middleware: (defaults) => defaults().concat(baseApi.middleware) })
  try {
    const page = await store.dispatch(reservationApi.endpoints.reservationOrders.initiate({ page: 1, keyword: 'DH01' })).unwrap()
    assert.equal(page.totalPages, 3)
    assert.equal(page.content[0].orderId, 'order-1')
    assert.deepEqual(page.content[0].payment, payment)
    assert.equal(page.content[0].depositStatus, 'AWAITING_DEPOSIT')
    assert.equal(page.totalElements, 41)
    await store.dispatch(reservationApi.endpoints.reservationOrder.initiate('order-1')).unwrap()
    const result = await store.dispatch(reservationApi.endpoints.reservation.initiate('order-1')).unwrap()
    assert.deepEqual(result.payment, payment)
    await store.dispatch(reservationApi.endpoints.reservationReceipts.initiate('order-1')).unwrap()
    const body = { requestId: 'request-1', warehouseCode: 'WH_MAIN', lines: [{ orderItemId: 'item-1', quantity: 10 }] }
    await store.dispatch(reservationApi.endpoints.submitReservation.initiate({ orderId: 'order-1', action: 'requests', body })).unwrap()
    await store.dispatch(reservationApi.endpoints.submitReservation.initiate({ orderId: 'order-1', action: 'synchronize', body: { ...body, requestId: 'request-2' } })).unwrap()
    await store.dispatch(reservationApi.endpoints.retryReservation.initiate({ orderId: 'order-1', allocationId: 'allocation-1' })).unwrap()
    assert.deepEqual(requests.map(({ path, method }) => `${method} ${path}`), [
      'GET /api/v1/sales/orders?page=1&keyword=DH01&size=20&depositReservationOnly=true',
      'GET /api/v1/sales/orders/order-1',
      'GET /api/v1/sales/orders/order-1/stock-reservations',
      'GET /api/v1/finance/orders/order-1/payments',
      'POST /api/v1/sales/orders/order-1/stock-reservations/requests',
      'POST /api/v1/sales/orders/order-1/stock-reservations/synchronize',
      'POST /api/v1/sales/orders/order-1/stock-reservations/allocations/allocation-1/retry',
    ])
    assert.deepEqual(requests[4].body, body)
    assert.equal('recordReservationReceipt' in reservationApi.endpoints, false)
  } finally { store.dispatch(baseApi.util.resetApiState()) }
})
