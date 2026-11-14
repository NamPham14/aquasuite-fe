import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'
import { JSDOM } from 'jsdom'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
register('./loader.mjs', import.meta.url)
const React = await import('react')
const { act } = React
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true })
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false }
const { createRoot } = await import('react-dom/client')
const { Provider } = await import('react-redux')
const { MemoryRouter } = await import('react-router-dom')
const { CreateDeliveryDialog } = await import('../src/features/fulfillment/components/CreateDeliveryDialog.tsx')
const { DeliveryIssueDialog } = await import('../src/features/fulfillment/components/DeliveryIssueDialog.tsx')
const { DeliveryActionDialog } = await import('../src/features/fulfillment/components/DeliveryActionDialog.tsx')

test('photo picker accepts PNG with missing MIME, previews it and submits an image multipart file', async () => {
  const originalFetch = globalThis.fetch
  const store = configureStore({ reducer: { api: baseApi.reducer }, middleware: (g) => g().concat(baseApi.middleware) })
  const root = createRoot(document.getElementById('root')!)
  let uploaded: File | undefined
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    assert.match(request.url, /one\/complete$/)
    uploaded = (await request.formData()).get('photos') as File
    return Response.json({ data: { deliveryStatus: 'DELIVERED' } })
  }
  try {
    await act(async () => root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(DeliveryActionDialog, { id: 'one', action: 'complete', onClose() {} }))))
    const picker = document.querySelector<HTMLInputElement>('input[type="file"]')!
    assert.match(picker.accept, /\.png/)
    const choose = async (file: File) => act(async () => {
      Object.defineProperty(picker, 'files', { configurable: true, value: [file] })
      picker.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
    })
    await choose(new File(['bad'], 'not-image.txt'))
    assert.equal(document.querySelectorAll('img').length, 0)
    await choose(new File([], 'empty.png'))
    assert.equal(document.querySelectorAll('img').length, 0)
    await choose(new File(['proof-content'], 'Ảnh bằng chứng.PNG'))
    assert.equal(document.querySelectorAll('img').length, 1)
    assert.match(document.body.textContent!, /Ảnh bằng chứng.PNG/)
    assert.equal(document.querySelector('[role="alert"]'), null)
    await act(async () => {
      document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))
      await new Promise(resolve => setTimeout(resolve, 70))
    })
    assert.equal(uploaded?.name, 'Ảnh bằng chứng.PNG')
    assert.equal(uploaded?.type, 'image/png')
    assert.equal(await uploaded?.text(), 'proof-content')
  } finally { await act(async () => root.unmount()); store.dispatch(baseApi.util.resetApiState()); globalThis.fetch = originalFetch }
})
const { salesOrderApi } = await import('../src/features/sales/api/salesOrderApi.ts')

test('reservation conflict offers existing workspace and retries the same delivery without creating stock holds', async () => {
  const originalFetch = globalThis.fetch
  const store = configureStore({ reducer: { api: baseApi.reducer }, middleware: (g) => g().concat(baseApi.middleware) })
  const root = createRoot(document.getElementById('root')!)
  let calls = 0, closed = 0
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    assert.match(request.url, /draft\/confirm-issue$/)
    assert.equal(request.method, 'POST')
    assert.equal(await request.text(), '')
    calls++
    return calls === 1 ? Response.json({ code: 'FUL_006', message: 'Kiểm tra Cọc & hàng giữ' }, { status: 409 })
      : Response.json({ data: { deliveryStatus: 'DISPATCHED' } })
  }
  const submit = () => act(async () => {
    document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))
    await new Promise(resolve => setTimeout(resolve, 70))
  })
  try {
    await act(async () => root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(DeliveryIssueDialog, { id: 'draft', action: 'confirm-issue', onClose() { closed++ } }))))
    await submit()
    const link = document.querySelector<HTMLAnchorElement>('a[href="/app/deposits"]')!
    assert.ok(link)
    assert.equal(link.target, '_blank')
    assert.match(document.body.textContent!, /không cần tạo lại Delivery/)
    assert.equal(closed, 0)
    assert.equal(document.querySelector<HTMLButtonElement>('button[aria-label="Đóng"]')!.disabled, false)
    await submit()
    assert.equal(calls, 2)
    assert.equal(closed, 1)
  } finally { await act(async () => root.unmount()); store.dispatch(baseApi.util.resetApiState()); globalThis.fetch = originalFetch }
})

