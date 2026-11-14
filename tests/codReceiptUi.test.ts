import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'
import { JSDOM } from 'jsdom'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { authReducer, setCredentials } from '../src/features/iam/model/authSlice.ts'
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
const { CodManagement } = await import('../src/features/finance/components/CodManagement.tsx')
const { CodCollectionDetailDialog } = await import('../src/features/finance/components/CodCollectionDetailDialog.tsx')
const { CodClaimDialog } = await import('../src/features/finance/components/CodClaimDialog.tsx')
const initial = { collectionId: 'one', deliveryId: 'delivery', orderId: 'order', customerId: 'customer', shipperId: 'shipper', amount: 2_000_000, status: 'PENDING', collectedAt: '2026-11-14T09:00:00Z', submittedAt: '2026-11-14T09:05:00Z', version: 0 }
const flush = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 60)) })
const button = (label: string) => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === label)!
const click = (element: HTMLElement) => act(async () => { element.click(); await new Promise(resolve => setTimeout(resolve, 60)) })

async function scenario(role: string, run: (requests: Request[]) => Promise<void>, options: { self?: boolean; uncertain?: boolean; list?: boolean } = {}) {
  const original = globalThis.fetch
  const store = configureStore({ reducer: { api: baseApi.reducer, auth: authReducer }, middleware: g => g().concat(baseApi.middleware) })
  const actor = options.self ? 'shipper' : 'receiver'
  store.dispatch(setCredentials({ user: { id: actor, username: actor, email: 'test@example.com', roles: [role] }, accessToken: 'test', generation: store.getState().auth.sessionGeneration }))
  let record = { ...initial }
  let failed = false
  const requests: Request[] = []
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    assert.doesNotMatch(request.url, /remittances/)
    requests.push(request.clone())
    if (request.method === 'POST') {
      const accept = request.url.endsWith('/accept')
      const payload = await request.json()
      record = { ...record, status: accept ? 'VERIFIED' : 'REJECTED', version: 1, ...{ reviewedAt: '2026-11-14T10:00:00Z', reviewedBy: actor, rejectReason: payload.reason } }
      if (options.uncertain && !failed) { failed = true; return Response.json({ message: 'Response lost' }, { status: 503 }) }
      return Response.json({ data: record })
    }
    if (request.url.endsWith('/balance')) return Response.json({ data: { orderId: 'order', storeOutstanding: record.status === 'VERIFIED' ? 0 : 2_000_000, shipperHeld: record.status === 'PENDING' ? 2_000_000 : 0, customerCollectible: 0, pendingClaimAmount: record.status === 'PENDING' ? 2_000_000 : 0 } })
    if (new URL(request.url).pathname.endsWith('/collections')) return Response.json({ data: { items: [record], page: 0, size: 20, totalElements: 1, totalPages: 1 } })
    return Response.json({ data: record })
  }
  const root = createRoot(document.getElementById('root')!)
  try {
    const component = options.list ? React.createElement(CodManagement) : React.createElement(CodCollectionDetailDialog, { id: 'one', actorId: actor, accountant: ['ACCOUNTANT', 'SHOP_OWNER'].includes(role), canSeeBalance: role !== 'SHIPPER', onClose() {} })
    await act(async () => root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(MemoryRouter, null, component))))
    await flush(); await flush()
    await run(requests)
  } finally { await act(async () => root.unmount()); store.dispatch(baseApi.util.resetApiState()); globalThis.fetch = original }
}

test('accountant and owner can receive actual cash; other roles cannot and no second handover is needed', async () => {
  for (const role of ['ACCOUNTANT', 'SHOP_OWNER', 'SHIPPER', 'SALES_STAFF']) await scenario(role, async requests => {
    const canReceive = ['ACCOUNTANT', 'SHOP_OWNER'].includes(role)
    assert.equal(!!button('Nhận tiền'), canReceive)
    await click(button(canReceive ? 'Nhận tiền' : 'Xem chi tiết'))
    await flush()
    assert.equal(!!button('Xác nhận đã nhận tiền'), canReceive)
    if (!canReceive) return
    assert.equal(button('Xác nhận đã nhận tiền').disabled, true)
    await click(document.querySelector<HTMLInputElement>('input[type="checkbox"]')!)
    await click(button('Xác nhận đã nhận tiền'))
    await flush()
    const posts = requests.filter(r => r.method === 'POST')
    assert.equal(posts.length, 1)
    assert.match(posts[0].url, /one\/accept$/)
    assert.deepEqual(await posts[0].json(), { expectedVersion: 0 })
    assert.match(document.body.textContent!, /Đã nhận tiền/)
    assert.equal(button('Xác nhận đã nhận tiền'), undefined)
    assert.doesNotMatch(document.body.textContent!, /NaN|undefined/)
  }, { list: true })
})

test('rejection needs a reason, does not require claiming cash received, and self receipt is unavailable', async () => {
  await scenario('ACCOUNTANT', async requests => {
    assert.equal(button('Từ chối bàn giao').disabled, true)
    await act(async () => {
      const textarea = document.querySelector('textarea')!
      Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value')!.set!.call(textarea, 'Tiền bàn giao chưa khớp')
      textarea.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
    })
    await click(button('Từ chối bàn giao'))
    await flush()
    const post = requests.find(r => r.method === 'POST')!
    assert.match(post.url, /one\/reject$/)
    assert.deepEqual(await post.json(), { expectedVersion: 0, reason: 'Tiền bàn giao chưa khớp' })
    assert.match(document.body.textContent!, /Đã từ chối/)
  })
  await scenario('SHOP_OWNER', async () => {
    assert.equal(button('Xác nhận đã nhận tiền'), undefined)
    assert.match(document.body.textContent!, /Không được tự xác nhận/)
  }, { self: true })
})

