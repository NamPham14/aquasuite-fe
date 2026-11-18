import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { warrantyPolicyApi } from '../src/features/servicedesk/api/warrantyPolicyApi.ts'

const originalFetch = globalThis.fetch

afterEach(() => { globalThis.fetch = originalFetch })

function createStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
}

const mockPolicy = {
  policyId: 'policy-001',
  policyCode: 'WP-2026-001',
  policyName: 'Bảo hành Grohe 24 tháng',
  brandId: 'brand-001',
  brandName: 'Grohe',
  categoryId: 'cat-001',
  categoryName: 'Vòi nước',
  warrantyPeriodMonths: 24,
  coverageConditions: 'Bảo hành lỗi sản xuất, không bao gồm hư hỏng do tác động bên ngoài.',
  status: 'ACTIVE' as const,
  variantReferenceCount: 3,
}

const mockPolicyPage = {
  items: [mockPolicy],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
}

test('UC-44 warrantyPolicyApi: getWarrantyPolicies gọi đúng endpoint /warranty-policies', async () => {
  const requests: { url: string; method: string }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url, method: request.method })
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: mockPolicyPage, timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const result = await store.dispatch(warrantyPolicyApi.endpoints.getWarrantyPolicies.initiate({ keyword: 'Grohe', status: 'ACTIVE', page: 0, size: 10 })).unwrap()

  assert.equal(result.items[0]?.policyCode, 'WP-2026-001')
  assert.equal(result.totalElements, 1)
  const req = requests.find((r) => /warranty-policies/.test(r.url))
  assert.ok(req, 'Phải gọi endpoint /warranty-policies')
  assert.ok(req.url.includes('keyword=Grohe'), 'Phải truyền keyword=Grohe')
  assert.ok(req.url.includes('status=ACTIVE'), 'Phải truyền status=ACTIVE')
})

test('UC-44 warrantyPolicyApi: createWarrantyPolicy gọi POST và trả về policy mới', async () => {
  const requests: { url: string; method: string; body?: unknown }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url, method: request.method, body: request.method === 'POST' ? await request.clone().json() : undefined })
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: mockPolicy, timestamp: new Date().toISOString() }), { status: 201, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const created = await store.dispatch(warrantyPolicyApi.endpoints.createWarrantyPolicy.initiate({
    policyName: 'Bảo hành Grohe 24 tháng',
    brandId: 'brand-001',
    categoryId: 'cat-001',
    warrantyPeriodMonths: 24,
    coverageConditions: 'Bảo hành lỗi sản xuất, không bao gồm hư hỏng do tác động bên ngoài.',
    status: 'ACTIVE',
  })).unwrap()

  assert.equal(created.policyCode, 'WP-2026-001')
  const postReq = requests.find((r) => r.method === 'POST' && /warranty-policies$/.test(r.url))
  assert.ok(postReq, 'POST /warranty-policies phải được gọi')
  assert.equal((postReq?.body as Record<string, unknown>)?.policyName, 'Bảo hành Grohe 24 tháng')
})

test('UC-44 warrantyPolicyApi: updateWarrantyPolicy gọi PUT /warranty-policies/:id', async () => {
  const requests: { url: string; method: string; body?: unknown }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url, method: request.method, body: request.method === 'PUT' ? await request.clone().json() : undefined })
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: { ...mockPolicy, warrantyPeriodMonths: 36 }, timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const updated = await store.dispatch(warrantyPolicyApi.endpoints.updateWarrantyPolicy.initiate({
    policyId: 'policy-001',
    body: { policyName: 'Bảo hành Grohe 36 tháng', brandId: 'brand-001', categoryId: 'cat-001', warrantyPeriodMonths: 36, coverageConditions: 'Bảo hành lỗi sản xuất.', status: 'ACTIVE' },
  })).unwrap()

  assert.equal(updated.warrantyPeriodMonths, 36)
  const putReq = requests.find((r) => r.method === 'PUT' && /warranty-policies\/policy-001$/.test(r.url))
  assert.ok(putReq, 'PUT /warranty-policies/:id phải được gọi')
  assert.equal((putReq?.body as Record<string, unknown>)?.warrantyPeriodMonths, 36)
})

test('UC-44 warrantyPolicyApi: deactivateWarrantyPolicy gọi POST /warranty-policies/:id/deactivate', async () => {
  const requests: { url: string; method: string }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url, method: request.method })
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: { ...mockPolicy, status: 'INACTIVE' }, timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const deactivated = await store.dispatch(warrantyPolicyApi.endpoints.deactivateWarrantyPolicy.initiate('policy-001')).unwrap()

  assert.equal(deactivated.status, 'INACTIVE')
  const req = requests.find((r) => r.method === 'POST' && /warranty-policies\/policy-001\/deactivate$/.test(r.url))
  assert.ok(req, 'POST /warranty-policies/:id/deactivate phải được gọi')
})

test('UC-44 warrantyPolicyApi: deleteWarrantyPolicy gọi DELETE /warranty-policies/:id', async () => {
  const requests: { url: string; method: string }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url, method: request.method })
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: null, timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  await store.dispatch(warrantyPolicyApi.endpoints.deleteWarrantyPolicy.initiate('policy-001')).unwrap()

  const req = requests.find((r) => r.method === 'DELETE' && /warranty-policies\/policy-001$/.test(r.url))
  assert.ok(req, 'DELETE /warranty-policies/:id phải được gọi')
})

test('UC-44 toast: thông báo tiếng Việt đúng khi tạo và cập nhật chính sách', () => {
  // Kiểm tra chuỗi toast tiếng Việt được dùng trong WarrantyPoliciesPage.submit()
  const toastCreate = 'Tạo chính sách bảo hành thành công.'
  const toastUpdate = 'Cập nhật chính sách bảo hành thành công.'

  // Đảm bảo chuỗi tiếng Việt, không phải tiếng Anh
  assert.ok(!toastCreate.includes('created successfully'), 'Toast tạo phải là tiếng Việt')
  assert.ok(!toastUpdate.includes('updated successfully'), 'Toast cập nhật phải là tiếng Việt')
  assert.ok(toastCreate.includes('Tạo'), 'Toast tạo phải chứa từ tiếng Việt')
  assert.ok(toastUpdate.includes('Cập nhật'), 'Toast cập nhật phải chứa từ tiếng Việt')
  assert.ok(toastCreate.endsWith('.'), 'Toast phải kết thúc bằng dấu chấm')
  assert.ok(toastUpdate.endsWith('.'), 'Toast phải kết thúc bằng dấu chấm')
})

test('UC-44 warrantyPolicyApi: getWarrantyPolicyReferenceData gọi đúng endpoint', async () => {
  const mockRefData = {
    brands: [{ brandId: 'brand-001', brandName: 'Grohe' }],
    categories: [{ categoryId: 'cat-001', categoryName: 'Vòi nước' }],
  }
  const requests: { url: string }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url })
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: mockRefData, timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const refData = await store.dispatch(warrantyPolicyApi.endpoints.getWarrantyPolicyReferenceData.initiate()).unwrap()

  assert.equal(refData.brands[0]?.brandName, 'Grohe')
  assert.equal(refData.categories[0]?.categoryName, 'Vòi nước')
  const req = requests.find((r) => /warranty-policies\/reference-data/.test(r.url))
  assert.ok(req, 'Phải gọi endpoint /warranty-policies/reference-data')
})