test('temporary delivery obstacle can wait without a new date; terminal failure is disabled without confirmation', async () => {
  const originalFetch = globalThis.fetch
  const store = configureStore({ reducer: { api: baseApi.reducer }, middleware: (g) => g().concat(baseApi.middleware) })
  const root = createRoot(document.getElementById('root')!)
  let closed = 0
  const requests: Request[] = []
  globalThis.fetch = async (input, init) => { requests.push(new Request(input, init)); return Response.json({ data: {} }) }
  const render = async (action: 'fail' | 'reschedule') => act(async () => root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(DeliveryActionDialog, { key: action, id: 'one', action, onClose() { closed++ } }))))
  try {
    await render('fail')
    assert.equal(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled, true)
    assert.match(document.body.textContent!, /Khách đã xác nhận hủy hoặc không nhận hàng/)
    assert.equal(document.querySelector('option[value="Không liên hệ được khách hàng"]'), null)
    await render('reschedule')
    assert.equal(document.querySelector<HTMLInputElement>('#delivery-next-date')!.required, false)
    await act(async () => {
      const textarea = document.querySelector<HTMLTextAreaElement>('#delivery-reschedule-reason')!
      Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'Chưa liên hệ được khách')
      textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    })
    await act(async () => { document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); await new Promise(resolve => setTimeout(resolve, 70)) })
    assert.equal(requests.length, 1)
    assert.ok(requests[0].url.endsWith('/deliveries/one/reschedule'))
    assert.deepEqual(await requests[0].json(), { scheduledDate: null, reason: 'Chưa liên hệ được khách' })
    assert.equal(closed, 1)
  } finally { await act(async () => root.unmount()); store.dispatch(baseApi.util.resetApiState()); globalThis.fetch = originalFetch }
})

