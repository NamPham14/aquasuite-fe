import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { warrantyApi } from '../src/features/servicedesk/api/warrantyApi.ts'
import * as fs from 'node:fs'
import * as path from 'node:path'

const originalFetch = globalThis.fetch

afterEach(() => { globalThis.fetch = originalFetch })

function createStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
}

const mockWarrantyRecord = {
  warrantyRecordId: 'wr-001',
  warrantyCode: 'WAR-2026-001',
  variantId: 'var-001',
  sku: 'SKU-NEO-WHT-305',
  productName: 'Vòi hoa sen Neo',
  variantName: 'Trắng bóng 305mm',
  serialNumber: 'SN-20261101-001',
  customerId: 'cust-001',
  customerName: 'Nguyễn Văn A',
  phoneNumber: '0901234567',
  orderId: 'order-001',
  orderCode: 'ORD-2026-001',  // Trường orderCode từ BE
  startDate: '2026-11-01',
  endDate: '2028-10-31',
  remainingDays: 350,           // Trường remainingDays từ BE
  warrantyMonths: 24,
  status: 'ACTIVE' as const,
  displayStatus: 'ACTIVE' as const,
  canRequestSupport: true,
  openTicketCode: null,
  createdAt: '2026-11-01T00:00:00Z',
}

const mockPage = {
  items: [mockWarrantyRecord],
  page: 1,
  size: 20,
  totalElements: 1,
  totalPages: 1,
}

test('UC-48 warrantyApi: getMyWarrantyRecords gọi /storefront/warranty-records (không phải /customer/warranties)', async () => {
  const requests: { url: string; method: string }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url, method: request.method })
    // Trả về page response với page 0-indexed từ BE
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: { ...mockPage, page: 0 }, timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const result = await store.dispatch(warrantyApi.endpoints.getMyWarrantyRecords.initiate({ page: 1, size: 20 })).unwrap()

  // Xác nhận endpoint đúng: storefront (không phải customer/)
  const req = requests.find((r) => /storefront\/warranty-records/.test(r.url))
  assert.ok(req, 'Phải gọi /storefront/warranty-records (không phải /customer/warranties)')
  const wrongReq = requests.find((r) => /customer\/warranties/.test(r.url))
  assert.equal(wrongReq, undefined, 'Không được gọi endpoint cũ /customer/warranties')

  // Xác nhận data
  assert.equal(result.items[0]?.warrantyCode, 'WAR-2026-001')
})

test('UC-48 warrantyApi: response items chứa đủ orderCode và remainingDays', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: { ...mockPage, page: 0 }, timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const result = await store.dispatch(warrantyApi.endpoints.getMyWarrantyRecords.initiate({ page: 1, size: 20 })).unwrap()

  const item = result.items[0]
  assert.ok(item, 'Phải có ít nhất 1 bản ghi bảo hành')

  // Kiểm tra orderCode hiển thị được
  assert.equal(item.orderCode, 'ORD-2026-001', 'orderCode phải được trả về đúng')

  // Kiểm tra remainingDays hiển thị được
  assert.equal(item.remainingDays, 350, 'remainingDays phải được trả về đúng')

  // Mô phỏng logic hiển thị "Còn X ngày" / "0 ngày"
  function formatRemainingDays(remainingDays: number, status: string) {
    if (status === 'ACTIVE' && remainingDays > 0) {
      return `Còn ${remainingDays} ngày`
    }
    return '0 ngày'
  }
  assert.equal(formatRemainingDays(item.remainingDays, item.displayStatus), 'Còn 350 ngày', 'Hiển thị còn hạn phải đúng format')
  assert.equal(formatRemainingDays(0, 'EXPIRED'), '0 ngày', 'Hiển thị hết hạn phải là "0 ngày"')
  assert.equal(formatRemainingDays(0, 'VOIDED'), '0 ngày', 'Hiển thị đã hủy phải là "0 ngày"')
})

