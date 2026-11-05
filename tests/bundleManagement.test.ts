import assert from 'node:assert/strict'
import { test } from 'node:test'
import { register } from 'node:module'
import type { ComponentProps } from 'react'
import { JSDOM } from 'jsdom'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { authReducer, setCredentials, startSession } from '../src/features/iam/model/authSlice.ts'
import { bundleDefinition, bundleSchema } from '../src/features/catalog/schemas/bundle.schema.ts'
register('./loader.mjs', import.meta.url)
const React = await import('react')
const { createRoot } = await import('react-dom/client')
const { Provider } = await import('react-redux')
const { useBundleManagement } = await import('../src/features/catalog/hooks/useBundleManagement.ts')
const { BundleDialog } = await import('../src/features/catalog/components/BundleDialog.tsx')
const uuid = '11111111-1111-4111-8111-111111111111'
const sku = '22222222-2222-4222-8222-222222222222'
const bundle = { bundleId: uuid, productCode: 'COMBO-01', name: 'Bathroom combo', categoryId: uuid, brandId: null, description: null, productStatus: 'ACTIVE' as const, publicationStatus: 'DRAFT' as const, version: 3, linkedItemsCount: 1, originalTotal: 100, packagePrice: 80, savingAmount: 20, discountPercent: 20, items: [{ bundleItemId: 'item', variantId: sku, sku: 'SKU-01', name: 'Basin', quantity: 1, sellingPrice: 100, sellable: true }], validFrom: null, validUntil: null, createdAt: '', updatedAt: '' }
const definition = bundleDefinition(bundleSchema.parse({ productCode: bundle.productCode, name: bundle.name, description: '', packagePrice: '80', items: [{ variantId: sku, quantity: 1 }], validFrom: '', validUntil: '' }))
function json(data: unknown, status = 200) { return new Response(JSON.stringify(status < 300 ? { success: true, data } : data), { status, headers: { 'content-type': 'application/json' } }) }

async function harness(fetcher: typeof fetch) {
  const originalFetch = globalThis.fetch
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
  Object.defineProperty(globalThis, 'window', { configurable: true, value: dom.window })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: dom.window.document })
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: dom.window.navigator })
  Object.defineProperty(globalThis, 'HTMLElement', { configurable: true, value: dom.window.HTMLElement })
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
  dom.window.HTMLDialogElement.prototype.close = function () { this.open = false }
  globalThis.fetch = fetcher
  const store = configureStore({ reducer: { auth: authReducer, [baseApi.reducerPath]: baseApi.reducer }, middleware: (getDefault) => getDefault().concat(baseApi.middleware) })
  store.dispatch(startSession())
  store.dispatch(setCredentials({ generation: store.getState().auth.sessionGeneration, accessToken: 'test-only', user: { id: 'user', username: 'owner', email: 'owner@example.invalid', roles: ['SHOP_OWNER'] } }))
  let state!: ReturnType<typeof useBundleManagement>
  function Screen() {
    const management = useBundleManagement()
    React.useLayoutEffect(() => { state = management })
    return React.createElement(BundleDialog, { management })
  }
  const root = createRoot(dom.window.document.getElementById('root')!)
  await React.act(async () => { root.render(React.createElement(Provider, { store } as ComponentProps<typeof Provider>, React.createElement(Screen))); await new Promise((resolve) => setTimeout(resolve, 40)) })
  async function run(action: () => unknown) { await React.act(async () => { await action(); await new Promise((resolve) => setTimeout(resolve, 20)) }) }
  return { get state() { return state }, store, dom, run, async cleanup() { await React.act(async () => { root.unmount(); store.dispatch(baseApi.util.resetApiState()) }); dom.window.close(); globalThis.fetch = originalFetch } }
}

function defaultRead(request: Request) {
  const url = new URL(request.url)
  if (url.pathname.endsWith(uuid)) return json(bundle)
  if (url.pathname.endsWith('/options')) return json([])
  if (url.pathname.endsWith('/skus')) return json({ items: [{ variantId: sku, productId: uuid, sku: 'SKU-01', productName: 'Basin', variantName: 'White', sellingPrice: 100 }], page: 0, size: 10, totalPages: 1, totalElements: 1 })
  return json({ items: [bundle], page: 0, size: 20, totalPages: 1, totalElements: 1 })
}

