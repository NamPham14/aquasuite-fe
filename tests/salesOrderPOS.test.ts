import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { salesOrderApi } from '../src/features/sales/api/salesOrderApi.ts'
import {
  createSalesOrderSchema,
  createOrderItemSchema,
  createComboItemSchema,
} from '../src/features/sales/schemas/salesOrder.schema.ts'

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

test('createOrderItemSchema validates SKU items with quantity >= 0.001 and non-negative discount', () => {
  const valid = createOrderItemSchema.parse({
    variantId: 'var-uuid-1',
    quantity: 0.001,
    discountAmount: 0,
  })
  assert.equal(valid.variantId, 'var-uuid-1')
  assert.equal(valid.quantity, 0.001)
  assert.equal(valid.discountAmount, 0)

  // Quantity below 0.001 fails
  assert.equal(
    createOrderItemSchema.safeParse({
      variantId: 'var-1',
      quantity: 0,
    }).success,
    false,
  )

  // Negative discount fails
  assert.equal(
    createOrderItemSchema.safeParse({
      variantId: 'var-1',
      quantity: 1,
      discountAmount: -100,
    }).success,
    false,
  )
})

test('createComboItemSchema validates combo items with quantity >= 1', () => {
  const valid = createComboItemSchema.parse({
    comboId: 'combo-uuid-1',
    quantity: 2,
  })
  assert.equal(valid.comboId, 'combo-uuid-1')
  assert.equal(valid.quantity, 2)
  assert.equal(valid.discountAmount, 0)

  // Quantity 0 fails
  assert.equal(
    createComboItemSchema.safeParse({
      comboId: 'combo-1',
      quantity: 0,
    }).success,
    false,
  )
})

test('createSalesOrderSchema validates POS order structure and business rules', () => {
  // 1. Valid POS cash order with SKU item
  const validOrder = createSalesOrderSchema.parse({
    paymentMethod: 'CASH',
    orderChannel: 'COUNTER',
    fulfillmentMethod: 'IN_STORE_PICKUP',
    items: [{ variantId: 'var-1', quantity: 1 }],
  })
  assert.equal(validOrder.paymentMethod, 'CASH')
  assert.equal(validOrder.orderType, 'RETAIL')
  assert.equal(validOrder.orderChannel, 'COUNTER')
  assert.equal(validOrder.fulfillmentMethod, 'IN_STORE_PICKUP')

  // 2. CARD is strictly prohibited
  assert.equal(
    createSalesOrderSchema.safeParse({
      paymentMethod: 'CARD',
      items: [{ variantId: 'var-1', quantity: 1 }],
    }).success,
    false,
  )

  // 3. Fails if both items and combos are empty
  assert.equal(
    createSalesOrderSchema.safeParse({
      paymentMethod: 'CASH',
      items: [],
      combos: [],
    }).success,
    false,
  )

  // 4. Requires delivery address if fulfillmentMethod is SCHEDULED_DELIVERY
  assert.equal(
    createSalesOrderSchema.safeParse({
      paymentMethod: 'BANK_TRANSFER',
      fulfillmentMethod: 'SCHEDULED_DELIVERY',
      deliveryAddress: '',
      items: [{ variantId: 'var-1', quantity: 1 }],
    }).success,
    false,
  )

  // 5. Valid with delivery address
  assert.equal(
    createSalesOrderSchema.safeParse({
      paymentMethod: 'BANK_TRANSFER',
      fulfillmentMethod: 'SCHEDULED_DELIVERY',
      deliveryAddress: '123 Đường Láng, Hà Nội',
      items: [{ variantId: 'var-1', quantity: 1 }],
    }).success,
    true,
  )
})

test('salesOrderApi createSalesOrder sends correct POST request and body', async () => {
  const store = createStore()
  const requests: { url: string; method: string; body?: unknown }[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    const body = req.method !== 'GET' ? await req.clone().json() : undefined
    requests.push({ url: req.url, method: req.method, body })

    return new Response(
      JSON.stringify({
        data: {
          orderId: 'order-uuid-99',
          orderCode: 'SO-20261107-001',
          orderType: 'RETAIL',
          orderChannel: 'COUNTER',
          orderStatus: 'PROCESSING',
          paymentStatus: 'UNPAID',
          totalAmount: 3200000,
          subtotal: 3200000,
          discountAmount: 0,
          items: [
            {
              orderItemId: 'oi-1',
              orderId: 'order-uuid-99',
              variantId: 'var-1',
              sku: 'LT4706',
              productName: 'Chậu rửa TOTO',
              variantName: 'Trắng',
              quantity: 1,
              unitPrice: 3200000,
              discountAmount: 0,
              lineTotal: 3200000,
            },
          ],
          milestones: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  const payload = {
    paymentMethod: 'CASH' as const,
    orderType: 'RETAIL' as const,
    orderChannel: 'COUNTER' as const,
    fulfillmentMethod: 'IN_STORE_PICKUP' as const,
    items: [{ variantId: 'var-1', quantity: 1 }],
  }

  const result = await store.dispatch(salesOrderApi.endpoints.createSalesOrder.initiate(payload)).unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/sales\/orders$/)
  assert.equal(requests[0].method, 'POST')
  assert.equal((requests[0].body as any).paymentMethod, 'CASH')
  assert.equal((requests[0].body as any).orderChannel, 'COUNTER')
  assert.equal(result.orderId, 'order-uuid-99')
  assert.equal(result.orderCode, 'SO-20261107-001')
  assert.equal(result.orderStatus, 'PROCESSING')
  assert.equal(result.paymentStatus, 'UNPAID')
})

test('salesOrderApi integrates Hào Credit Control (checkCustomerCredit)', async () => {
  const store = createStore()
  const requests: { url: string; method: string; body?: unknown }[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    const body = req.method !== 'GET' ? await req.clone().json() : undefined
    requests.push({ url: req.url, method: req.method, body })

    return new Response(
      JSON.stringify({
        data: {
          customerId: 'cust-1',
          approved: true,
          overrideAllowed: true,
          debtStatus: 'NORMAL',
          creditLimit: 50000000,
          outstandingBalance: 10000000,
          overdueBalance: 0,
          availableCredit: 40000000,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  const result = await store
    .dispatch(
      salesOrderApi.endpoints.checkCustomerCredit.initiate({
        customerId: 'cust-1',
        body: { orderChannel: 'COUNTER', newOrderAmount: 15000000 },
      }),
    )
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/finance\/customer-debts\/cust-1\/credit-check$/)
  assert.equal(requests[0].method, 'POST')
  assert.equal((requests[0].body as any).newOrderAmount, 15000000)
  assert.equal(result.approved, true)
  assert.equal(result.availableCredit, 40000000)
})

test('salesOrderApi integrates Nam Finance Payment Summary', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: req.url, method: req.method })

    return new Response(
      JSON.stringify({
        data: {
          orderId: 'order-1',
          totalAmount: 20000000,
          verifiedPaid: 5000000,
          pendingAmount: 0,
          remaining: 15000000,
          paymentStatus: 'PARTIALLY_PAID',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }) as typeof fetch

  const result = await store
    .dispatch(salesOrderApi.endpoints.getOrderPaymentSummary.initiate('order-1'))
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/finance\/orders\/order-1\/payment-summary$/)
  assert.equal(result.totalAmount, 20000000)
  assert.equal(result.verifiedPaid, 5000000)
  assert.equal(result.remaining, 15000000)
  assert.equal(result.paymentStatus, 'PARTIALLY_PAID')
})