test('create form keeps the same UUID/payload after uncertain error and locks editing/closing until retry', async () => {
  const originalFetch = globalThis.fetch
  const store = configureStore({ reducer: { api: baseApi.reducer }, middleware: (g) => g().concat(baseApi.middleware) })
  const root = createRoot(document.getElementById('root')!)
  const payloads: Record<string, unknown>[] = []
  let closed = 0
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    if (new URL(request.url).pathname === '/api/v1/sales/orders/order') return Response.json({ data: { orderId: 'order', customerName: 'Order customer', customerPhone: '0912345678', deliveryAddress: 'Order address' } })
    if (request.url.endsWith('/delivery-invoices')) return Response.json({ data: [{ invoiceId: 'invoice', invoiceCode: 'INV-01', orderId: 'order', type: 'SALE', status: 'ISSUED' }] })
    if (request.method === 'POST') {
      const body = await request.json(); payloads.push(body)
      return payloads.length === 1 ? Response.json({ message: 'Connection lost' }, { status: 503 }) : Response.json({ data: { deliveryId: body.deliveryId } })
    }
    return Response.json({ data: { orderId: 'order', salesInvoiceId: 'invoice', invoiceCode: 'INV-01', orderCode: 'SO-01', deliveryAddress: 'Địa chỉ', eligible: true, items: [{ orderItemId: 'item', variantId: 'variant', sku: 'SKU-01', productName: 'Lavabo', orderedQty: 5, issuedQty: 1, remainingQty: 4, heldQty: 2, availableQty: 8 }] } })
  }
  const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
  const fill = async (selector: string, value: string) => act(async () => {
    const input = document.querySelector<HTMLInputElement>(selector)!
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!
    setter.call(input, value); input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
  try {
    await act(async () => root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(MemoryRouter, null, React.createElement(CreateDeliveryDialog, { orderId: 'order', onClose() { closed++ } })))))
    await flush()
    await act(async () => { const select = document.querySelector<HTMLSelectElement>('#issue-invoice')!; select.value = 'invoice'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
    await flush()
    assert.equal(document.querySelector<HTMLInputElement>('#issue-recipient')!.value, 'Order customer')
    assert.equal(document.querySelector<HTMLInputElement>('#issue-phone')!.value, '0912345678')
    await fill('#issue-recipient', 'Nguyễn Văn A'); await fill('#issue-phone', '0901234567'); await fill('input[type="number"]', '2.25')
    await act(async () => { await store.dispatch(salesOrderApi.endpoints.getSalesOrderById.initiate('order', { forceRefetch: true, subscribe: false })).unwrap() })
    assert.equal(document.querySelector<HTMLInputElement>('#issue-recipient')!.value, 'Nguyễn Văn A')
    assert.equal(document.querySelector<HTMLInputElement>('#issue-phone')!.value, '0901234567')
    await act(async () => { document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })) })
    await flush()
    assert.equal(payloads.length, 1)
    assert.equal(payloads[0].recipientName, 'Nguyễn Văn A')
    assert.equal(payloads[0].recipientPhone, '0901234567')
    assert.equal(document.querySelector<HTMLSelectElement>('#issue-invoice')!.disabled, true)
    assert.equal((payloads[0].items as { quantity: number }[])[0].quantity, 2.25)
    assert.match(String(payloads[0].deliveryId), /^[0-9a-f-]{36}$/)
    assert.equal(document.querySelector<HTMLInputElement>('#issue-recipient')!.disabled, true)
    assert.equal(document.querySelector<HTMLButtonElement>('button[aria-label="Đóng"]')!.disabled, true)
    assert.match(document.body.textContent!, /Chưa xác định kết quả tạo nháp/)
    await act(async () => { document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })) })
    await flush()
    assert.equal(payloads.length, 2); assert.deepEqual(payloads[0], payloads[1]); assert.equal(closed, 1)
  } finally { await act(async () => root.unmount()); store.dispatch(baseApi.util.resetApiState()); globalThis.fetch = originalFetch }
})

test('issue popup explains stock effect and retains the action after uncertain error', async () => {
  const originalFetch = globalThis.fetch
  const store = configureStore({ reducer: { api: baseApi.reducer }, middleware: (g) => g().concat(baseApi.middleware) })
  const root = createRoot(document.getElementById('root')!)
  let calls = 0, closed = 0
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init); assert.match(req.url, /draft\/confirm-issue$/); assert.equal(await req.text(), '')
    calls++; return calls === 1 ? Response.json({ message: 'Unavailable' }, { status: 503 }) : Response.json({ data: { deliveryStatus: 'DISPATCHED' } })
  }
  try {
    await act(async () => root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(DeliveryIssueDialog, { id: 'draft', action: 'confirm-issue', onClose() { closed++ } }))))
    assert.match(document.body.textContent!, /trừ tồn và tiêu thụ hàng giữ/)
    for (let i = 0; i < 2; i++) {
      await act(async () => { document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); await new Promise((resolve) => setTimeout(resolve, 50)) })
      if (i === 0) { assert.equal(document.querySelector<HTMLButtonElement>('button[aria-label="Đóng"]')!.disabled, true); assert.equal(closed, 0) }
    }
    assert.equal(calls, 2); assert.equal(closed, 1)
  } finally { await act(async () => root.unmount()); store.dispatch(baseApi.util.resetApiState()); globalThis.fetch = originalFetch }
})

