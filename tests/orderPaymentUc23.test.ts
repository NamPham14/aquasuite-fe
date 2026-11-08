import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { orderPaymentApi } from '../src/features/finance/api/orderPaymentApi.ts'
import { formatVnd, formatDateTime } from '../src/shared/lib/money.ts'

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

// Bắt các request fetch và trả về body JSON cố định cho test contract.
function mockJson(payload: unknown, requests: { url: string; method: string; body?: unknown }[]) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    const body = req.method !== 'GET' ? await req.clone().json() : undefined
    requests.push({ url: req.url, method: req.method, body })
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch
}

test('formatVnd nhóm hàng nghìn và xử lý giá trị rỗng', () => {
  assert.equal(formatVnd(30000000).replace(/\s/g, ' ').includes('30.000.000'), true)
  assert.equal(formatVnd(0).includes('0'), true)
  // null/undefined/NaN coi là 0, không ném lỗi
  assert.equal(formatVnd(undefined).includes('0'), true)
  assert.equal(formatVnd(null).includes('0'), true)
  assert.equal(formatVnd(Number.NaN).includes('0'), true)
})

test('formatDateTime trả "-" cho giá trị rỗng và không ném lỗi với chuỗi sai', () => {
  assert.equal(formatDateTime(undefined), '-')
  assert.equal(formatDateTime(''), '-')
  assert.equal(formatDateTime('not-a-date'), 'not-a-date')
})

test('recordOrderPayment gửi POST đúng URL/body và bóc tách data', async () => {
  const store = createStore()
  const requests: { url: string; method: string; body?: unknown }[] = []
  mockJson(
    {
      data: {
        transactionId: 'txn-1',
        transactionCode: 'PAY-1',
        orderId: 'order-1',
        amount: 40000000,
        paymentMethod: 'CASH',
        status: 'VERIFIED',
        transactionDate: new Date().toISOString(),
      },
    },
    requests,
  )

  const result = await store
    .dispatch(
      orderPaymentApi.endpoints.recordOrderPayment.initiate({
        orderId: 'order-1',
        body: { idempotencyKey: 'key-1', amount: 40000000, paymentMethod: 'CASH' },
      }),
    )
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/finance\/orders\/order-1\/payments$/)
  assert.equal(requests[0].method, 'POST')
  assert.equal((requests[0].body as any).idempotencyKey, 'key-1')
  assert.equal((requests[0].body as any).amount, 40000000)
  assert.equal((requests[0].body as any).paymentMethod, 'CASH')
  assert.equal(result.status, 'VERIFIED')
  assert.equal(result.transactionId, 'txn-1')
})

test('getOrderMilestoneProgress gọi GET đúng URL và map đủ các mốc', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    {
      data: {
        orderId: 'order-1',
        totalAmount: 100000000,
        verifiedPaid: 40000000,
        pendingAmount: 0,
        remaining: 60000000,
        hasMilestones: true,
        milestones: [
          { milestoneId: 'm1', stageName: 'Đặt cọc', sortOrder: 1, agreedAmount: 30000000, paidAmount: 30000000, remainingAmount: 0 },
          { milestoneId: 'm2', stageName: 'Đợt 1', sortOrder: 2, agreedAmount: 40000000, paidAmount: 10000000, remainingAmount: 30000000 },
          { milestoneId: 'm3', stageName: 'Đợt 2', sortOrder: 3, agreedAmount: 30000000, paidAmount: 0, remainingAmount: 30000000 },
        ],
      },
    },
    requests as any,
  )

  const result = await store
    .dispatch(orderPaymentApi.endpoints.getOrderMilestoneProgress.initiate('order-1'))
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/finance\/orders\/order-1\/payment-milestones$/)
  assert.equal(result.hasMilestones, true)
  assert.equal(result.milestones.length, 3)
  // Phân bổ tuần tự: mốc 1 hết, mốc 2 trả 10 còn 30, mốc 3 còn 30
  assert.equal(result.milestones[0].remainingAmount, 0)
  assert.equal(result.milestones[1].paidAmount, 10000000)
  assert.equal(result.milestones[1].remainingAmount, 30000000)
  assert.equal(result.remaining, 60000000)
})

test('getOrderPayments gọi GET đúng URL và trả mảng lịch sử', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    {
      data: [
        { transactionId: 't1', transactionCode: 'PAY-1', orderId: 'order-1', amount: 5000000, paymentMethod: 'CASH', status: 'VERIFIED', transactionDate: new Date().toISOString() },
        { transactionId: 't2', transactionCode: 'PAY-2', orderId: 'order-1', amount: 2000000, paymentMethod: 'BANK_TRANSFER', status: 'PENDING', transactionDate: new Date().toISOString() },
      ],
    },
    requests as any,
  )

  const result = await store
    .dispatch(orderPaymentApi.endpoints.getOrderPayments.initiate('order-1'))
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/finance\/orders\/order-1\/payments$/)
  assert.equal(result.length, 2)
  assert.equal(result[1].status, 'PENDING')
})
