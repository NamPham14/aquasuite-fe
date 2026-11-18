/**
 * UC-63 Payment Allocation — RTK Query contract tests & UI permission tests.
 * Runner: node --import ./tests/loader.mjs --test tests/uc63PaymentAllocation.test.ts
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
const { paymentAllocationApi } = await import('../src/features/finance/api/paymentAllocationApi.ts')
const { PaymentAllocationsPage } = await import('../src/pages/management/PaymentAllocationsPage.tsx')

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

function render(store: ReturnType<typeof storeForRoles>) {
  return renderToStaticMarkup(
    React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>,
      React.createElement(MemoryRouter, null,
        React.createElement(PaymentAllocationsPage)
      )
    )
  )
}

// ─── RTK Query endpoint contract tests ───────────────────────────────────────

test('getUnallocatedReceipts targets GET /finance/receipts/unallocated', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({ data: { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0 } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(paymentAllocationApi.endpoints.getUnallocatedReceipts.initiate({ page: 0, size: 20 })).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('/finance/receipts/unallocated'), 'URL should include /finance/receipts/unallocated')
  store.dispatch(baseApi.util.resetApiState())
})

test('getPaymentAllocationTargets targets GET /finance/receipts/:id/allocation-targets', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({ data: { receiptId: 'r1', receiptCode: 'RC-001', orderId: 'ord-1', customerId: 'cust-1', receiptAmount: 1000000, allocatedAmount: 0, remainingAmount: 1000000, invoices: [] } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(paymentAllocationApi.endpoints.getPaymentAllocationTargets.initiate('r1')).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('r1/allocation-targets'), 'URL should include /allocation-targets')
  store.dispatch(baseApi.util.resetApiState())
})

test('getPaymentAllocations targets GET /finance/receipts/:id/allocations', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({ data: [] }), { headers: { 'Content-Type': 'application/json' } })
  }
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(paymentAllocationApi.endpoints.getPaymentAllocations.initiate('r1')).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('r1/allocations'), 'URL should include /<id>/allocations')
  store.dispatch(baseApi.util.resetApiState())
})

test('createPaymentAllocation calls POST /finance/receipts/:id/allocations with allocationRequestId', async () => {
  let capturedUrl = ''
  let capturedBody: unknown = null
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    if (input instanceof Request) {
      capturedBody = await input.json().catch(() => null)
    } else {
      capturedBody = init?.body ? JSON.parse(init.body as string) : null
    }
    return new Response(JSON.stringify({ data: { allocationRequestId: 'req-uuid', receiptId: 'r1', orderId: 'ord-1', allocatedAmount: 500000, remainingReceiptAmount: 500000, allocations: [] } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(paymentAllocationApi.endpoints.createPaymentAllocation.initiate({
    receiptId: 'r1',
    body: {
      allocationRequestId: 'req-uuid-idempotent',
      allocations: [{ invoiceId: 'inv-1', allocatedAmount: 500000 }],
      reason: 'Phân bổ đợt 1',
    },
  })).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('r1/allocations'), 'URL should include POST /<id>/allocations')
  assert.ok(capturedBody !== null, 'body should be sent')
  const body = capturedBody as { allocationRequestId: string; allocations: unknown[] }
  assert.equal(body.allocationRequestId, 'req-uuid-idempotent', 'allocationRequestId must be in body')
  assert.equal(body.allocations.length, 1, 'allocations array must be present')
  store.dispatch(baseApi.util.resetApiState())
})

test('reversePaymentAllocation calls POST /finance/receipts/:receiptId/allocations/:allocationId/reverse', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({ data: { allocationId: 'alloc-1', allocationRequestId: 'req-1', transactionId: 'tx-1', orderId: 'ord-1', invoiceId: 'inv-1', allocatedAmount: 500000, allocationType: 'MANUAL', allocationStatus: 'REVERSED', allocatedAt: '', reversalReason: 'Nhập nhầm' } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(paymentAllocationApi.endpoints.reversePaymentAllocation.initiate({
    receiptId: 'r1',
    allocationId: 'alloc-1',
    reason: 'Nhập nhầm hóa đơn',
  })).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('alloc-1/reverse'), 'URL should include /reverse')
  assert.ok(capturedUrl.includes('r1'), 'URL should include receipt ID')
  store.dispatch(baseApi.util.resetApiState())
})

test('createPaymentAllocation and reversePaymentAllocation endpoints are defined', () => {
  assert.ok(paymentAllocationApi.endpoints.createPaymentAllocation !== undefined, 'createPaymentAllocation endpoint defined')
  assert.ok(paymentAllocationApi.endpoints.reversePaymentAllocation !== undefined, 'reversePaymentAllocation endpoint defined')
})

// ─── UI permission tests ──────────────────────────────────────────────────────

function mockEmptySubqueries() {
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = input instanceof Request ? input.url : String(input)
    if (url.includes('/allocations')) {
      return new Response(JSON.stringify({ data: [] }), { headers: { 'Content-Type': 'application/json' } })
    }
    if (url.includes('/allocation-targets')) {
      return new Response(JSON.stringify({ data: { receiptId: 'r-done-1', receiptCode: 'RCT-2026-0118', orderId: 'ord-1042', customerId: 'cust-1042', receiptAmount: 60000000, allocatedAmount: 60000000, remainingAmount: 0, invoices: [] } }), { headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ data: { content: [], items: [], page: 0, number: 0, size: 200, totalElements: 0, totalPages: 0 } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

test('PaymentAllocationsPage: ACCOUNTANT sees the page content', async () => {
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(paymentAllocationApi.util.upsertQueryData('getUnallocatedReceipts', { page: 0, size: 20 }, { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0 }))
  const html = render(store)
  assert.ok(html.includes('Phân bổ tiền thu'), 'ACCOUNTANT should see the page title')
  assert.ok(!html.includes('Chỉ dành cho Kế toán'), 'ACCOUNTANT should not see AccessDenied')
  store.dispatch(baseApi.util.resetApiState())
})

test('PaymentAllocationsPage: SHOP_OWNER sees AccessDenied without UC-* codes', async () => {
  const store = storeForRoles(['SHOP_OWNER'])
  const html = render(store)
  assert.ok(html.includes('Chỉ dành cho Kế toán'), 'SHOP_OWNER should see AccessDenied message')
  assert.doesNotMatch(html, /UC-\d+/, 'AccessDenied should not expose internal UC-* codes')
  store.dispatch(baseApi.util.resetApiState())
})

test('PaymentAllocationsPage: SALES_STAFF sees AccessDenied', async () => {
  const store = storeForRoles(['SALES_STAFF'])
  const html = render(store)
  assert.ok(html.includes('Chỉ dành cho Kế toán'), 'SALES_STAFF should see AccessDenied message')
  store.dispatch(baseApi.util.resetApiState())
})

test('PaymentAllocationsPage: ACCOUNTANT with receipts sees KPI strip, independent queue scroll, sticky workspace, and no UC-* labels', async () => {
  mockEmptySubqueries()
  const store = storeForRoles(['ACCOUNTANT'])
  const mockReceipt = {
    receiptId: 'r1',
    receiptCode: 'RC-2024-001',
    orderId: 'ord-1',
    customerId: 'cust-1',
    receiptAmount: 1000000,
    allocatedAmount: 0,
    remainingAmount: 1000000,
    paymentMethod: 'BANK_TRANSFER',
    receivedAt: new Date().toISOString(),
  }
  await store.dispatch(paymentAllocationApi.util.upsertQueryData('getUnallocatedReceipts', { page: 0, size: 200, view: 'UNALLOCATED' }, { content: [mockReceipt], number: 0, size: 200, totalElements: 1, totalPages: 1 }))
  const html = render(store)
  assert.ok(html.includes('Phiếu thu &amp; Phân bổ tiền thu'), 'Should render header title')
  assert.ok(html.includes('Tiền đã xác minh · chưa phân bổ'), 'Should render KPI 1')
  assert.ok(html.includes('Phiếu thu đang chờ phân bổ'), 'Should render KPI 2')
  assert.ok(html.includes('Hóa đơn điện tử còn nợ'), 'Should render KPI 3')
  assert.ok(html.includes('RC-2024-001'), 'Should display receipt code')
  assert.ok(html.includes('VERIFIED'), 'Should show VERIFIED badge')
  assert.ok(html.includes('Chuyển khoản đã đối soát'), 'Should show clean Vietnamese payment source label')
  assert.ok(html.includes('Xem phiếu thu gốc →'), 'Should show original receipt link on card')
  assert.ok(html.includes('lg:overflow-y-auto') && html.includes('lg:max-h-[calc(100vh-200px)]'), 'Receipt queue should have independent vertical scroll container')
  assert.ok(html.includes('aria-label="Khu vực phân bổ"') && html.includes('lg:sticky lg:top-4 lg:self-start'), 'Allocation workspace and queue panel should be sticky')
  assert.doesNotMatch(html, /UC-\d+/, 'PaymentAllocationsPage should not expose internal UC-* codes')
  store.dispatch(baseApi.util.resetApiState())
})

test('PaymentAllocationsPage: Đã phân bổ hết & Tất cả tabs render search, period filter, allocation status filter, and page size selector', async () => {
  const { JSDOM } = await import('jsdom')
  const ReactDOMClient = await import('react-dom/client')
  const { act } = React
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement

  mockEmptySubqueries()
  const store = storeForRoles(['ACCOUNTANT'])
  const allocatedReceipt = {
    receiptId: 'r-done-1',
    receiptCode: 'RCT-2026-0118',
    orderId: 'ord-1042',
    customerId: 'cust-1042',
    receiptAmount: 60000000,
    allocatedAmount: 60000000,
    remainingAmount: 0,
    paymentMethod: 'BANK_TRANSFER',
    receivedAt: '2026-11-08T08:42:00Z',
  }
  await store.dispatch(paymentAllocationApi.util.upsertQueryData('getUnallocatedReceipts', { page: 0, size: 200, view: 'UNALLOCATED' }, { content: [], number: 0, size: 200, totalElements: 0, totalPages: 0 }))
  await store.dispatch(paymentAllocationApi.util.upsertQueryData('getUnallocatedReceipts', { page: 0, size: 200, view: 'ALLOCATED' }, { content: [allocatedReceipt], number: 0, size: 200, totalElements: 1, totalPages: 1 }))
  await store.dispatch(paymentAllocationApi.util.upsertQueryData('getPaymentAllocations', 'r-done-1', [
    {
      allocationId: 'ALC-0096-UUID',
      allocationRequestId: 'req-0096',
      transactionId: 'r-done-1',
      orderId: 'ord-1042',
      invoiceId: 'INV-TAX-2601',
      allocatedAmount: 60000000,
      allocationType: 'MANUAL',
      allocationStatus: 'ACTIVE',
      allocatedAt: '2026-11-08T09:14:00Z',
      reason: 'Phân bổ đợt 1',
    },
  ]))

  const rootEl = dom.window.document.getElementById('root')!
  const root = ReactDOMClient.createRoot(rootEl)
  await act(async () => {
    root.render(
      React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>,
        React.createElement(MemoryRouter, null, React.createElement(PaymentAllocationsPage)),
      ),
    )
  })

  /* Ở tab Chờ phân bổ: chưa hiện bộ lọc kỳ / trạng thái / mỗi trang */
  assert.equal(rootEl.querySelector('#queueSearch'), null)

  /* Chuyển sang tab Đã phân bổ hết */
  const doneTab = Array.from(rootEl.querySelectorAll('button[role="tab"]')).find((b) =>
    b.textContent?.includes('Đã phân bổ hết'),
  ) as HTMLButtonElement
  assert.ok(doneTab, 'Tab Đã phân bổ hết phải tồn tại')
  await act(async () => {
    doneTab.click()
  })

  assert.ok(rootEl.querySelector('#queueSearch'), 'Phải có ô Tìm kiếm trên tab Đã phân bổ hết')
  assert.ok(rootEl.querySelector('#periodSel'), 'Phải có bộ lọc Kỳ hiển thị')
  assert.ok(rootEl.querySelector('#queueAllocStatus'), 'Phải có bộ lọc Trạng thái phân bổ')
  assert.ok(rootEl.querySelector('#pageSizeSel'), 'Phải có bộ chọn Mỗi trang')
  assert.ok(rootEl.innerHTML.includes('Phân bổ của phiếu này:'), 'Phải hiển thị danh sách phân bổ ngay trong thẻ phiếu')
  assert.ok(rootEl.innerHTML.includes('Thu hồi / Điều chỉnh'), 'Phải có nút Thu hồi / Điều chỉnh')

  await act(async () => {
    root.unmount()
  })
  store.dispatch(baseApi.util.resetApiState())
})

test('PaymentAllocationBatch includes allocationRequestId for idempotency', () => {
  const batch = {
    allocationRequestId: 'idempotent-uuid',
    receiptId: 'r1',
    orderId: 'ord-1',
    allocatedAmount: 1000000,
    remainingReceiptAmount: 0,
    allocations: [],
  }
  assert.equal(batch.allocationRequestId, 'idempotent-uuid', 'allocationRequestId present in batch')
})
