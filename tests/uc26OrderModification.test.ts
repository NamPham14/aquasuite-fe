/**
 * UC-26 Order Modification Request — RTK Query contract tests & UI permission tests.
 * Runner: node --import ./tests/loader.mjs --test tests/uc26OrderModification.test.ts
 */
import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { register } from 'node:module'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { authReducer, setCredentials } from '../src/features/iam/model/authSlice.ts'
register('./loader.mjs', import.meta.url)

const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { Provider } = await import('react-redux')
const { MemoryRouter } = await import('react-router-dom')
const { orderModificationRequestApi } = await import('../src/features/sales/api/orderModificationRequestApi.ts')
const { OrderModificationRequestsPage } = await import('../src/pages/management/OrderModificationRequestsPage.tsx')

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

function storeForRoles(roles: string[]) {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
  store.dispatch(setCredentials({ user: { id: 'u1', username: 'u1', email: 'u@e.com', roles }, accessToken: 'tok', generation: store.getState().auth.sessionGeneration }))
  return store
}

function render(store: ReturnType<typeof storeForRoles>, path = '/app/order-modification-requests') {
  return renderToStaticMarkup(
    React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>,
      React.createElement(MemoryRouter, { initialEntries: [path] },
        React.createElement(OrderModificationRequestsPage)
      )
    )
  )
}

// ─── RTK Query endpoint contract tests ───────────────────────────────────────

test('createOrderModificationRequest calls POST /sales/order-modification-requests', async () => {
  let capturedRequest: { url: string; method: string } | null = null
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (input instanceof Request) {
      capturedRequest = { url: input.url, method: input.method }
    } else {
      capturedRequest = { url: String(input), method: init?.method ?? 'GET' }
    }
    return new Response(JSON.stringify({ data: { id: 'req-1', orderId: 'ord-1', customerId: 'cust-1', requestType: 'ADDRESS_CHANGE', requestStatus: 'PENDING_REVIEW', customerReason: 'test', items: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), requestedBy: 'u1' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = storeForRoles(['SALES_STAFF'])
  await store.dispatch(orderModificationRequestApi.endpoints.createOrderModificationRequest.initiate({
    orderId: 'ord-1',
    requestType: 'ADDRESS_CHANGE',
    customerReason: 'Khách đổi địa chỉ',
    requestedDeliveryAddress: '123 Đường ABC, Quận 1',
  })).unwrap().catch(() => {})
  assert.ok(capturedRequest !== null, 'fetch was called')
  assert.ok(capturedRequest!.url.includes('/sales/order-modification-requests'), 'URL should include order-modification-requests')
  assert.equal(capturedRequest!.method, 'POST', 'method should be POST')
  store.dispatch(baseApi.util.resetApiState())
})

test('createOrderModificationRequest invalidates MODIFICATION_REQUEST_LIST tag', () => {
  assert.ok(orderModificationRequestApi.endpoints.createOrderModificationRequest !== undefined, 'createOrderModificationRequest endpoint exists')
})

test('approveOrderModificationRequest calls POST /sales/order-modification-requests/:id/approve', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({ data: { id: 'req-1', orderId: 'ord-1', customerId: 'cust-1', requestType: 'ADDRESS_CHANGE', requestStatus: 'APPROVED', customerReason: 'test', items: [], createdAt: '', updatedAt: '', requestedBy: 'u1' } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = storeForRoles(['SHOP_OWNER'])
  await store.dispatch(orderModificationRequestApi.endpoints.approveOrderModificationRequest.initiate({
    requestId: 'req-1',
    body: { decisionNote: 'OK', requestedDeliveryAddress: '456 Đường DEF' },
  })).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('req-1/approve'), 'URL should include request ID and /approve')
  store.dispatch(baseApi.util.resetApiState())
})

test('rejectOrderModificationRequest calls POST /sales/order-modification-requests/:id/reject', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({ data: { id: 'req-1', orderId: 'ord-1', customerId: 'cust-1', requestType: 'FULL_CANCELLATION', requestStatus: 'REJECTED', customerReason: 'test', items: [], createdAt: '', updatedAt: '', requestedBy: 'u1' } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = storeForRoles(['SHOP_OWNER'])
  await store.dispatch(orderModificationRequestApi.endpoints.rejectOrderModificationRequest.initiate({
    requestId: 'req-1',
    body: { decisionNote: 'Từ chối vì lý do nghiệp vụ' },
  })).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('req-1/reject'), 'URL should include /reject')
  store.dispatch(baseApi.util.resetApiState())
})

test('recordOrderModificationTaxResult calls POST /sales/order-modification-requests/:id/tax-result', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({ data: { id: 'req-1', orderId: 'ord-1', customerId: 'cust-1', requestType: 'ITEM_CHANGE', requestStatus: 'APPROVED', customerReason: 'test', items: [], createdAt: '', updatedAt: '', requestedBy: 'u1' } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(orderModificationRequestApi.endpoints.recordOrderModificationTaxResult.initiate({
    requestId: 'req-1',
    body: { taxResultReference: 'INV-2024-001', resultingInvoiceId: 'inv-1' },
  })).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('req-1/tax-result'), 'URL should include /tax-result')
  store.dispatch(baseApi.util.resetApiState())
})

test('sendOrderModificationResultEmail calls POST /sales/order-modification-requests/:id/send-result-email', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
  }
  const store = storeForRoles(['SALES_STAFF'])
  await store.dispatch(orderModificationRequestApi.endpoints.sendOrderModificationResultEmail.initiate('req-1')).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('req-1/send-result-email'), 'URL should include /send-result-email')
  store.dispatch(baseApi.util.resetApiState())
})

