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
const { AssignmentDialog } = await import('../src/features/fulfillment/components/AssignmentDialog.tsx')

test('picker loads shippers endpoint, keeps selection across pages, searches and assigns selected user', async () => {
  const originalFetch = globalThis.fetch
  const store = configureStore({ reducer: { api: baseApi.reducer }, middleware: (g) => g().concat(baseApi.middleware) })
  const root = createRoot(document.getElementById('root')!)
  const requests: Request[] = []
  let done = 0
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init); requests.push(request.clone()); const url = new URL(request.url)
    if (request.method === 'PUT') return Response.json({ data: [] })
    assert.equal(url.pathname, '/api/v1/iam/users/shippers')
    assert.equal(url.searchParams.get('size'), '20')
    assert.equal(url.searchParams.get('roleId'), null); assert.equal(url.searchParams.get('status'), null)
    const second = url.searchParams.get('page') === '1'
    return Response.json({ data: { content: [{ id: second ? 'shipper-two' : 'shipper-one', username: second ? 'Trần Bình' : 'Nguyễn An', phone: '0901234567', email: 'shipper@example.com', status: 'ACTIVE' }], page: second ? 1 : 0, size: 20, totalElements: 21, totalPages: 2 } })
  }
  const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
  const click = async (text: string) => act(async () => { const b = Array.from(document.querySelectorAll('button')).find((button) => button.textContent === text)!; assert.ok(b, text); b.click() })
  try {
    await act(async () => root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(AssignmentDialog, { deliveryIds: ['one', 'two'], onClose() {}, onDone() { done++ } }))))
    await flush()
    assert.match(document.body.textContent!, /Nguyễn An/)
    assert.equal(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled, true)
    await act(async () => document.querySelector<HTMLInputElement>('input[type="radio"]')!.click())
    await click('Sau'); await flush()
    assert.match(document.body.textContent!, /Trần Bình/); assert.match(document.body.textContent!, /Đã chọn: Nguyễn An/)
    assert.ok(requests.some((r) => new URL(r.url).searchParams.get('page') === '1'))
    await act(async () => {
      const input = document.querySelector<HTMLInputElement>('#assignment-search')!
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, 'An')
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    })
    await click('Tìm kiếm'); await flush()
    assert.ok(requests.some((r) => { const url = new URL(r.url); return url.searchParams.get('keyword') === 'An' && url.searchParams.get('page') === '0' }))
    await act(async () => { document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })) })
    await flush()
    const assignment = requests.find((r) => r.method === 'PUT')!
    assert.deepEqual(await assignment.json(), { shipperId: 'shipper-one', deliveryIds: ['one', 'two'] }); assert.equal(done, 1)
  } finally { await act(async () => root.unmount()); store.dispatch(baseApi.util.resetApiState()); globalThis.fetch = originalFetch }
})

test('picker displays server error and retries; empty results cannot be assigned', async () => {
  const originalFetch = globalThis.fetch
  const store = configureStore({ reducer: { api: baseApi.reducer }, middleware: (g) => g().concat(baseApi.middleware) })
  const root = createRoot(document.getElementById('root')!)
  let calls = 0
  globalThis.fetch = async () => { calls++; return calls === 1 ? Response.json({ message: 'Không tải được shipper' }, { status: 503 }) : Response.json({ data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } }) }
  const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)) })
  try {
    await act(async () => root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(AssignmentDialog, { deliveryIds: ['one'], onClose() {}, onDone() {} }))))
    await flush(); assert.match(document.body.textContent!, /Không tải được shipper/)
    await act(async () => Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'Thử lại')!.click())
    await flush(); assert.match(document.body.textContent!, /Không có shipper đang hoạt động phù hợp/)
    assert.equal(document.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled, true)
  } finally { await act(async () => root.unmount()); store.dispatch(baseApi.util.resetApiState()); globalThis.fetch = originalFetch }
})
