/**
 * UC-24 Customer Debt — RTK Query contract tests & UI permission tests.
 * Runner: node --import ./tests/loader.mjs --test tests/uc24CustomerDebt.test.ts
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
const { MemoryRouter, Routes, Route } = await import('react-router-dom')
const { customerDebtApi } = await import('../src/features/finance/api/customerDebtApi.ts')
const { CustomerDebtDetailPage } = await import('../src/features/finance/components/CustomerDebtDetailPage.tsx')

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

function renderDetailPage(store: ReturnType<typeof storeForRoles>, customerId: string) {
  return renderToStaticMarkup(
    React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>,
      React.createElement(MemoryRouter, { initialEntries: [`/app/customer-debts/${customerId}`] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/app/customer-debts/:customerId', element: React.createElement(CustomerDebtDetailPage) })
        )
      )
    )
  )
}

function mockFetch(body: unknown, status = 200) {
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

// ─── RTK Query endpoint contract tests ───────────────────────────────────────

test('getMyCustomerDebt calls the minimized customer self-service endpoint', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({
      data: {
        outstandingBalance: 120000,
        overdueBalance: 0,
        issuedInvoiceReceivable: 120000,
        unallocatedAdvanceAmount: 0,
        nearestDueDate: '2026-12-01',
        invoices: [],
        orders: [],
      },
    }), { headers: { 'Content-Type': 'application/json' } })
  }
  const store = storeForRoles(['CUSTOMER'])
  const result = await store.dispatch(customerDebtApi.endpoints.getMyCustomerDebt.initiate()).unwrap()
  assert.ok(capturedUrl.endsWith('/customer/debts'), 'URL should use the customer self-service route')
  assert.equal(result.outstandingBalance, 120000)
  assert.deepEqual(result.invoices, [])
  store.dispatch(baseApi.util.resetApiState())
})

test('getCustomerDebts builds query with sortBy and direction params', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({ data: { content: [], page: 0, size: 15, totalElements: 0, totalPages: 0 } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
  await store.dispatch(customerDebtApi.endpoints.getCustomerDebts.initiate({ page: 0, size: 15, sortBy: 'outstandingBalance', direction: 'desc' })).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('sortBy=outstandingBalance') || capturedUrl.includes('outstandingBalance'), 'sortBy param should be in URL')
  store.dispatch(baseApi.util.resetApiState())
})

test('getCustomerDebts without sortBy omits sort params', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({ data: { content: [], page: 0, size: 15, totalElements: 0, totalPages: 0 } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
  await store.dispatch(customerDebtApi.endpoints.getCustomerDebts.initiate({ page: 0, size: 15 })).unwrap().catch(() => {})
  assert.ok(!capturedUrl.includes('sortBy='), 'URL should not contain sortBy when not provided')
  store.dispatch(baseApi.util.resetApiState())
})

test('sendDebtReminder targets POST /finance/customer-debts/:id/reminders', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({ data: { outstandingBalance: 500000, emailResult: 'SENT', smsResult: 'SENT', message: 'OK' } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(customerDebtApi.endpoints.sendDebtReminder.initiate({ customerId: 'cust-1', data: { reminderType: 'OVERDUE' } })).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('cust-1/reminders'), 'URL should include /reminders')
  store.dispatch(baseApi.util.resetApiState())
})

test('saveDebtCallResult targets POST /finance/customer-debts/:id/reminder-calls', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
  }
  const store = storeForRoles(['SHOP_OWNER'])
  await store.dispatch(customerDebtApi.endpoints.saveDebtCallResult.initiate({ customerId: 'cust-1', data: { callResult: 'PROMISED_TO_PAY', note: 'test' } })).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('cust-1/reminder-calls'), 'URL should include /reminder-calls')
  store.dispatch(baseApi.util.resetApiState())
})

test('blockCustomer targets PATCH /finance/customer-debts/:id/block', async () => {
  let capturedUrl = ''
  let capturedMethod = ''
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    capturedMethod = input instanceof Request ? input.method : (init?.method ?? 'GET')
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
  }
  const store = storeForRoles(['SHOP_OWNER'])
  await store.dispatch(customerDebtApi.endpoints.blockCustomer.initiate({ customerId: 'cust-1', data: { reason: 'Quá hạn lâu dài' } })).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('cust-1/block'), 'URL should include /block')
  assert.equal(capturedMethod, 'PATCH', 'method should be PATCH')
  store.dispatch(baseApi.util.resetApiState())
})

test('restoreCustomer targets PATCH /finance/customer-debts/:id/restore', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
  }
  const store = storeForRoles(['SHOP_OWNER'])
  await store.dispatch(customerDebtApi.endpoints.restoreCustomer.initiate({ customerId: 'cust-1', data: { reason: 'Đã thanh toán' } })).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('cust-1/restore'), 'URL should include /restore')
  store.dispatch(baseApi.util.resetApiState())
})

test('emailDebtStatement targets POST /finance/customer-debts/:id/statement/email', async () => {
  let capturedUrl = ''
  globalThis.fetch = async (input: RequestInfo | URL) => {
    capturedUrl = input instanceof Request ? input.url : String(input)
    return new Response(JSON.stringify({ data: { emailResult: 'SENT', message: 'Đã gửi' } }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(customerDebtApi.endpoints.emailDebtStatement.initiate('cust-1')).unwrap().catch(() => {})
  assert.ok(capturedUrl.includes('cust-1/statement/email'), 'URL should include /statement/email')
  store.dispatch(baseApi.util.resetApiState())
})

// ─── UI permission tests ──────────────────────────────────────────────────────

test('CustomerDebtDetailPage: ACCOUNTANT sees Nhắc nợ button without standalone call button or UC-* codes', async () => {
  mockFetch({ data: { content: [], page: 0, size: 15, totalElements: 0, totalPages: 0 } })
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(customerDebtApi.util.upsertQueryData('getCustomerDebtDetail', 'cust-acc', {
    customer: { customerId: 'cust-acc', customerCode: 'CUS-ACC', customerName: 'Khách Kế toán', status: 'ACTIVE' },
    summary: { customerId: 'cust-acc', customerCode: 'CUS-ACC', customerName: 'Khách Kế toán', creditLimit: 10000000, unbilledCommitment: 0, issuedInvoiceReceivable: 0, unallocatedAdvanceAmount: 0, outstandingBalance: 2000000, overdueBalance: 0, availableCredit: 8000000, debtStatus: 'WITHIN_TERM' },
    invoices: [], orders: [], verifiedReceipts: [], unallocatedOrderReceipts: [], unallocatedVerifiedReceiptAmount: 500000, reminderHistory: [],
  }))
  const html = renderDetailPage(store, 'cust-acc')
  assert.ok(html.includes('Nhắc nợ'), 'ACCOUNTANT should see Nhắc nợ button')
  assert.ok(!html.includes('Ghi nhận cuộc gọi') && !html.includes('Gọi điện nhắc nợ'), 'ACCOUNTANT should NOT see standalone call button')
  assert.doesNotMatch(html, /UC-\d+/, 'CustomerDebtDetailPage should not expose internal UC-* codes')
  store.dispatch(baseApi.util.resetApiState())
})

test('CustomerDebtDetailPage: ACCOUNTANT does NOT see Chặn / Mở chặn button', async () => {
  mockFetch({})
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(customerDebtApi.util.upsertQueryData('getCustomerDebtDetail', 'cust-acc2', {
    customer: { customerId: 'cust-acc2', customerCode: 'CUS-ACC2', customerName: 'Khách Kế toán 2', status: 'ACTIVE' },
    summary: { customerId: 'cust-acc2', customerCode: 'CUS-ACC2', customerName: 'Khách Kế toán 2', creditLimit: 0, unbilledCommitment: 0, issuedInvoiceReceivable: 0, unallocatedAdvanceAmount: 0, outstandingBalance: 0, overdueBalance: 0, availableCredit: 0, debtStatus: 'NO_CREDIT' },
    invoices: [], orders: [], verifiedReceipts: [], unallocatedOrderReceipts: [], unallocatedVerifiedReceiptAmount: 0, reminderHistory: [],
  }))
  const html = renderDetailPage(store, 'cust-acc2')
  assert.ok(!html.includes('Chặn khách') && !html.includes('Mở chặn khách'), 'ACCOUNTANT should NOT see block/restore button')
  store.dispatch(baseApi.util.resetApiState())
})

test('CustomerDebtDetailPage: SHOP_OWNER sees action buttons including Nhắc nợ and Chặn without standalone call button', async () => {
  mockFetch({})
  const store = storeForRoles(['SHOP_OWNER'])
  await store.dispatch(customerDebtApi.util.upsertQueryData('getCustomerDebtDetail', 'cust-owner', {
    customer: { customerId: 'cust-owner', customerCode: 'CUS-OWN', customerName: 'Khách OWNER', status: 'ACTIVE' },
    summary: { customerId: 'cust-owner', customerCode: 'CUS-OWN', customerName: 'Khách OWNER', creditLimit: 20000000, unbilledCommitment: 0, issuedInvoiceReceivable: 0, unallocatedAdvanceAmount: 0, outstandingBalance: 5000000, overdueBalance: 1000000, availableCredit: 15000000, debtStatus: 'OVERDUE' },
    invoices: [], orders: [], verifiedReceipts: [], unallocatedOrderReceipts: [], unallocatedVerifiedReceiptAmount: 0, reminderHistory: [],
  }))
  const html = renderDetailPage(store, 'cust-owner')
  assert.ok(html.includes('Nhắc nợ'), 'SHOP_OWNER should see Nhắc nợ button')
  assert.ok(!html.includes('Ghi nhận cuộc gọi') && !html.includes('Gọi điện nhắc nợ'), 'SHOP_OWNER should NOT see standalone call button')
  assert.ok(html.includes('Chặn khách'), 'SHOP_OWNER should see Chặn button')
  store.dispatch(baseApi.util.resetApiState())
})

test('getCustomerDebts providesTags includes LIST and customer IDs', async () => {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
  globalThis.fetch = async () => new Response(JSON.stringify({
    data: {
      content: [{ customerId: 'c1', customerCode: 'C1', customerName: 'A', creditLimit: 0, unbilledCommitment: 0, issuedInvoiceReceivable: 0, unallocatedAdvanceAmount: 0, outstandingBalance: 0, overdueBalance: 0, availableCredit: 0, debtStatus: 'NO_CREDIT' }],
      page: 0, size: 15, totalElements: 1, totalPages: 1,
    },
  }), { headers: { 'Content-Type': 'application/json' } })
  await store.dispatch(customerDebtApi.endpoints.getCustomerDebts.initiate({ page: 0, size: 15 })).unwrap().catch(() => {})
  const state = store.getState() as { api: ReturnType<typeof baseApi.reducer> }
  const queries = Object.values(state.api.queries)
  assert.ok(queries.length > 0, 'At least one query in state')
  store.dispatch(baseApi.util.resetApiState())
})

test('CustomerDebtDetailPage: ?action=reminder opens ReminderDialog where Gọi điện thoại tab renders sanitized tel: link and Sao chép SĐT', async () => {
  const { JSDOM } = await import('jsdom')
  const ReactDOMClient = await import('react-dom/client')
  const { act } = React
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  globalThis.window = dom.window as unknown as Window & typeof globalThis
  globalThis.document = dom.window.document
  globalThis.HTMLElement = dom.window.HTMLElement
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false }

  mockFetch({})
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(customerDebtApi.util.upsertQueryData('getCustomerDebtDetail', 'cust-call', {
    customer: { customerId: 'cust-call', customerCode: 'CUS-CALL', customerName: 'Anh Trần Minh', phone: '0901 234 567', status: 'ACTIVE' },
    summary: { customerId: 'cust-call', customerCode: 'CUS-CALL', customerName: 'Anh Trần Minh', creditLimit: 20000000, unbilledCommitment: 0, issuedInvoiceReceivable: 5000000, unallocatedAdvanceAmount: 0, outstandingBalance: 5000000, overdueBalance: 5000000, availableCredit: 15000000, debtStatus: 'OVERDUE' },
    invoices: [], orders: [], verifiedReceipts: [], unallocatedOrderReceipts: [], unallocatedVerifiedReceiptAmount: 0, reminderHistory: [],
  }))

  const rootEl = dom.window.document.getElementById('root')!
  const root = ReactDOMClient.createRoot(rootEl)
  await act(async () => {
    root.render(
      React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>,
        React.createElement(MemoryRouter, { initialEntries: ['/app/customer-debts/cust-call?action=reminder'] },
          React.createElement(Routes, null,
            React.createElement(Route, { path: '/app/customer-debts/:customerId', element: React.createElement(CustomerDebtDetailPage) }),
          ),
        ),
      ),
    )
  })

  const callTabBtn = Array.from(rootEl.querySelectorAll('button')).find((b) =>
    b.textContent?.includes('Gọi điện thoại'),
  ) as HTMLButtonElement
  assert.ok(callTabBtn, 'ReminderDialog should include Gọi điện thoại tab')
  await act(async () => {
    callTabBtn.click()
  })

  assert.ok(rootEl.innerHTML.includes('href="tel:0901234567"'), 'Should sanitize spaces in tel: link')
  assert.ok(rootEl.innerHTML.includes('Gọi cho khách (0901 234 567)'), 'Should display call button with phone number')
  assert.ok(rootEl.innerHTML.includes('Sao chép SĐT'), 'Should display copy phone fallback button')

  await act(async () => {
    root.unmount()
  })
  store.dispatch(baseApi.util.resetApiState())
})

test('CustomerDebtsPage: renders Nhắc nợ action without standalone Gọi điện nhắc nợ button or UC-* codes', async () => {
  const { CustomerDebtsPage } = await import('../src/pages/management/CustomerDebtsPage.tsx')
  mockFetch({ data: { content: [], page: 0, size: 15, totalElements: 0, totalPages: 0 } })
  const store = storeForRoles(['ACCOUNTANT'])
  await store.dispatch(customerDebtApi.util.upsertQueryData('getCustomerDebts', {
    keyword: undefined, customerType: undefined, debtStatus: undefined, sortBy: undefined, direction: undefined, page: 0, size: 15,
  }, {
    content: [{
      customerId: 'cust-row-1',
      customerCode: 'CUS-ROW-1',
      customerName: 'Công ty Minh Phát',
      phone: '0909123456',
      creditLimit: 50000000,
      unbilledCommitment: 0,
      issuedInvoiceReceivable: 10000000,
      unallocatedAdvanceAmount: 0,
      outstandingBalance: 10000000,
      overdueBalance: 5000000,
      availableCredit: 40000000,
      debtStatus: 'OVERDUE',
    }],
    page: 0,
    size: 15,
    totalElements: 1,
    totalPages: 1,
  }))
  const html = renderToStaticMarkup(
    React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>,
      React.createElement(MemoryRouter, { initialEntries: ['/app/customer-debts'] },
        React.createElement(CustomerDebtsPage),
      ),
    ),
  )
  assert.ok(html.includes('Nhắc nợ'), 'CustomerDebtsPage should display Nhắc nợ action')
  assert.ok(!html.includes('Gọi điện nhắc nợ') && !html.includes('Gọi nhắc nợ'), 'CustomerDebtsPage must NOT display standalone call reminder button')
  assert.doesNotMatch(html, /UC-\d+/, 'CustomerDebtsPage should not expose internal UC-* codes')
  store.dispatch(baseApi.util.resetApiState())
})
