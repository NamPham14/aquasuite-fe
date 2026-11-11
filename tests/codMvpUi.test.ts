import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { authReducer, setCredentials } from '../src/features/iam/model/authSlice.ts'
register('./loader.mjs', import.meta.url)
const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { Provider } = await import('react-redux')
const { MemoryRouter } = await import('react-router-dom')
const { CodManagement } = await import('../src/features/finance/components/CodManagement.tsx')
const { CodClaimDialog } = await import('../src/features/finance/components/CodClaimDialog.tsx')
const { CustomerDebtDetailDialog } = await import('../src/features/finance/components/CustomerDebtDetailDialog.tsx')
const { customerDebtApi } = await import('../src/features/finance/api/customerDebtApi.ts')
const { codApi } = await import('../src/features/finance/api/codApi.ts')

function storeForRoles(roles: string[]) {
  const store = configureStore({ reducer: { api: baseApi.reducer, auth: authReducer }, middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware) })
  store.dispatch(setCredentials({ user: { id: 'actor', username: 'actor', email: 'actor@example.com', roles }, accessToken: 'test', generation: store.getState().auth.sessionGeneration }))
  return store
}
function render(store: ReturnType<typeof storeForRoles>, component: React.ReactNode) {
  return renderToStaticMarkup(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(MemoryRouter, null, component)))
}
test('COD claim form requires no photo and retains amount, delivery and collection time', () => {
  const store = storeForRoles(['SHIPPER'])
  const html = render(store, React.createElement(CodClaimDialog, { onClose() {} }))
  assert.doesNotMatch(html, /type="file"|image\/|cod-file|bằng chứng|kiểm tra ảnh/)
  for (const name of ['deliveryId', 'amount', 'collectedAt', 'note']) assert.ok(html.includes(`name="${name}"`))
  store.dispatch(baseApi.util.resetApiState())
})
test('COD screen offers claim only to shipper and receipt only to accountant', async () => {
  for (const role of ['SHIPPER', 'ACCOUNTANT', 'SALES_STAFF', 'SHOP_OWNER', 'CUSTOMER']) {
    const store = storeForRoles([role])
    await store.dispatch(codApi.util.upsertQueryData('getCodCollections', { orderId: undefined, shipperId: undefined, status: undefined, page: 0, size: 20 }, { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }))
    const html = render(store, React.createElement(CodManagement))
    assert.equal(html.includes('Khai thu COD</button>'), role === 'SHIPPER')
    assert.equal(html.includes('Nhận tiền đã chọn'), role === 'ACCOUNTANT')
    if (role === 'CUSTOMER') assert.match(html, /Bạn không có quyền/)
    else { assert.match(html, /Trạng thái khai thu/); assert.match(html, /Không có khoản thu phù hợp/); assert.match(html, /overflow-x-auto/) }
    store.dispatch(baseApi.util.resetApiState())
  }
})
test('COD_REVIEW debt shows responsibility and disables customer collection actions', async () => {
  const store = storeForRoles(['SHOP_OWNER', 'ACCOUNTANT', 'SALES_STAFF'])
  await store.dispatch(customerDebtApi.util.upsertQueryData('getCustomerDebtDetail', 'customer', {
    customer: { customerId: 'customer', customerCode: 'CUS1', customerName: 'Customer', status: 'ACTIVE' },
    summary: { customerId: 'customer', customerCode: 'CUS1', customerName: 'Customer', creditLimit: 0, unbilledCommitment: 0, issuedInvoiceReceivable: 0, unallocatedAdvanceAmount: 0, outstandingBalance: 220000, overdueBalance: 220000, availableCredit: 0, debtStatus: 'COD_REVIEW', codReviewRequired: true, codHeldAmount: 220000, customerCollectibleAmount: 0 },
    invoices: [], orders: [], verifiedReceipts: [], unallocatedOrderReceipts: [], unallocatedVerifiedReceiptAmount: 0, reminderHistory: [],
  }))
  const html = render(store, React.createElement(CustomerDebtDetailDialog, { customerId: 'customer', onClose() {} }))
  assert.match(html, /Shipper còn giữ/)
  assert.match(html, /Khách còn phải trả/)
  for (const label of ['Tải sao kê PDF', 'Gửi sao kê', 'Nhắc nợ', 'Ghi nhận cuộc gọi', 'Kiểm tra tín dụng']) {
    const button = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g)?.find((element) => element.includes(label))
    assert.ok(button?.includes('disabled=""'), label)
  }
  store.dispatch(baseApi.util.resetApiState())
})