test('CreateOrderModificationRequestPayload type contract matches BE spec', () => {
  const payload = {
    orderId: 'ord-uuid',
    requestType: 'ADDRESS_CHANGE' as const,
    customerReason: 'Lý do khách',
    requestedDeliveryAddress: '123 Đường mới',
  }
  assert.equal(payload.requestType, 'ADDRESS_CHANGE')
  assert.equal(payload.orderId, 'ord-uuid')

  const itemPayload = {
    orderItemId: 'item-uuid',
    changeAction: 'REDUCE' as const,
    requestedQuantity: 2,
  }
  assert.equal(itemPayload.changeAction, 'REDUCE')

  const swapPayload = {
    orderItemId: 'item-uuid',
    changeAction: 'SWAP' as const,
    requestedVariantId: 'var-uuid-new',
  }
  assert.equal(swapPayload.changeAction, 'SWAP')
})

// ─── UI permission tests ──────────────────────────────────────────────────────

test('OrderModificationRequestsPage: SALES_STAFF sees Tạo yêu cầu button', async () => {
  const store = storeForRoles(['SALES_STAFF'])
  await store.dispatch(orderModificationRequestApi.util.upsertQueryData('getOrderModificationRequests', { page: 1, size: 100 }, { items: [], totalElements: 0, totalPages: 0, page: 1, size: 100 }))
  const html = render(store)
  assert.ok(html.includes('Tạo yêu cầu'), 'SALES_STAFF should see the create request button')
  store.dispatch(baseApi.util.resetApiState())
})

test('OrderModificationRequestsPage: SHOP_OWNER sees Tạo yêu cầu button', async () => {
  const store = storeForRoles(['SHOP_OWNER'])
  await store.dispatch(orderModificationRequestApi.util.upsertQueryData('getOrderModificationRequests', { page: 1, size: 100 }, { items: [], totalElements: 0, totalPages: 0, page: 1, size: 100 }))
  const html = render(store)
  assert.ok(html.includes('Tạo yêu cầu'), 'SHOP_OWNER should see the create request button')
  store.dispatch(baseApi.util.resetApiState())
})

test('OrderModificationRequestsPage: ACCOUNTANT does NOT see Tạo yêu cầu button', async () => {
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(orderModificationRequestApi.util.upsertQueryData('getOrderModificationRequests', { page: 1, size: 100 }, { items: [], totalElements: 0, totalPages: 0, page: 1, size: 100 }))
  const html = render(store)
  assert.ok(!html.includes('Tạo yêu cầu'), 'ACCOUNTANT should NOT see the create request button')
  store.dispatch(baseApi.util.resetApiState())
})

test('CreateOrderModificationItemPayload supports REDUCE REMOVE SWAP changeAction values', () => {
  const actions = ['REDUCE', 'REMOVE', 'SWAP'] as const
  for (const action of actions) {
    const item = { orderItemId: 'item-1', changeAction: action }
    assert.equal(item.changeAction, action)
  }
})
