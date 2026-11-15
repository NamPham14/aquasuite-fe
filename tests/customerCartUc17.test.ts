import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { cartApi } from '../src/features/sales/api/cartApi.ts'
import {
  addCartItemSchema,
  updateCartItemQuantitySchema,
} from '../src/features/sales/schemas/cart.schema.ts'

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

test('addCartItemSchema and updateCartItemQuantitySchema validate positive integer quantities', () => {
  const validAdd = addCartItemSchema.parse({
    variantId: 'e1111111-1111-1111-1111-111111111111',
    quantity: 3,
  })
  assert.equal(validAdd.variantId, 'e1111111-1111-1111-1111-111111111111')
  assert.equal(validAdd.quantity, 3)

  assert.equal(
    addCartItemSchema.safeParse({
      variantId: '',
      quantity: 1,
    }).success,
    false,
  )

  assert.equal(
    addCartItemSchema.safeParse({
      variantId: 'var-1',
      quantity: 0,
    }).success,
    false,
  )

  const validUpdate = updateCartItemQuantitySchema.parse({ quantity: 5 })
  assert.equal(validUpdate.quantity, 5)

  assert.equal(updateCartItemQuantitySchema.safeParse({ quantity: -1 }).success, false)
})

test('cartApi endpoints normalize ApiResponse<CartResponse> and call correct REST paths', async () => {
  const requests: Array<{ url: string; method: string; body?: string }> = []

  const mockCartPayload = {
    success: true,
    code: 'SUCCESS',
    message: 'Thành công',
    data: {
      customerId: 'cust-001',
      totalItems: 1,
      totalQuantity: 2,
      subtotal: 5000000,
      hasInvalidItems: false,
      items: [
        {
          cartItemId: 'ci-001',
          variantId: 'var-001',
          productId: 'prod-001',
          sku: 'SEN-TOTO-01',
          productName: 'Sen cây TOTO',
          variantName: 'Mạ Crom',
          unit: 'Bộ',
          quantity: 2,
          unitPrice: 2500000,
          currentSellingPrice: 2500000,
          lineTotal: 5000000,
          availableQty: 10,
          variantStatus: 'ACTIVE',
          inStock: true,
          priceChanged: false,
          updatedAt: '2026-11-14T14:00:00Z',
        },
      ],
    },
  }

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    const bodyText = req.method !== 'GET' && req.method !== 'DELETE' ? await req.clone().text() : undefined
    requests.push({ url: req.url, method: req.method, body: bodyText })
    return new Response(JSON.stringify(mockCartPayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const store = createStore()

  // 1. GET /sales/cart
  const getRes = await store.dispatch(cartApi.endpoints.getCart.initiate()).unwrap()
  assert.equal(getRes.customerId, 'cust-001')
  assert.equal(getRes.totalItems, 1)
  assert.equal(getRes.subtotal, 5000000)
  assert.equal(getRes.items[0].sku, 'SEN-TOTO-01')

  // 2. POST /sales/cart/items
  await store
    .dispatch(
      cartApi.endpoints.addCartItem.initiate({
        variantId: 'var-001',
        quantity: 2,
      }),
    )
    .unwrap()

  // 3. PUT /sales/cart/items/{id}
  await store
    .dispatch(
      cartApi.endpoints.updateCartItemQuantity.initiate({
        cartItemId: 'ci-001',
        data: { quantity: 4 },
      }),
    )
    .unwrap()

  // 4. DELETE /sales/cart/items/{id}
  await store.dispatch(cartApi.endpoints.removeCartItem.initiate('ci-001')).unwrap()

  // 5. DELETE /sales/cart
  await store.dispatch(cartApi.endpoints.clearCart.initiate()).unwrap()

  assert.ok(requests.some((r) => r.url.endsWith('/sales/cart') && r.method === 'GET'))
  assert.ok(requests.some((r) => r.url.endsWith('/sales/cart/items') && r.method === 'POST'))
  assert.ok(requests.some((r) => r.url.endsWith('/sales/cart/items/ci-001') && r.method === 'PUT'))
  assert.ok(requests.some((r) => r.url.endsWith('/sales/cart/items/ci-001') && r.method === 'DELETE'))
  assert.ok(requests.some((r) => r.url.endsWith('/sales/cart') && r.method === 'DELETE'))
})

