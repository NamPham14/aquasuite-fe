import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { salesOrderApi } from '../src/features/sales/api/salesOrderApi.ts'
import { buildSalesOrderFilterParams } from '../src/features/sales/hooks/useSalesOrderFilters.ts'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function createStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
}

test('buildSalesOrderFilterParams trims keyword, omits empty values, and preserves orderChannel', () => {
  const params = buildSalesOrderFilterParams({
    keyword: '  0987  ',
    orderStatus: 'PENDING_CONFIRMATION',
    paymentStatus: 'PAID',
    orderType: 'RETAIL',
    orderChannel: 'ONLINE',
    fromDate: '',
    toDate: '2026-11-23',
    page: 1,
    size: 10,
  })

  assert.deepEqual(params, {
    keyword: '0987',
    orderStatus: 'PENDING_CONFIRMATION',
    paymentStatus: 'PAID',
    orderType: 'RETAIL',
    orderChannel: 'ONLINE',
    fromDate: undefined,
    toDate: '2026-11-23',
    page: 1,
    size: 10,
    sort: 'createdAt,desc',
  })

  const emptyKeyword = buildSalesOrderFilterParams({
    keyword: '   ',
    fromDate: '',
    toDate: '',
    page: 2,
    size: 10,
  })
  assert.equal(emptyKeyword.keyword, undefined)
})

test('salesOrderApi getSalesOrders forwards keyword, orderChannel, and PENDING_CONFIRMATION query params cleanly', async () => {
  const requests: Array<{ url: string; method: string }> = []

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: req.url, method: req.method })
    return new Response(
      JSON.stringify({
        success: true,
        code: 'SUCCESS',
        message: 'OK',
        data: {
          content: [],
          totalElements: 0,
          number: 0,
          size: 10,
          totalPages: 0,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const store = createStore()
  const filterParams = buildSalesOrderFilterParams({
    keyword: ' 0987 ',
    orderStatus: 'PENDING_CONFIRMATION',
    orderChannel: 'ONLINE',
    fromDate: '',
    toDate: '',
    page: 1,
    size: 10,
  })

  await store.dispatch(salesOrderApi.endpoints.getSalesOrders.initiate(filterParams)).unwrap()

  assert.equal(requests.length, 1)
  const parsedUrl = new URL(requests[0].url)
  assert.equal(parsedUrl.pathname, '/api/v1/sales/orders')
  assert.equal(parsedUrl.searchParams.get('keyword'), '0987')
  assert.equal(parsedUrl.searchParams.get('orderStatus'), 'PENDING_CONFIRMATION')
  assert.equal(parsedUrl.searchParams.get('orderChannel'), 'ONLINE')
  assert.equal(parsedUrl.searchParams.get('page'), '0')
})

test('salesOrderApi UC-22 confirmOnlineOrder, rejectOnlineOrder, and syncOnlineOrderPayosPayment hit exact endpoints', async () => {
  const calls: Array<{ url: string; method: string; body: string }> = []

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    const body = req.method !== 'GET' ? await req.text() : ''
    calls.push({ url: new URL(req.url).pathname, method: req.method, body })
    return new Response(
      JSON.stringify({
        success: true,
        code: 'SUCCESS',
        message: 'OK',
        data: {
          orderId: 'order-online-1',
          orderCode: 'SO-20261125-0001',
          orderStatus: 'PROCESSING',
          paymentStatus: 'PAID',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const store = createStore()

  await store
    .dispatch(
      salesOrderApi.endpoints.confirmOnlineOrder.initiate({
        orderId: 'order-online-1',
        body: {
          deliveryAddress: '123 Lê Lợi, Q.1',
          deliverySchedule: 'Giao sáng mai',
          note: 'Đã gọi xác nhận',
        },
      }),
    )
    .unwrap()

  await store
    .dispatch(
      salesOrderApi.endpoints.rejectOnlineOrder.initiate({
        orderId: 'order-online-1',
        body: { reason: 'Khách yêu cầu hủy đơn' },
      }),
    )
    .unwrap()

  await store
    .dispatch(salesOrderApi.endpoints.syncOnlineOrderPayosPayment.initiate('order-online-1'))
    .unwrap()

  assert.equal(calls.length, 3)
  assert.equal(calls[0].url, '/api/v1/sales/orders/order-online-1/confirm')
  assert.equal(calls[0].method, 'PATCH')
  assert.deepEqual(JSON.parse(calls[0].body), {
    deliveryAddress: '123 Lê Lợi, Q.1',
    deliverySchedule: 'Giao sáng mai',
    note: 'Đã gọi xác nhận',
  })

  assert.equal(calls[1].url, '/api/v1/sales/orders/order-online-1/reject')
  assert.equal(calls[1].method, 'PATCH')
  assert.deepEqual(JSON.parse(calls[1].body), {
    reason: 'Khách yêu cầu hủy đơn',
  })

  assert.equal(calls[2].url, '/api/v1/sales/orders/order-online-1/payos/sync')
  assert.equal(calls[2].method, 'POST')
})


