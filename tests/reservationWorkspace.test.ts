import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'
import { JSDOM } from 'jsdom'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { reservationProduct } from '../src/features/sales/lib/reservationPresentation.ts'
register('./loader.mjs', import.meta.url)
const React = await import('react')
const { act } = React
const bootstrap = new JSDOM('<div></div>', { url: 'http://localhost/' })
Object.assign(globalThis, { window: bootstrap.window, document: bootstrap.window.document, HTMLElement: bootstrap.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })
const { createRoot } = await import('react-dom/client')
const { Provider } = await import('react-redux')
const { ReservationWorkspace } = await import('../src/features/sales/components/ReservationWorkspace.tsx')
const { ReservationDetails } = await import('../src/features/sales/components/ReservationDetails.tsx')

function fixture() {
  const payment = { orderId: 'order', totalAmount: 1000000, depositRequired: 300000, verifiedPaid: 300000, pendingAmount: 100000, remaining: 700000, depositSatisfied: true }
  const order = { orderId: 'order', orderCode: 'DH-01', customerName: 'Customer', orderStatus: 'PROCESSING', totalAmount: 1000000, items: [{ orderItemId: 'item', variantId: 'variant', sku: 'LVB-01', productName: 'Lavabo', variantName: 'White', quantity: 5, comboId: null }] }
  const view = { orderId: 'order', reservationRequested: true, reservationValue: 1000000, payment, status: 'HELD', depositStatus: 'SATISFIED', allocationStatus: 'COMPLETED', allocationErrorCode: null, warehouseCode: 'WH_MAIN', allocationId: 'allocation', lines: [{ orderItemId: 'item', quantity: 5 }], lineStatuses: [{ orderItemId: 'item', requestedQty: 5, heldQty: 3, waitingQty: 2, status: 'PARTIALLY_HELD' }] }
  const stock = { reservationId: 'stock', orderId: 'order', orderItemId: 'item', variantId: 'variant', warehouseCode: 'WH_MAIN', requestedQty: 5, heldQty: 3, consumedQty: 1, releasedQty: 1, waitingQty: 0, status: 'PARTIALLY_HELD' }
  const decision = { decisionId: 'decision', type: 'ITEM_CHANGE', status: 'APPROVED', requestedBy: 'creator', requestedAt: '2026-11-11T09:00:00Z', reason: 'Reduce quantity', reviewedBy: 'owner', reviewedAt: '2026-11-11T10:00:00Z', decisionNote: null, releaseStatus: 'PENDING_RELEASE', release: null }
  const history = { orderId: 'order', reservations: [stock], actorNames: { creator: 'Creator name', owner: 'Owner name' }, decisions: [decision], activities: [
    { requestId: 'older', reservationId: 'stock', action: 'RESERVE', heldBefore: 0, heldAfter: 4, actorId: 'creator', reason: null, createdAt: '2026-11-10T09:00:00Z' },
    { requestId: 'newer', reservationId: 'stock', action: 'RELEASE', heldBefore: 4, heldAfter: 3, actorId: 'owner', reason: null, createdAt: '2026-11-11T09:00:00Z' },
  ] }
  return { order, view, history }
}

