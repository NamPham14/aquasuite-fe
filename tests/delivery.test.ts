import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { register } from 'node:module'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { authReducer, setCredentials } from '../src/features/iam/model/authSlice.ts'
register('./loader.mjs', import.meta.url)
const { deliveryApi } = await import('../src/features/fulfillment/api/deliveryApi.ts')
const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { Provider } = await import('react-redux')
const { MemoryRouter } = await import('react-router-dom')
const { DeliveryDetails } = await import('../src/features/fulfillment/components/DeliveryDetails.tsx')
const { DeliveryList } = await import('../src/features/fulfillment/components/DeliveryList.tsx')
const { DeliveryActionDialog } = await import('../src/features/fulfillment/components/DeliveryActionDialog.tsx')
const originalFetch = globalThis.fetch
const stores: ReturnType<typeof createStore>[] = []
function createStore(roles: string[] = ['SHIPPER']) {
  const store = configureStore({ reducer: { api: baseApi.reducer, auth: authReducer }, middleware: (g) => g().concat(baseApi.middleware) })
  store.dispatch(setCredentials({ user: { id: 'actor', username: 'actor', email: 'actor@example.com', roles }, accessToken: 'test', generation: store.getState().auth.sessionGeneration }))
  return store
}
function setup(roles?: string[]) { const store = createStore(roles); stores.push(store); return store }
afterEach(() => { globalThis.fetch = originalFetch; stores.splice(0).forEach((s) => s.dispatch(baseApi.util.resetApiState())) })
function render(store: ReturnType<typeof createStore>, component: React.ReactNode) {
  return renderToStaticMarkup(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(MemoryRouter, null, component)))
}

test('failed delivery shows warehouse handoff and progress without offering cancellation or refund', async () => {
  const store = setup(['ACCOUNTANT'])
  await store.dispatch(deliveryApi.util.upsertQueryData('getDelivery', 'failed', {
    delivery: { deliveryId: 'failed', deliveryCode: 'GH-FAILED', orderId: 'order', batchNo: 1,
      warehouseCode: 'WH_MAIN', shipperId: 'shipper', deliveryStatus: 'FAILED', recipientName: 'Khách hàng',
      recipientPhone: '', deliveryAddress: 'Địa chỉ', scheduledDate: null, assignedAt: '2026-11-14T09:10:00+07:00',
      startedAt: '2026-11-14T09:20:00+07:00', confirmedAt: '2026-11-14T09:00:00+07:00',
      deliveredAt: null, codRequired: false, codAmount: 0, note: 'Khách từ chối nhận hàng', updatedAt: null },
    items: [], photos: [], assignedBy: null, shipperName: 'Shipper', shipperPhone: null,
  }))
  const html = render(store, React.createElement(DeliveryDetails, { id: 'failed' }))
  assert.match(html, /Theo dõi tiến độ/)
  assert.match(html, /Xác nhận xuất kho/)
  assert.match(html, /09:00:00/)
  assert.match(html, /chờ xử lý hàng trả/)
  assert.match(html, /Khách từ chối nhận hàng/)
  assert.match(html, /Kho xác nhận nhập lại hàng bán được hoặc cách ly hàng hỏng/)
  assert.doesNotMatch(html, /(?:Hủy nháp|Phân công shipper|Hoàn tiền)<\/button>/)
})

test('failure form offers customer refusal and explains warehouse inspection', () => {
  const html = render(setup(), React.createElement(DeliveryActionDialog, { id: 'one', action: 'fail', onClose() {} }))
  assert.match(html, /Khách từ chối nhận hàng/)
  assert.match(html, /Khách từ chối do hàng hỏng/)
  assert.match(html, /bàn giao về kho để kiểm tra/)
})

test('shipper list uses authenticated me endpoint, page and scheduled date filters', async () => {
  const store = setup()
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url)
    assert.equal(url.pathname, '/api/v1/fulfillment/me/deliveries')
    assert.equal(url.searchParams.get('mine'), null)
    assert.equal(url.searchParams.get('status'), 'IN_TRANSIT')
    assert.equal(url.searchParams.get('page'), '2')
    assert.equal(url.searchParams.get('scheduledFrom'), '2026-11-12')
    assert.equal(request.headers.get('authorization'), 'Bearer test')
    return Response.json({ data: { content: [], number: 2, totalPages: 3, totalElements: 41 } })
  }
  const page = await store.dispatch(deliveryApi.endpoints.getDeliveries.initiate({ mine: true, page: 2, size: 20, status: 'IN_TRANSIT', scheduledFrom: '2026-11-12' })).unwrap()
  assert.equal(page.totalElements, 41)
})

