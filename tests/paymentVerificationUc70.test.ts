import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { paymentVerificationApi } from '../src/features/finance/api/paymentVerificationApi.ts'

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

function mockJson(payload: unknown, requests: { url: string; method: string; body?: unknown }[]) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    let body: unknown
    if (req.method !== 'GET') {
      const raw = await req.clone().text()
      body = raw ? JSON.parse(raw) : undefined
    }
    requests.push({ url: req.url, method: req.method, body })
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
}

test('getPaymentVerifications gọi GET đúng URL, truyền page/size và bóc tách trang', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    {
      data: {
        content: [
          { transactionId: 't1', transactionCode: 'PAY-1', orderId: 'o1', amount: 7000000, paymentMethod: 'BANK_TRANSFER', status: 'PENDING', transactionDate: new Date().toISOString() },
        ],
        page: 0, size: 20, totalElements: 1, totalPages: 1,
      },
    },
    requests as any,
  )

  const result = await store
    .dispatch(paymentVerificationApi.endpoints.getPaymentVerifications.initiate({ page: 0, size: 20 }))
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/finance\/payment-verifications\?/)
  assert.match(requests[0].url, /page=0/)
  assert.match(requests[0].url, /size=20/)
  assert.equal(result.content.length, 1)
  assert.equal(result.content[0].status, 'PENDING')
  assert.equal(result.totalElements, 1)
})

test('verifyPayment gửi POST đúng URL verify', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    { data: { transactionId: 't1', transactionCode: 'PAY-1', orderId: 'o1', amount: 7000000, paymentMethod: 'BANK_TRANSFER', status: 'VERIFIED', transactionDate: new Date().toISOString() } },
    requests as any,
  )

  const result = await store
    .dispatch(paymentVerificationApi.endpoints.verifyPayment.initiate({ paymentId: 't1', orderId: 'o1' }))
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/finance\/payment-verifications\/t1\/verify$/)
  assert.equal(requests[0].method, 'POST')
  assert.equal(result.status, 'VERIFIED')
})

test('rejectPayment gửi POST đúng URL reject kèm lý do bắt buộc', async () => {
  const store = createStore()
  const requests: { url: string; method: string; body?: unknown }[] = []
  mockJson(
    { data: { transactionId: 't1', transactionCode: 'PAY-1', orderId: 'o1', amount: 7000000, paymentMethod: 'BANK_TRANSFER', status: 'REJECTED', rejectReason: 'Không thấy tiền', transactionDate: new Date().toISOString() } },
    requests,
  )

  const result = await store
    .dispatch(paymentVerificationApi.endpoints.rejectPayment.initiate({ paymentId: 't1', orderId: 'o1', reason: 'Không thấy tiền' }))
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/finance\/payment-verifications\/t1\/reject$/)
  assert.equal(requests[0].method, 'POST')
  assert.equal((requests[0].body as any).reason, 'Không thấy tiền')
  assert.equal(result.status, 'REJECTED')
  assert.equal(result.rejectReason, 'Không thấy tiền')
})