async function mount({ role = 'SALES_STAFF', embedded = false, historyFailure = false, fresh = false, cancelled = false } = {}) {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false }
  const originalFetch = globalThis.fetch
  const data = fixture()
  if (cancelled) data.order.orderStatus = 'CANCELLED'
  if (fresh) { data.view.reservationRequested = false; data.view.warehouseCode = ''; data.view.lines = []; data.history.reservations = []; data.history.decisions = [] }
  const calls: Request[] = []
  let finishRelease: (() => void) | undefined
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init); calls.push(request)
    const path = new URL(request.url).pathname
    if (path.endsWith('/releases/decision')) {
      await new Promise<void>((resolve) => { finishRelease = resolve })
      data.history.reservations[0]!.heldQty = 1
      data.history.reservations[0]!.releasedQty = 3
      data.history.decisions[0]!.releaseStatus = 'COMPLETED'
      return Response.json({ success: true, data: { decisionId: 'decision', orderId: 'order', executedBy: 'owner', executedAt: '2026-11-11T11:00:00Z', lines: [{ reservationId: 'stock', orderItemId: 'item', releasedQty: 2 }] } })
    }
    if (path.endsWith('/history') && historyFailure) return Response.json({ code: 'AUTH_002', message: 'Denied history' }, { status: 403 })
    const body = path.endsWith('/history') ? data.history : path.endsWith('/stock-reservations') ? data.view : path.endsWith('/payments') ? [] : data.order
    return Response.json({ success: true, data: body })
  }
  const store = configureStore({ reducer: { api: baseApi.reducer, auth: () => ({ user: { id: 'viewer', roles: [role] }, accessToken: null, sessionGeneration: 0 }) }, middleware: (defaults) => defaults().concat(baseApi.middleware) })
  const root = createRoot(dom.window.document.getElementById('root')!)
  await act(async () => { root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, embedded ? React.createElement(ReservationWorkspace, { orderId: 'order', embedded: true, initialOrder: data.order }) : React.createElement(ReservationDetails, { orderId: 'order', onClose() {} }))) })
  const settle = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)) }) }
  for (let i = 0; i < 25 && !dom.window.document.querySelector('[role="tab"]'); i++) await settle()
  for (let i = 0; i < 25 && !dom.window.document.querySelector('table'); i++) { if (historyFailure && dom.window.document.body.textContent?.includes('Denied history')) break; await settle() }
  const button = (text: string) => [...dom.window.document.querySelectorAll('button')].find((node) => node.textContent?.trim() === text)!
  return { ...data, dom, calls, root, store, settle, button, finish: () => finishRelease?.(), cleanup: async () => { await act(async () => { root.unmount(); store.dispatch(baseApi.util.resetApiState()) }); globalThis.fetch = originalFetch; dom.window.close() } }
}

test('workspace defaults to current held stock, shares history data and supports keyboard tabs and lazy receipts', async () => {
  const app = await mount()
  try {
    const doc = app.dom.window.document
    const tabs = [...doc.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    assert.equal(tabs[0]!.getAttribute('aria-selected'), 'true')
    assert.ok(tabs[1]!.textContent?.includes('1 chờ giải phóng'))
    assert.equal(doc.getElementById(tabs[1]!.getAttribute('aria-controls')!)!.hidden, true)
    const table = doc.querySelector('table')!
    assert.ok(table.textContent?.includes('Lavabo'))
    assert.ok(table.textContent?.includes('Đã giải phóng'))
    assert.ok(!table.textContent?.includes('Chờ bổ sung'))
    assert.equal(app.calls.filter((request) => request.url.endsWith('/history')).length, 1)
    assert.equal(app.calls.filter((request) => request.url.endsWith('/payments')).length, 0)
    await act(async () => { tabs[0]!.dispatchEvent(new app.dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })) })
    assert.equal(tabs[1]!.getAttribute('aria-selected'), 'true')
    assert.equal(doc.activeElement, tabs[1])
    assert.equal(doc.querySelector('ol > li time')?.getAttribute('datetime'), '2026-11-11T09:00:00Z')
    assert.equal(app.button('Thực hiện giải phóng'), undefined)
    const financial = [...doc.querySelectorAll('details')].find((node) => node.querySelector('summary')?.textContent === 'Chi tiết tiền cọc')!
    await act(async () => { financial.open = true; financial.dispatchEvent(new app.dom.window.Event('toggle')) })
    await app.settle()
    assert.equal(app.calls.filter((request) => request.url.endsWith('/payments')).length, 1)
  } finally { await app.cleanup() }
})