test('assignment is one atomic request; fail preserves reason; complete sends photos and propagates storage failure', async () => {
  const store = setup(['ACCOUNTANT', 'SHIPPER'])
  const requests: Request[] = []
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init); requests.push(request.clone())
    return request.url.endsWith('/complete') ? Response.json({ code: 'FUL_004', message: 'Storage unavailable' }, { status: 503 }) : Response.json({ data: {} })
  }
  await store.dispatch(deliveryApi.endpoints.assignDeliveries.initiate({ shipperId: 'shipper', deliveryIds: ['one', 'two'] })).unwrap()
  assert.equal(requests[0].method, 'PUT')
  assert.deepEqual(await requests[0].json(), { shipperId: 'shipper', deliveryIds: ['one', 'two'] })
  await store.dispatch(deliveryApi.endpoints.deliveryAction.initiate({ id: 'one', action: 'fail', body: { reason: 'Khách xác nhận không nhận', customerCancellationConfirmed: true } })).unwrap()
  assert.deepEqual(await requests[1].json(), { reason: 'Khách xác nhận không nhận', customerCancellationConfirmed: true })
  const photos = new FormData(); photos.append('photos', new Blob(['image'], { type: 'image/png' }), 'proof.png')
  await assert.rejects(store.dispatch(deliveryApi.endpoints.deliveryAction.initiate({ id: 'one', action: 'complete', body: photos })).unwrap(), (error: unknown) => (error as { status: number }).status === 503)
  assert.match(requests[2].headers.get('content-type')!, /multipart\/form-data; boundary=/)
  assert.equal((await requests[2].formData()).getAll('photos').length, 1)
})

test('detail actions respect ownership and lifecycle, accountant never completes or approves photos', async () => {
  for (const [role, owner, status, expected] of [
    ['SHIPPER', 'actor', 'ASSIGNED', 'Nhận hàng đi giao'],
    ['SHIPPER', 'actor', 'IN_TRANSIT', 'Đã giao thành công'],
    ['SHIPPER', 'actor', 'RESCHEDULED', 'Tiếp tục giao hàng'],
    ['ACCOUNTANT', 'actor', 'RESCHEDULED', 'Đổi shipper'],
    ['SHIPPER', 'another', 'IN_TRANSIT', ''],
    ['ACCOUNTANT', 'actor', 'ASSIGNED', 'Thu hồi phân công'],
    ['SHOP_OWNER', 'actor', 'ASSIGNED', 'Thu hồi phân công'],
    ['SHOP_OWNER', 'actor', 'DRAFT', 'Xác nhận xuất kho'],
    ['ACCOUNTANT', 'actor', 'DRAFT', 'Hủy nháp'],
    ['ACCOUNTANT', 'actor', 'IN_TRANSIT', ''],
    ['SHIPPER', 'actor', 'DELIVERED', ''],
    ['SHIPPER', 'actor', 'FAILED', ''],
  ]) {
    const store = setup([role])
    await store.dispatch(deliveryApi.util.upsertQueryData('getDelivery', 'one', { delivery: { deliveryId: 'one', deliveryCode: 'GH-001', orderId: 'order', batchNo: 2, warehouseCode: 'MAIN', shipperId: owner, deliveryStatus: status, recipientName: 'Người nhận', recipientPhone: '', deliveryAddress: 'Địa chỉ', scheduledDate: null, assignedAt: null, startedAt: null, deliveredAt: null, codRequired: false, codAmount: null, note: null, updatedAt: null }, items: [], photos: [], assignedBy: null, shipperName: null, shipperPhone: null } as Parameters<typeof deliveryApi.util.upsertQueryData<'getDelivery'>>[2]))
    const html = render(store, React.createElement(DeliveryDetails, { id: 'one' }))
    assert.match(html, /Hóa đơn nguồn/)
    assert.match(html, /Chưa có thông tin hóa đơn nguồn/)
    if (expected) assert.ok(html.includes(`${expected}</button>`), `${role}/${status}`)
    else assert.doesNotMatch(html, /(?:Nhận hàng đi giao|Đã giao thành công|Giao thất bại|Thu hồi phân công)<\/button>/)
    if (role === 'ACCOUNTANT') assert.doesNotMatch(html, /(?:Đã giao thành công|Duyệt ảnh)<\/button>/)
  }
})

test('unauthorized roles get no delivery table; completion form requires photos and warns about storage', () => {
  const store = setup(['SALES_STAFF'])
  assert.match(render(store, React.createElement(DeliveryList)), /Bạn không có quyền/)
  const html = render(store, React.createElement(DeliveryActionDialog, { id: 'one', action: 'complete', onClose() {} }))
  assert.match(html, /capture="environment"/)
  assert.match(html, /type="file"/)
  assert.match(html, /dịch vụ lưu trữ/)
  assert.match(html, /type="submit" disabled=""/)
})
