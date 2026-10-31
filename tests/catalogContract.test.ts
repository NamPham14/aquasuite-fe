import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { brandApi } from '../src/features/catalog/api/brandApi.ts'
import { categoryApi } from '../src/features/catalog/api/categoryApi.ts'
import { brandSchema } from '../src/features/catalog/schemas/brand.schema.ts'
import { categorySchema } from '../src/features/catalog/schemas/category.schema.ts'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function createStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
}

test('catalog schemas normalize valid codes and enforce BE limits', () => {
  const brand = brandSchema.parse({
    code: ' toto ',
    name: '  TOTO Việt Nam  ',
    description: '  Thiết bị vệ sinh  ',
    status: 'ACTIVE',
  })
  assert.deepEqual(brand, {
    code: 'TOTO',
    name: 'TOTO Việt Nam',
    description: 'Thiết bị vệ sinh',
    status: 'ACTIVE',
  })

  assert.equal(brandSchema.safeParse({ code: 'CAT-109', name: 'Tên', description: '', status: 'ACTIVE' }).success, false)
  assert.equal(brandSchema.safeParse({ code: '_CAT', name: 'Tên', description: '', status: 'ACTIVE' }).success, false)
  assert.equal(brandSchema.safeParse({ code: 'OK', name: 'Tên', description: 'x'.repeat(5001), status: 'ACTIVE' }).success, false)

  const category = categorySchema.parse({
    code: ' cat_109 ',
    name: ' Bồn cầu ',
    description: '',
    status: 'INACTIVE',
    parentId: '',
  })
  assert.equal(category.code, 'CAT_109')
  assert.equal(category.parentId, '')
})

test('brand API uses catalog path, unwraps envelope and sends PUT without immutable code', async () => {
  const requests: { url: string; method: string; body?: unknown }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({
      url: request.url,
      method: request.method,
      body: request.method === 'PUT' ? await request.clone().json() : undefined,
    })
    const data = request.method === 'GET'
      ? { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
      : { id: 'brand-id', code: 'TOTO', name: 'TOTO', description: null, status: 'ACTIVE' }
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'Thành công', data, timestamp: new Date().toISOString() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const store = createStore()
  const list = await store.dispatch(brandApi.endpoints.getBrands.initiate({
    page: 0,
    size: 20,
    sortBy: 'code',
    direction: 'asc',
    search: 'toto',
    status: 'ACTIVE',
  })).unwrap()
  assert.equal(list.page, 0)

  await store.dispatch(brandApi.endpoints.updateBrand.initiate({
    id: 'brand-id',
    data: { name: 'TOTO', description: null, status: 'ACTIVE' },
  })).unwrap()

  assert.match(requests[0]!.url, /\/api\/v1\/catalog\/brands\?/)
  assert.match(requests[0]!.url, /search=toto/)
  assert.equal(requests[1]!.method, 'PUT')
  assert.match(requests[1]!.url, /\/api\/v1\/catalog\/brands\/brand-id$/)
  assert.deepEqual(requests[1]!.body, { name: 'TOTO', description: null, status: 'ACTIVE' })
  assert.equal(Object.hasOwn(requests[1]!.body as object, 'code'), false)
})

test('category options use the active-options contract and unwrap exact record fields', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    assert.match(request.url, /\/api\/v1\/catalog\/categories\/options$/)
    return new Response(JSON.stringify({
      success: true,
      code: 'SUCCESS',
      message: 'Thành công',
      data: [{ categoryId: 'cat-id', categoryCode: 'SANITARY', categoryName: 'Thiết bị vệ sinh' }],
      timestamp: new Date().toISOString(),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const options = await store.dispatch(categoryApi.endpoints.getCategoryOptions.initiate()).unwrap()
  assert.deepEqual(options, [{ categoryId: 'cat-id', categoryCode: 'SANITARY', categoryName: 'Thiết bị vệ sinh' }])
})