test('embedded workspace reuses order context, omits duplicated money and refreshes stock after owner release', async () => {
  const app = await mount({ role: 'SHOP_OWNER', embedded: true })
  try {
    const doc = app.dom.window.document
    assert.equal(app.calls.filter((request) => new URL(request.url).pathname.endsWith('/sales/orders/order')).length, 0)
    assert.ok(!doc.body.textContent?.includes('Cọc thỏa thuận'))
    assert.ok(!doc.body.textContent?.includes('Chi tiết tiền cọc'))
    await act(async () => { app.button('Xem quyết định cần xử lý').click() })
    await act(async () => { app.button('Thực hiện giải phóng').click() })
    assert.ok(doc.body.textContent?.includes('không xác nhận hoàn tiền'))
    await act(async () => { app.button('Xác nhận giải phóng').click() })
    for (let i = 0; i < 20 && !app.calls.some((request) => request.url.endsWith('/releases/decision')); i++) await app.settle()
    assert.ok([...doc.querySelectorAll<HTMLButtonElement>('[role="tab"]')].every((node) => node.disabled))
    const release = app.calls.find((request) => request.url.endsWith('/releases/decision'))!
    assert.equal(release.method, 'POST')
    assert.equal(await release.clone().text(), '')
    await act(async () => { app.finish() })
    for (let i = 0; i < 20 && doc.body.textContent?.includes('Đang thực hiện...'); i++) await app.settle()
    await app.settle()
    assert.equal(app.button('Thực hiện giải phóng'), undefined)
    await act(async () => { [...doc.querySelectorAll<HTMLButtonElement>('[role="tab"]')][0]!.click() })
    const cells = [...doc.querySelectorAll('tbody tr:first-child td')].map((node) => node.textContent)
    assert.equal(cells[3], '1')
    assert.equal(cells[5], '3')
    assert.equal(app.calls.filter((request) => request.url.endsWith('/payments')).length, 0)
  } finally { await app.cleanup() }
})

test('history errors never become zero stock and block new holding commands', async () => {
  const app = await mount({ historyFailure: true })
  try {
    assert.ok(app.dom.window.document.body.textContent?.includes('Denied history'))
    assert.equal(app.dom.window.document.querySelector('table'), null)
    assert.equal(app.button('Kiểm tra và giữ thêm hàng').disabled, true)
    assert.ok(!app.dom.window.document.body.textContent?.includes('0 dòng còn giữ'))
  } finally { await app.cleanup() }
})

test('new selection form is opt-in and keeps quantity while switching tabs', async () => {
  const app = await mount({ fresh: true })
  try {
    const doc = app.dom.window.document
    assert.equal(doc.querySelector('form'), null)
    await act(async () => { app.button('Chọn hàng cần giữ').click() })
    const input = doc.querySelector<HTMLInputElement>('input[type="number"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(app.dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, '2.5')
      input.dispatchEvent(new app.dom.window.Event('input', { bubbles: true }))
    })
    const tabs = [...doc.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    await act(async () => { tabs[1]!.click() })
    await act(async () => { tabs[0]!.click() })
    assert.equal(input.value, '2.5')
    assert.ok(doc.querySelector('form'))
  } finally { await app.cleanup() }
})

test('product identity requires both the original line and matching variant', () => {
  const items = fixture().order.items
  assert.equal(reservationProduct(items, 'item', 'different-variant'), undefined)
  assert.equal(reservationProduct(items, 'removed-line', 'variant'), undefined)
  assert.equal(reservationProduct(items, 'item', 'variant')?.sku, 'LVB-01')
})

test('accountant and cancelled orders retain readable stock/history without ineligible UC29 requests', async () => {
  for (const options of [{ role: 'ACCOUNTANT', embedded: true }, { role: 'SHOP_OWNER', embedded: true, cancelled: true }]) {
    const app = await mount(options)
    try {
      assert.ok(app.dom.window.document.querySelector('table')?.textContent?.includes('Lavabo'))
      assert.equal(app.calls.filter((request) => new URL(request.url).pathname.endsWith('/stock-reservations')).length, 0)
      assert.equal(app.button('Kiểm tra và giữ thêm hàng'), undefined)
      await act(async () => { app.button('Xem quyết định cần xử lý').click() })
      assert.ok(app.dom.window.document.body.textContent?.includes('Owner name'))
      if (options.role === 'ACCOUNTANT') assert.equal(app.button('Thực hiện giải phóng'), undefined)
    } finally { await app.cleanup() }
  }
})
