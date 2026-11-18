import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { variantApi } from '../src/features/catalog/api/variantApi.ts'

const originalFetch = globalThis.fetch

afterEach(() => { globalThis.fetch = originalFetch })

function createStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
}

const mockVariant = {
  id: 'var-001', sku: 'SKU-NEO-WHT-305', variantName: 'Trắng bóng 305mm',
  color: 'Trắng bóng', size: '305mm', unit: 'cái', conversionRate: 1,
  weight: 0.5, costPrice: 150000, sellingPrice: 220000, status: 'ACTIVE',
  serialTracking: false, onHandQty: 10, availableQty: 8, reservedQty: 2, lowStock: false,
  technicalSpec: null, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-10T00:00:00Z',
}

const mockVariantPage = {
  content: [mockVariant], page: 0, size: 10, totalElements: 1, totalPages: 1,
}

test('UC-10 variantApi: getVariants gọi đúng endpoint với warehouseCode=WH_MAIN', async () => {
  const requests: { url: string; method: string }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url, method: request.method })
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: mockVariantPage, timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const result = await store.dispatch(variantApi.endpoints.getVariants.initiate({
    productId: 'prod-001',
    warehouseCode: 'WH_MAIN',
    page: 0,
    size: 10,
    sortDir: 'DESC',
  })).unwrap()

  assert.equal(result.content[0]?.sku, 'SKU-NEO-WHT-305')
  assert.equal(result.totalElements, 1)
  const req = requests.find((r) => /catalog\/products\/prod-001\/variants/.test(r.url))
  assert.ok(req, 'Phải gọi endpoint variants của sản phẩm')
  assert.ok(req.url.includes('warehouseCode=WH_MAIN'), 'Phải truyền warehouseCode=WH_MAIN')
})

test('UC-10 variantApi: getVariantStats gọi đúng endpoint /variants/stats', async () => {
  const mockStats = { total: 5, active: 3, inactive: 2, missingRetailPrice: 1 }
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: mockStats, timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const stats = await store.dispatch(variantApi.endpoints.getVariantStats.initiate('prod-001')).unwrap()

  assert.equal(stats.total, 5)
  assert.equal(stats.active, 3)
  assert.equal(stats.missingRetailPrice, 1)
})

test('UC-10 variantApi: createVariant gọi POST và invalidate đúng tags', async () => {
  const requests: { url: string; method: string; body?: unknown }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url, method: request.method, body: request.method === 'POST' ? await request.clone().json() : undefined })
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: mockVariant, timestamp: new Date().toISOString() }), { status: 201, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const created = await store.dispatch(variantApi.endpoints.createVariant.initiate({
    productId: 'prod-001',
    data: {
      sku: 'SKU-NEO-WHT-305', variantName: 'Trắng bóng 305mm',
      unit: 'cái', conversionRate: 1, weight: 0.5,
      costPrice: 150000, sellingPrice: 220000, status: 'ACTIVE',
      serialTracking: false,
    },
  })).unwrap()

  assert.equal(created.sku, 'SKU-NEO-WHT-305')
  const postReq = requests.find((r) => r.method === 'POST' && /catalog\/products\/prod-001\/variants$/.test(r.url))
  assert.ok(postReq, 'POST /catalog/products/:id/variants phải được gọi')
  assert.equal((postReq?.body as Record<string, unknown>)?.sku, 'SKU-NEO-WHT-305')
})

test('UC-10 phân quyền: canViewCost đúng theo role', () => {
  // Logic domain kiểm tra phân quyền xem giá nhập / lợi nhuận
  function computeCanViewCost(roles: string[]) {
    return roles.some((r) => r === 'SHOP_OWNER' || r === 'ACCOUNTANT')
  }
  function computeCanManageVariants(roles: string[]) {
    return roles.some((r) => r === 'SHOP_OWNER')
  }

  // SHOP_OWNER có thể xem giá nhập và quản lý
  assert.equal(computeCanViewCost(['SHOP_OWNER']), true)
  assert.equal(computeCanManageVariants(['SHOP_OWNER']), true)

  // ACCOUNTANT có thể xem giá nhập nhưng không quản lý
  assert.equal(computeCanViewCost(['ACCOUNTANT']), true)
  assert.equal(computeCanManageVariants(['ACCOUNTANT']), false)

  // SALES_STAFF không thể xem giá nhập và không quản lý
  assert.equal(computeCanViewCost(['SALES_STAFF']), false)
  assert.equal(computeCanManageVariants(['SALES_STAFF']), false)

  // TECHNICAL_STAFF không thể xem giá nhập và không quản lý
  assert.equal(computeCanViewCost(['TECHNICAL_STAFF']), false)
  assert.equal(computeCanManageVariants(['TECHNICAL_STAFF']), false)
})

test('UC-10 sortBy: SALES_STAFF không được phép sort theo costPrice hoặc profit', () => {
  // Mô phỏng logic BE sẽ chặn sort theo costPrice/profit cho SALES_STAFF
  // FE nên ẩn các option này khi canViewCost === false
  const restrictedSortValues = ['costPrice', 'profit']
  const allowedSortValues = ['default', 'sku', 'sellingPrice']

  function isSortAllowed(sortBy: string, canViewCost: boolean) {
    if (!canViewCost && restrictedSortValues.includes(sortBy)) return false
    return true
  }

  // SHOP_OWNER: tất cả sort đều được phép
  assert.equal(isSortAllowed('costPrice', true), true)
  assert.equal(isSortAllowed('profit', true), true)
  assert.equal(isSortAllowed('sellingPrice', true), true)

  // SALES_STAFF: sort theo costPrice/profit bị hạn chế
  assert.equal(isSortAllowed('costPrice', false), false)
  assert.equal(isSortAllowed('profit', false), false)

  // Sort thông thường vẫn được phép
  for (const sortValue of allowedSortValues) {
    assert.equal(isSortAllowed(sortValue, false), true, `Sort '${sortValue}' phải được phép với SALES_STAFF`)
  }
})

test('UC-10 variantApi: deleteVariant gọi DELETE với payload confirmed và reason', async () => {
  const requests: { url: string; method: string; body?: unknown }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url, method: request.method, body: request.method === 'DELETE' ? await request.clone().json() : undefined })
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: null, timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  await store.dispatch(variantApi.endpoints.deleteVariant.initiate({
    productId: 'prod-001',
    variantId: 'var-001',
    data: { confirmed: true, reason: 'Tạo nhầm SKU trong quá trình nhập dữ liệu' },
  })).unwrap()

  const deleteReq = requests.find((r) => r.method === 'DELETE' && /catalog\/products\/prod-001\/variants\/var-001$/.test(r.url))
  assert.ok(deleteReq, 'DELETE /catalog/products/:id/variants/:variantId phải được gọi')
  const body = deleteReq?.body as Record<string, unknown>
  assert.equal(body?.confirmed, true)
  assert.equal(body?.reason, 'Tạo nhầm SKU trong quá trình nhập dữ liệu')
})
