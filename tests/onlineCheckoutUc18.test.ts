import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { usePayOS } from '@payos/payos-checkout'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { onlineCheckoutApi } from '../src/features/sales/api/onlineCheckoutApi.ts'
import { placeOnlineOrderSchema } from '../src/features/sales/schemas/onlineCheckout.schema.ts'

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

test('@payos/payos-checkout SDK exports usePayOS hook', () => {
  assert.equal(typeof usePayOS, 'function')
})

test('placeOnlineOrderSchema accepts BANK_TRANSFER / CASH and rejects CREDIT or missing address', () => {
  const validSaved = placeOnlineOrderSchema.parse({
    addressId: 'addr-001',
    paymentMethod: 'BANK_TRANSFER',
    deliverySchedule: 'Sáng mai',
  })
  assert.equal(validSaved.paymentMethod, 'BANK_TRANSFER')

  const validManual = placeOnlineOrderSchema.parse({
    recipientName: 'Nguyễn Bá Lâm',
    recipientPhone: '0901234567',
    deliveryAddress: '123 Nguyễn Văn Linh, Quận 7, TP.HCM',
    paymentMethod: 'CASH',
  })
  assert.equal(validManual.paymentMethod, 'CASH')

  const creditAttempt = placeOnlineOrderSchema.safeParse({
    addressId: 'addr-001',
    paymentMethod: 'CREDIT',
  })
  assert.equal(creditAttempt.success, false)

  const missingAddress = placeOnlineOrderSchema.safeParse({
    paymentMethod: 'BANK_TRANSFER',
    deliveryAddress: '',
  })
  assert.equal(missingAddress.success, false)
})

test('onlineCheckoutApi normalizes checkout preview, order creation, and PayOS verification endpoints', async () => {
  const requests: Array<{ url: string; method: string; body?: string }> = []

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    const bodyText = req.method !== 'GET' ? await req.clone().text() : undefined
    requests.push({ url: req.url, method: req.method, body: bodyText })

    if (req.url.endsWith('/sales/online-orders/checkout-preview')) {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'Thành công',
          data: {
            cart: {
              customerId: 'cust-018',
              totalItems: 1,
              totalQuantity: 1,
              subtotal: 18500000,
              hasInvalidItems: false,
              items: [
                {
                  cartItemId: 'ci-018',
                  variantId: 'var-018',
                  sku: 'TOTO-NEOREST-01',
                  productName: 'Bồn cầu TOTO',
                  variantName: 'Trắng sứ',
                  unit: 'Bộ',
                  quantity: 1,
                  unitPrice: 18500000,
                  currentSellingPrice: 18500000,
                  lineTotal: 18500000,
                  availableQty: 5,
                  variantStatus: 'ACTIVE',
                  inStock: true,
                  priceChanged: false,
                  updatedAt: '2026-11-14T16:00:00Z',
                },
              ],
            },
            savedAddresses: [
              {
                addressId: 'addr-001',
                customerId: 'cust-018',
                recipientName: 'Nguyễn Bá Lâm',
                phone: '0901234567',
                addressText: '123 Nguyễn Văn Linh, Q.7',
                label: 'Nhà riêng',
                isDefault: true,
              },
            ],
            defaultAddress: {
              addressId: 'addr-001',
              customerId: 'cust-018',
              recipientName: 'Nguyễn Bá Lâm',
              phone: '0901234567',
              addressText: '123 Nguyễn Văn Linh, Q.7',
              label: 'Nhà riêng',
              isDefault: true,
            },
            shippingFee: 0,
            grandTotal: 18500000,
            payosConfigured: true,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const isVerify = req.url.endsWith('/payos/verify')
    return new Response(
      JSON.stringify({
        success: true,
        code: 'SUCCESS',
        message: 'Thành công',
        data: {
          orderId: 'ord-018',
          orderCode: 'SO-20261114-0001',
          customerId: 'cust-018',
          orderChannel: 'ONLINE',
          orderType: 'RETAIL',
          orderStatus: 'PENDING_CONFIRMATION',
          paymentStatus: isVerify ? 'PAID' : 'UNPAID',
          paymentMethod: 'BANK_TRANSFER',
          subtotal: 18500000,
          shippingFee: 0,
          totalAmount: 18500000,
          deliveryAddress: 'Nguyễn Bá Lâm (0901234567) - 123 Nguyễn Văn Linh, Q.7',
          items: [],
          payosPayment: {
            payosOrderCode: 1794679999001,
            paymentLinkId: 'payos-link-018',
            checkoutUrl: 'https://pay.payos.vn/web/payos-link-018',
            qrCode: '00020101...',
            bin: '970448',
            accountNumber: '0030100067695002',
            accountName: 'NGUYEN BA LAM',
            amount: 2000,
            amountPaid: isVerify ? 2000 : 0,
            description: 'AQS SO202611140001',
            status: isVerify ? 'PAID' : 'PENDING',
          },
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const store = createStore()

  const preview = await store.dispatch(onlineCheckoutApi.endpoints.getCheckoutPreview.initiate()).unwrap()
  assert.equal(preview.payosConfigured, true)
  assert.equal(preview.grandTotal, 18500000)
  assert.equal(preview.defaultAddress?.addressId, 'addr-001')

  const created = await store
    .dispatch(
      onlineCheckoutApi.endpoints.placeOnlineOrder.initiate({
        addressId: 'addr-001',
        paymentMethod: 'BANK_TRANSFER',
      }),
    )
    .unwrap()
  assert.equal(created.orderCode, 'SO-20261114-0001')
  assert.equal(created.paymentStatus, 'UNPAID')
  assert.equal(created.payosPayment?.checkoutUrl, 'https://pay.payos.vn/web/payos-link-018')

  const detail = await store
    .dispatch(onlineCheckoutApi.endpoints.getOnlineOrderDetail.initiate('ord-018'))
    .unwrap()
  assert.equal(detail.orderId, 'ord-018')

  const verified = await store
    .dispatch(onlineCheckoutApi.endpoints.verifyPayosPayment.initiate('ord-018'))
    .unwrap()
  assert.equal(verified.paymentStatus, 'PAID')
  assert.equal(verified.payosPayment?.status, 'PAID')
  assert.equal(verified.payosPayment?.amountPaid, 2000)

  const refreshed = await store
    .dispatch(onlineCheckoutApi.endpoints.createOrRefreshPayosPaymentLink.initiate('ord-018'))
    .unwrap()
  assert.equal(refreshed.payosPayment?.paymentLinkId, 'payos-link-018')

  assert.ok(requests.every((r) => !r.url.includes('/v1/v1/')))
  assert.ok(requests.some((r) => r.url.endsWith('/api/v1/sales/online-orders/checkout-preview') && r.method === 'GET'))
  assert.ok(requests.some((r) => r.url.endsWith('/api/v1/sales/online-orders') && r.method === 'POST'))
  assert.ok(requests.some((r) => r.url.endsWith('/api/v1/sales/online-orders/ord-018') && r.method === 'GET'))
  assert.ok(requests.some((r) => r.url.endsWith('/api/v1/sales/online-orders/ord-018/payos/verify') && r.method === 'POST'))
  assert.ok(requests.some((r) => r.url.endsWith('/api/v1/sales/online-orders/ord-018/payos/payment-link') && r.method === 'POST'))
})