test('cancel does not mutate; confirmation uses fresh version and suppresses duplicate clicks', async () => {
  let writes = 0
  let release!: (value: Response) => void
  let version: unknown
  const h = await harness(async (input) => {
    const request = input as Request
    if (request.method === 'DELETE') { writes++; version = new URL(request.url).searchParams.get('expectedVersion'); return new Promise<Response>((resolve) => { release = resolve }) }
    return defaultRead(request)
  })
  try {
    await h.run(() => h.state.open('delete', { ...bundle, version: 1 }))
    assert.equal(h.state.dialog?.mode, 'delete')
    assert.match(h.dom.window.document.body.textContent ?? '', /Xác nhận xóa combo/)
    await h.run(() => h.state.close())
    assert.equal(writes, 0)
    await h.run(() => h.state.open('delete', bundle))
    let first!: Promise<void>
    await h.run(() => { first = h.state.confirm(); void h.state.confirm() })
    assert.equal(writes, 1)
    assert.equal(version, '3')
    assert.equal(h.state.pending, true)
    assert.equal(h.dom.window.document.querySelector('dialog button')?.hasAttribute('disabled'), true)
    await h.run(async () => { release(json(null)); await first })
    assert.equal(h.state.dialog, null)
  } finally { await h.cleanup() }
})

test('stale write stays locked after failed reload and only fresh detail unlocks it', async () => {
  let writes = 0
  let failDetail = false
  const h = await harness(async (input) => {
    const request = input as Request
    if (request.method === 'PUT') { writes++; return json({ code: 'CATALOG_BUNDLE_003' }, 409) }
    if (request.url.endsWith(uuid) && failDetail) return json({ code: 'SYS_001' }, 500)
    return defaultRead(request)
  })
  try {
    await h.run(() => h.state.open('edit', bundle))
    await h.run(() => h.state.save(definition))
    assert.equal(h.state.blocked, true)
    failDetail = true
    await h.run(() => h.state.reloadDialog())
    assert.equal(h.state.blocked, true)
    await h.run(() => h.state.save(definition))
    assert.equal(writes, 1)
    failDetail = false
    await h.run(() => h.state.reloadDialog())
    assert.equal(h.state.blocked, false)
  } finally { await h.cleanup() }
})

test('network-uncertain create keeps input and blocks repeated POST', async () => {
  let writes = 0
  let optionRequests = 0
  const h = await harness(async (input) => {
    const request = input as Request
    if (request.url.endsWith('/options')) optionRequests++
    if (request.method === 'POST') { writes++; throw new TypeError('Offline') }
    return defaultRead(request)
  })
  try {
    await h.run(() => h.state.createNew())
    assert.equal(h.dom.window.document.getElementById('combo-categoryId'), null)
    assert.equal(h.dom.window.document.getElementById('combo-brandId'), null)
    assert.equal(optionRequests, 0)
    await h.run(() => h.state.save(definition))
    assert.equal(h.state.blocked, true)
    assert.equal(h.state.dialog?.mode, 'create')
    assert.match(h.dom.window.document.body.textContent ?? '', /Không gửi lại/)
    await h.run(() => h.state.save(definition))
    assert.equal(writes, 1)
  } finally { await h.cleanup() }
})

test('forbidden detail closes controls and late responses from another session never open a dialog', async () => {
  let forbidden = true
  let release!: (value: Response) => void
  const h = await harness(async (input) => {
    const request = input as Request
    if (request.url.endsWith(uuid)) return forbidden ? json({ code: 'AUTH_002' }, 403) : new Promise<Response>((resolve) => { release = resolve })
    return defaultRead(request)
  })
  try {
    await h.run(() => h.state.open('view', bundle))
    assert.equal(h.state.forbidden, true)
    assert.equal(h.state.dialog, null)
    forbidden = false
    await h.run(() => h.state.retry())
    let pending!: Promise<void>
    await h.run(() => { pending = h.state.open('view', bundle) })
    await h.run(async () => { h.store.dispatch(startSession()); release(json(bundle)); await pending })
    assert.equal(h.state.dialog, null)
  } finally { await h.cleanup() }
})
