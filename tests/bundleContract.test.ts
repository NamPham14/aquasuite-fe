import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { bundleApi } from '../src/features/catalog/api/bundleApi.ts'
import { bundleDefinition, bundleSchema } from '../src/features/catalog/schemas/bundle.schema.ts'
import { bundleError, localDateInput } from '../src/features/catalog/lib/bundle.ts'

const uuid = '11111111-1111-4111-8111-111111111111'
const sku = '22222222-2222-4222-8222-222222222222'
const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const valid = { productCode: ' COMBO-BATH-01 ', name: ' Bathroom ', description: '', packagePrice: '95000000.25', validFrom: '', validUntil: '', items: [{ variantId: sku, quantity: 1 }] }
const envelope = (data: unknown) => ({ success: true, data })
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } }) }
function store() { return configureStore({ reducer: { [baseApi.reducerPath]: baseApi.reducer }, middleware: (getDefault) => getDefault().concat(baseApi.middleware) }) }

test('combo validation follows its own BE limits, fixed SKU rules and decimal precision', () => {
  const parsed = bundleSchema.parse(valid)
  assert.equal(parsed.productCode, 'COMBO-BATH-01')
  assert.equal(parsed.name, 'Bathroom')
  assert.equal(bundleSchema.safeParse({ ...valid, productCode: 'a'.repeat(100), name: 'a'.repeat(255), description: 'a'.repeat(10000) }).success, true)
  for (const patch of [{ productCode: 'a'.repeat(101) }, { name: 'a'.repeat(256) }, { items: [] }, { items: [{ variantId: sku, quantity: 0 }] }, { items: [{ variantId: sku, quantity: 1.5 }] }, { items: [{ variantId: sku, quantity: 10001 }] }, { items: [...valid.items, ...valid.items] }, { packagePrice: '0' }, { packagePrice: '99999999999999' }, { packagePrice: '100.001' }, { packagePrice: '-100' }]) {
    assert.equal(bundleSchema.safeParse({ ...valid, ...patch }).success, false, JSON.stringify(patch))
  }
})

test('date-only validity covers whole local days and round-trips the inclusive end date', () => {
  assert.equal(bundleSchema.safeParse({ ...valid, validFrom: '2026-11-01' }).success, false)
  assert.equal(bundleSchema.safeParse({ ...valid, validFrom: '2026-11-02', validUntil: '2026-11-01' }).success, false)
  assert.equal(bundleSchema.safeParse({ ...valid, validFrom: '2026-02-30', validUntil: '2026-03-01' }).success, false)
  assert.equal(bundleSchema.safeParse({ ...valid, validFrom: '2026-11-01T12:00', validUntil: '2026-11-02' }).success, false)
  const body = bundleDefinition(bundleSchema.parse({ ...valid, validFrom: '2026-11-01', validUntil: '2026-11-01' }))
  assert.equal(body.validFrom, new Date(2026, 10, 1).toISOString())
  assert.equal(body.validUntil, new Date(2026, 10, 2).toISOString())
  assert.equal(localDateInput(body.validFrom), '2026-11-01')
  assert.equal(localDateInput(body.validUntil, true), '2026-11-01')
  const monthEnd = bundleDefinition(bundleSchema.parse({ ...valid, validFrom: '2026-12-31', validUntil: '2026-12-31' }))
  assert.equal(monthEnd.validUntil, new Date(2027, 0, 1).toISOString())
  assert.equal(localDateInput(new Date(2026, 10, 1, 12, 30).toISOString(), true), '2026-11-01')
  assert.equal('brandId' in body, false)
  assert.equal('categoryId' in body, false)
  assert.equal(body.description, null)
  assert.equal(body.packagePrice, '95000000.25')
})

test('combo API sends only allowed queries and versioned lifecycle bodies; delete accepts omitted data', async () => {
  const requests: { path: string; method: string; body?: unknown }[] = []
  globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const url = new URL(request.url)
    requests.push({ path: url.pathname + url.search, method: request.method, body: ['POST', 'PUT', 'PATCH'].includes(request.method) ? await request.json() : undefined })
    return json(request.method === 'DELETE' ? { success: true } : envelope(request.method === 'GET' && !url.pathname.endsWith(uuid) ? { items: [], page: 2, size: 20, totalPages: 0, totalElements: 0 } : { bundleId: uuid, version: 4 }))
  }
  const s = store()
  const definition = bundleDefinition(bundleSchema.parse(valid))
  try {
    await s.dispatch(bundleApi.endpoints.getBundles.initiate({ page: 2, size: 20, keyword: 'bath', publicationStatus: 'DRAFT', productStatus: 'ACTIVE' }, { subscribe: false })).unwrap()
    await s.dispatch(bundleApi.endpoints.searchBundleSkus.initiate({ page: 0, size: 10, keyword: 'TOTO' }, { subscribe: false })).unwrap()
    await s.dispatch(bundleApi.endpoints.getBundle.initiate(uuid, { subscribe: false })).unwrap()
    await s.dispatch(bundleApi.endpoints.createBundle.initiate(definition)).unwrap()
    await s.dispatch(bundleApi.endpoints.updateBundle.initiate({ id: uuid, data: { ...definition, expectedVersion: 4 } })).unwrap()
    await s.dispatch(bundleApi.endpoints.changeBundlePublication.initiate({ id: uuid, publicationStatus: 'PUBLISHED', expectedVersion: 4 })).unwrap()
    await s.dispatch(bundleApi.endpoints.changeBundleStatus.initiate({ id: uuid, productStatus: 'INACTIVE', expectedVersion: 4 })).unwrap()
    await s.dispatch(bundleApi.endpoints.deleteBundle.initiate({ id: uuid, expectedVersion: 4 })).unwrap()
    assert.equal(requests[0].path, '/api/v1/catalog/bundle/admin?page=2&size=20&keyword=bath&publicationStatus=DRAFT&productStatus=ACTIVE')
    assert.equal(requests[1].path, '/api/v1/catalog/bundle/admin/skus?page=0&size=10&keyword=TOTO')
    assert.deepEqual(requests[3].body, definition)
    assert.equal(requests[4].method, 'PUT')
    assert.deepEqual(requests[4].body, { ...definition, expectedVersion: 4 })
    assert.deepEqual(requests[5], { path: `/api/v1/catalog/bundle/admin/${uuid}/publication-status`, method: 'PATCH', body: { publicationStatus: 'PUBLISHED', expectedVersion: 4 } })
    assert.deepEqual(requests[6].body, { productStatus: 'INACTIVE', expectedVersion: 4 })
    assert.equal(requests[7].path, `/api/v1/catalog/bundle/admin/${uuid}?expectedVersion=4`)
  } finally { s.dispatch(baseApi.util.resetApiState()) }
})

test('combo errors distinguish stale versions, forbidden access, validation and uncertain write outcomes', () => {
  assert.equal(bundleError({ status: 409, data: { code: 'CATALOG_BUNDLE_003' } }).stale, true)
  assert.equal(bundleError({ status: 403, data: { code: 'AUTH_002' } }).forbidden, true)
  assert.equal(bundleError({ status: 400, data: { code: 'SYS_003' } }).uncertain, false)
  for (const status of ['FETCH_ERROR', 'PARSING_ERROR', 'TIMEOUT_ERROR', 500, 503]) assert.equal(bundleError({ status }).uncertain, true)
  assert.equal(bundleError(new Error('Invalid successful response')).uncertain, true)
})