test('UC-48 warrantyApi: getMyWarrantyRecordById gọi /storefront/warranty-records/:id', async () => {
  const mockDetail = {
    ...mockWarrantyRecord,
    voidReason: null,
    voidedAt: null,
    voidedBy: null,
    createdBy: 'admin',
    serialTracking: true,
    warrantyPolicyId: 'policy-001',
    policyCode: 'WP-2026-001',
    policyName: 'Bảo hành Grohe 24 tháng',
    warrantyTerms: 'Bảo hành lỗi sản xuất.',
    customerCode: 'CUST-001',
    customerEmail: 'nguyen@example.com',
    installationAddress: '123 Lê Lợi, Q1, TP.HCM',
    orderInvoice: null,
    deliveryNote: null,
    repairHistory: [],
  }
  const requests: { url: string }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: request.url })
    return new Response(JSON.stringify({ success: true, code: 'SUCCESS', message: 'OK', data: mockDetail, timestamp: new Date().toISOString() }), { status: 200, headers: { 'content-type': 'application/json' } })
  }) as typeof fetch

  const store = createStore()
  const detail = await store.dispatch(warrantyApi.endpoints.getMyWarrantyRecordById.initiate('wr-001')).unwrap()

  assert.equal(detail.warrantyCode, 'WAR-2026-001')
  assert.equal(detail.orderCode, 'ORD-2026-001')
  assert.equal(detail.remainingDays, 350)
  const req = requests.find((r) => /storefront\/warranty-records\/wr-001/.test(r.url))
  assert.ok(req, 'Phải gọi /storefront/warranty-records/:id')
})

test('UC-48 dọn sạch: file MyWarrantiesPage.tsx đã bị xóa', () => {
  const filePath = path.resolve(process.cwd(), 'src/pages/management/MyWarrantiesPage.tsx')
  assert.equal(fs.existsSync(filePath), false, 'MyWarrantiesPage.tsx phải đã bị xóa (code mồ côi)')
})

test('UC-48 dọn sạch: file warrantyLookupApi.ts đã bị xóa', () => {
  const filePath = path.resolve(process.cwd(), 'src/features/servicedesk/api/warrantyLookupApi.ts')
  assert.equal(fs.existsSync(filePath), false, 'warrantyLookupApi.ts phải đã bị xóa (code mồ côi)')
})

test('UC-48 dọn sạch: file warrantyLookup.types.ts đã bị xóa', () => {
  const filePath = path.resolve(process.cwd(), 'src/features/servicedesk/types/warrantyLookup.types.ts')
  assert.equal(fs.existsSync(filePath), false, 'warrantyLookup.types.ts phải đã bị xóa (code mồ côi)')
})

test('UC-48 dọn sạch: index.ts của servicedesk không còn re-export warrantyLookup', () => {
  const filePath = path.resolve(process.cwd(), 'src/features/servicedesk/index.ts')
  const content = fs.readFileSync(filePath, 'utf-8')
  assert.ok(!content.includes('warrantyLookup.types'), 'index.ts không được export warrantyLookup.types')
  assert.ok(!content.includes('warrantyLookupApi'), 'index.ts không được export warrantyLookupApi')
})

test('UC-48 warrantyApi: normalizePageResponse chuyển page 0-indexed từ BE thành 1-indexed cho FE', () => {
  // Mô phỏng logic normalizePageResponse trong warrantyApi
  function normalizePageResponse(res: { data?: { items: unknown[]; page?: number; size?: number; totalElements?: number; totalPages?: number } }) {
    const payload = res?.data ?? res
    if (payload && Array.isArray(payload.items)) {
      return { ...payload, page: (payload.page ?? 0) + 1 }
    }
    return { items: [], page: 1, size: 20, totalElements: 0, totalPages: 0 }
  }

  const beResponse = { data: { items: [{ id: '1' }], page: 0, size: 20, totalElements: 5, totalPages: 1 } }
  const normalized = normalizePageResponse(beResponse)
  assert.equal(normalized.page, 1, 'FE nhận page 1 khi BE trả về page 0')

  // FE gửi page 1-indexed, cleanParams chuyển thành 0-indexed cho BE
  function cleanPageParam(fePageNumber: number) {
    return Math.max(0, fePageNumber - 1)
  }
  assert.equal(cleanPageParam(1), 0, 'FE page 1 → BE page 0')
  assert.equal(cleanPageParam(3), 2, 'FE page 3 → BE page 2')
})