test('invoice selection loads issued invoices for the order, rejects mismatched candidates, and clears form on switch', async () => {
  const originalFetch = globalThis.fetch
  const store = configureStore({ reducer: { api: baseApi.reducer }, middleware: (g) => g().concat(baseApi.middleware) })
  const root = createRoot(document.getElementById('root')!)
  const paths: string[] = []
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init); paths.push(new URL(request.url).pathname)
    if (request.url.endsWith('/delivery-invoices')) return Response.json({ data: [...['first', 'second', 'wrong'].map((id) => ({ invoiceId: id, invoiceCode: id, orderId: 'order', type: 'SALE', status: 'ISSUED' })), { invoiceId: 'draft', invoiceCode: 'Draft', orderId: 'order', status: 'DRAFT' }, { invoiceId: 'other', invoiceCode: 'Other order', orderId: 'another-order', status: 'ISSUED' }] })
    const invoice = request.url.includes('/wrong/') ? 'wrong' : request.url.includes('/second/') ? 'second' : 'first'
    return Response.json({ data: { orderId: invoice === 'wrong' ? 'another-order' : 'order', salesInvoiceId: invoice, invoiceCode: invoice, orderCode: 'SO-01', deliveryAddress: 'Địa chỉ', eligible: true, items: [{ orderItemId: invoice, variantId: 'variant', sku: invoice, productName: 'Lavabo', orderedQty: 10, issuedQty: 1, remainingQty: invoice === 'second' ? 2 : 4, heldQty: 0, availableQty: 8 }] } })
  }
  const render = async () => act(async () => root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(MemoryRouter, null, React.createElement(CreateDeliveryDialog, { orderId: 'order', onClose() {} })))))
  const select = async (id: string) => {
    await act(async () => { const input = document.querySelector<HTMLSelectElement>('#issue-invoice')!; input.value = id; input.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
  }
  try {
    await render()
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
    assert.ok(paths.includes('/api/v1/fulfillment/orders/order/delivery-invoices'))
    assert.equal(document.querySelector('option[value="draft"]'), null)
    assert.equal(document.querySelector('option[value="other"]'), null)
    await select('wrong')
    assert.match(document.body.textContent!, /không khớp với đơn hàng/); assert.equal(document.querySelector('form'), null)
    await select('first')
    await act(async () => {
      const input = document.querySelector<HTMLInputElement>('#issue-recipient')!
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, 'Người nhận hóa đơn một')
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    })
    await select('second')
    assert.equal(document.querySelector<HTMLInputElement>('#issue-recipient')!.value, '')
    assert.equal(document.querySelector<HTMLInputElement>('input[type="number"]')!.max, '2')
    assert.ok(paths.filter((path) => !path.endsWith('/delivery-invoices') && !path.startsWith('/api/v1/sales/orders/')).every((path) => path.includes('/fulfillment/sales-invoices/')))
    assert.ok(!paths.some((path) => path.includes('/fulfillment/orders/') && !path.endsWith('/delivery-invoices')))
  } finally { await act(async () => root.unmount()); store.dispatch(baseApi.util.resetApiState()); globalThis.fetch = originalFetch }
})

test('invoice list failure can retry and an order without issued invoices cannot create a delivery', async () => {
  const originalFetch = globalThis.fetch
  const store = configureStore({ reducer: { api: baseApi.reducer }, middleware: (g) => g().concat(baseApi.middleware) })
  const root = createRoot(document.getElementById('root')!)
  const paths: string[] = []
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init); const path = new URL(request.url).pathname
    if (path === '/api/v1/sales/orders/order') return Response.json({ data: { orderId: 'order' } })
    paths.push(path)
    return paths.length === 1 ? Response.json({ message: 'Không tải được hóa đơn' }, { status: 503 }) : Response.json({ data: [] })
  }
  const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
  try {
    await act(async () => root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(MemoryRouter, null, React.createElement(CreateDeliveryDialog, { orderId: 'order', onClose() {} })))))
    await flush()
    assert.match(document.body.textContent!, /Không tải được hóa đơn/)
    assert.equal(document.querySelector<HTMLSelectElement>('#issue-invoice')!.disabled, true)
    await act(async () => Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Thử tải lại hóa đơn')!.click())
    await flush()
    assert.match(document.body.textContent!, /Đơn chưa có hóa đơn đã phát hành/)
    assert.equal(document.querySelector('form'), null)
    assert.deepEqual(paths, Array(2).fill('/api/v1/fulfillment/orders/order/delivery-invoices'))
  } finally { await act(async () => root.unmount()); store.dispatch(baseApi.util.resetApiState()); globalThis.fetch = originalFetch }
})
