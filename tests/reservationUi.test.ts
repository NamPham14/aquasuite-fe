import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { JSDOM } from 'jsdom'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { reservationApi } from '../src/features/sales/api/reservationApi.ts'
register('./loader.mjs', import.meta.url)
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })
const React = (await import('react')).default
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { Provider } = await import('react-redux')
const { ReservationDetails } = await import('../src/features/sales/components/ReservationDetails.tsx')

test('UC29 has no receipt form, links to order payment, and retains reservation retry safety', async () => {
  const originalFetch = globalThis.fetch
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false }
  const payment = { orderId: 'order-1', totalAmount: 100000000, depositRequired: 30000000, verifiedPaid: 30000000, pendingAmount: 10000000, remaining: 70000000, depositSatisfied: false }
  const view = { orderId: 'order-1', reservationRequested: true, reservationValue: 40000000, payment, status: 'AWAITING_DEPOSIT', depositStatus: 'PARTIALLY_PAID', allocationStatus: 'AWAITING_DEPOSIT', warehouseCode: 'WH_MAIN', lines: [{ orderItemId: 'item-1', quantity: 3 }], lineStatuses: [{ orderItemId: 'item-1', requestedQty: 3, heldQty: 0, waitingQty: 3 }] }
  const bodies: unknown[] = []
  const paymentWrites: string[] = []
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: () => ({ user: { id: 'staff-1', roles: ['SALES_STAFF'] }, accessToken: null, sessionGeneration: 0 }) },
    middleware: (defaults) => defaults().concat(baseApi.middleware),
  })
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const path = new URL(request.url).pathname
    if (request.method === 'POST') {
      if (path.endsWith('/payments')) paymentWrites.push(path)
      bodies.push(await request.json())
      if (bodies.length === 1) throw new TypeError('Lost response')
    }
    const data = path.endsWith('/stock-reservations/history') ? { orderId: 'order-1', reservations: [], activities: [], decisions: [] }
      : path.endsWith('/stock-reservations') ? view : path.endsWith('/payments') ? (request.method === 'POST' ? { transactionCode: 'PAY-1', status: 'PENDING' } : [])
      : { orderId: 'order-1', orderCode: 'DH01', customerName: 'Customer', orderStatus: 'CONFIRMED', items: [{ orderItemId: 'item-1', variantId: 'variant-1', sku: 'SKU-1', productName: 'Product', quantity: 10 }] }
    return new Response(JSON.stringify({ success: true, data }), { headers: { 'content-type': 'application/json' } })
  }) as typeof fetch
  const root = createRoot(document.getElementById('root')!)
  async function settle() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 75)) }) }
  try {
    await act(async () => { root.render(React.createElement(Provider, { store }, React.createElement(ReservationDetails, { orderId: 'order-1', onClose() {} }))) })
    for (let i = 0; i < 20 && !document.querySelector('a[href="/app/orders/order-1"]'); i++) await settle()
    const sync = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Kiểm tra và giữ thêm hàng')!
    assert.equal(sync.disabled, true, 'must not infer eligibility from verifiedPaid >= required')
    assert.equal(document.querySelector('#receipt-amount'), null)
    assert.equal(document.body.textContent?.includes('Ghi nhận khoản thu'), false)
    assert.equal(document.querySelector('a[href="/app/orders/order-1"]')?.textContent?.trim(), 'Đến thanh toán đơn hàng')
    assert.equal(document.querySelectorAll('form').length, 1)
    view.payment.depositSatisfied = true
    await act(async () => { await store.dispatch(reservationApi.endpoints.reservation.initiate('order-1', { forceRefetch: true })).unwrap() })
    for (let i = 0; i < 20 && Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Kiểm tra và giữ thêm hàng')?.disabled; i++) await settle()
    const forms = document.querySelectorAll('form')
    await act(async () => { forms[0].dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })) })
    for (let i = 0; i < 20 && !document.body.textContent?.includes('Chưa xác định kết quả'); i++) await settle()
    assert.equal(bodies.length, 1)
    assert.equal(document.querySelector<HTMLButtonElement>('button[aria-label="Đóng"]')!.disabled, true)
    assert.ok(Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]')).every((button) => button.disabled))
    assert.equal(document.querySelector('a[aria-disabled="true"]')?.hasAttribute('href'), false)
    await act(async () => { forms[0].dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })) })
    for (let i = 0; i < 20 && !document.body.textContent?.includes('Đã cập nhật yêu cầu giữ hàng.'); i++) await settle()
    assert.equal(bodies.length, 2)
    assert.deepEqual(bodies[0], bodies[1])
    assert.deepEqual(paymentWrites, [])
    assert.equal(document.querySelector<HTMLButtonElement>('button[aria-label="Đóng"]')!.disabled, false)
  } finally {
    await act(async () => { root.unmount(); store.dispatch(reservationApi.util.resetApiState()) })
    globalThis.fetch = originalFetch
    dom.window.close()
  }
})