test('lost acceptance response retains the exact decision for safe retry even if detail already becomes verified', async () => {
  await scenario('SHOP_OWNER', async requests => {
    await click(document.querySelector<HTMLInputElement>('input[type="checkbox"]')!)
    await click(button('Xác nhận đã nhận tiền'))
    await flush()
    assert.ok(button('Gửi lại cùng quyết định'))
    assert.equal(document.querySelector<HTMLButtonElement>('button[aria-label="Đóng"]')!.disabled, true)
    await click(button('Gửi lại cùng quyết định'))
    await flush()
    const posts = requests.filter(r => r.method === 'POST')
    assert.equal(posts.length, 2)
    assert.equal(posts[0].url, posts[1].url)
    assert.deepEqual(await posts[0].json(), await posts[1].json())
    assert.equal(button('Gửi lại cùng quyết định'), undefined)
  }, { uncertain: true })
})

test('shipper selects own delivered COD batches, handles loading retry and paging, and retries the frozen claim', async () => {
  const originalFetch = globalThis.fetch, originalFormData = globalThis.FormData
  globalThis.FormData = dom.window.FormData as unknown as typeof FormData
  const store = configureStore({ reducer: { api: baseApi.reducer, auth: authReducer }, middleware: g => g().concat(baseApi.middleware) })
  store.dispatch(setCredentials({ user: { id: 'shipper', username: 'shipper', email: 'test@example.com', roles: ['SHIPPER'] }, accessToken: 'test', generation: store.getState().auth.sessionGeneration }))
  const firstId = '11111111-1111-4111-8111-111111111111', secondId = '22222222-2222-4222-8222-222222222222'
  const claims: unknown[] = []
  let failedList = false, closed = 0
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init)
    if (request.method === 'POST') {
      assert.match(request.url, /finance\/cod\/collections$/)
      claims.push(await request.json())
      return claims.length === 1 ? Response.json({ message: 'Connection lost' }, { status: 503 }) : Response.json({ data: initial })
    }
    const url = new URL(request.url)
    assert.match(url.pathname, /fulfillment\/me\/deliveries$/)
    assert.equal(url.searchParams.get('status'), 'DELIVERED')
    assert.equal(url.searchParams.get('shipperId'), null)
    if (!failedList) { failedList = true; return Response.json({ message: 'Unavailable' }, { status: 503 }) }
    const page = Number(url.searchParams.get('page'))
    const good = { deliveryId: page ? secondId : firstId, deliveryCode: page ? 'DL-SECOND' : 'DL-FIRST', shipperId: 'shipper', deliveryStatus: 'DELIVERED', codRequired: true, codAmount: 100000, recipientName: 'Người nhận', batchNo: 1 }
    return Response.json({ data: { content: [good, { ...good, deliveryId: 'other', shipperId: 'another' }, { ...good, deliveryId: 'no-cod', codRequired: false }, { ...good, deliveryId: 'unfinished', deliveryStatus: 'IN_TRANSIT' }], number: page, totalPages: 2, totalElements: 24 } })
  }
  const root = createRoot(document.getElementById('root')!)
  const choose = (value: string) => act(async () => {
    const select = document.querySelector<HTMLSelectElement>('#cod-delivery')!
    select.value = value; select.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
  })
  const fill = (id: string, value: string) => act(async () => {
    const input = document.querySelector<HTMLInputElement>(id)!
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  })
  const submit = () => act(async () => {
    document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))
    await new Promise(resolve => setTimeout(resolve, 60))
  })
  try {
    await act(async () => root.render(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(CodClaimDialog, { onClose() { closed++ } }))))
    await flush()
    assert.equal(button('Gửi khai thu').disabled, true)
    await click(button('Thử lại')); await flush()
    assert.deepEqual([...document.querySelectorAll<HTMLSelectElement>('#cod-delivery option')].map(o => o.value), ['', firstId])
    await choose(firstId)
    await click(button('Sau')); await flush()
    assert.equal(document.querySelector<HTMLSelectElement>('#cod-delivery')!.value, '')
    await choose(secondId)
    assert.ok(document.querySelector<HTMLInputElement>('#cod-time')!.value)
    await fill('#cod-amount', '90000')
    await fill('#cod-time', new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16))
    await submit()
    assert.equal(claims.length, 0)
    assert.match(document.body.textContent!, /Thời điểm thu không được vượt quá giờ hiện tại 5 phút/)
    await fill('#cod-time', '2026-11-14T09:00')
    await submit()
    assert.equal(closed, 0)
    assert.equal(document.querySelector('#cod-delivery')!.matches(':disabled'), true)
    await submit()
    assert.equal(closed, 1)
    assert.equal(claims.length, 2)
    assert.deepEqual(claims[0], claims[1])
    assert.equal((claims[0] as { deliveryId: string }).deliveryId, secondId)
    assert.equal((claims[0] as { amount: number }).amount, 90000)
    assert.equal((claims[0] as { collectedAt: string }).collectedAt, '2026-11-14T02:00:00.000Z')
  } finally { await act(async () => root.unmount()); store.dispatch(baseApi.util.resetApiState()); globalThis.fetch = originalFetch; globalThis.FormData = originalFormData }
})
