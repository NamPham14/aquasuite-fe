import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { brandApi } from '../src/features/catalog/api/brandApi.ts'
import { categoryApi } from '../src/features/catalog/api/categoryApi.ts'
import {
  getCatalogErrorState,
  translateImportJobReason,
} from '../src/features/catalog/lib/catalogError.ts'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function createStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(baseApi.middleware),
  })
}

test('Brand import API: template, submit, progress and report contracts', async () => {
  const requests: { url: string; method: string }[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({
      url: request.url,
      method: request.method,
    })

    // Template download
    if (request.url.endsWith('/api/v1/brands/import-template')) {
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=Brand_Import_Template.xlsx',
        },
      })
    }

    // Submit job
    if (request.url.endsWith('/api/v1/brands/import-jobs') && request.method === 'POST') {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'Accepted',
          data: { jobId: 'job-1234', status: 'QUEUED' },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Progress
    if (request.url.includes('/api/v1/brands/import-jobs/job-1234') && !request.url.endsWith('/error-report')) {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: {
            jobId: 'job-1234',
            status: 'COMPLETED',
            totalRows: 10,
            processedRows: 10,
            createdRows: 8,
            skippedRows: 1,
            errorRows: 1,
            percentage: 100,
            message: 'COMPLETED',
            startedAt: '2026-11-02T10:00:00Z',
            finishedAt: '2026-11-02T10:00:02Z',
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Error report
    if (request.url.endsWith('/api/v1/brands/import-jobs/job-1234/error-report')) {
      return new Response(new Uint8Array([4, 5, 6]), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=Brand_Import_Report.xlsx',
        },
      })
    }

    return new Response(JSON.stringify({ success: false, code: 'SYS_004', message: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const store = createStore()

  // 1. Tải template
  const templateBlob = await store.dispatch(brandApi.endpoints.downloadBrandImportTemplate.initiate()).unwrap()
  assert.ok(templateBlob instanceof Blob || typeof templateBlob === 'object')
  assert.match(requests[0]!.url, /\/api\/v1\/brands\/import-template$/)
  assert.equal(requests[0]!.method, 'GET')

  // 2. Submit file job
  const formData = new FormData()
  const fileBlob = new Blob(['test content'])
  formData.append('file', fileBlob, 'test.xlsx')
  const submitResult = await store.dispatch(brandApi.endpoints.submitBrandImportJob.initiate(formData)).unwrap()
  assert.equal(submitResult.jobId, 'job-1234')
  assert.equal(submitResult.status, 'QUEUED')
  assert.match(requests[1]!.url, /\/api\/v1\/brands\/import-jobs$/)
  assert.equal(requests[1]!.method, 'POST')

  // 3. Tra cứu tiến độ (Progress)
  const progressResult = await store.dispatch(brandApi.endpoints.getBrandImportProgress.initiate('job-1234')).unwrap()
  assert.equal(progressResult.jobId, 'job-1234')
  assert.equal(progressResult.status, 'COMPLETED')
  assert.equal(progressResult.totalRows, 10)
  assert.equal(progressResult.createdRows, 8)
  assert.equal(progressResult.skippedRows, 1)
  assert.equal(progressResult.errorRows, 1)
  assert.equal(progressResult.percentage, 100)
  assert.match(requests[2]!.url, /\/api\/v1\/brands\/import-jobs\/job-1234$/)

  // 4. Tải báo cáo
  const reportBlob = await store.dispatch(brandApi.endpoints.downloadBrandImportReport.initiate('job-1234')).unwrap()
  assert.ok(reportBlob instanceof Blob || typeof reportBlob === 'object')
  assert.match(requests[3]!.url, /\/api\/v1\/brands\/import-jobs\/job-1234\/error-report$/)
})

test('Category import API: template, submit, progress and report contracts', async () => {
  const requests: { url: string; method: string }[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    requests.push({
      url: request.url,
      method: request.method,
    })

    // Template download
    if (request.url.endsWith('/api/v1/catalog/categories/import-template')) {
      return new Response(new Uint8Array([7, 8, 9]), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=Category_Import_Template.xlsx',
        },
      })
    }

    // Submit job
    if (request.url.endsWith('/api/v1/catalog/categories/import-jobs') && request.method === 'POST') {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'Accepted',
          data: { jobId: 'cat-job-5678', status: 'QUEUED' },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Progress
    if (request.url.includes('/api/v1/catalog/categories/import-jobs/cat-job-5678') && !request.url.endsWith('/error-report')) {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'OK',
          data: {
            jobId: 'cat-job-5678',
            status: 'COMPLETED_WITH_ERRORS',
            totalRows: 25,
            processedRows: 25,
            createdRows: 20,
            skippedRows: 3,
            errorRows: 2,
            percentage: 100,
            message: 'COMPLETED_WITH_ERRORS',
            startedAt: '2026-11-02T10:05:00Z',
            finishedAt: '2026-11-02T10:05:05Z',
          },
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Error report
    if (request.url.endsWith('/api/v1/catalog/categories/import-jobs/cat-job-5678/error-report')) {
      return new Response(new Uint8Array([10, 11, 12]), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=Category_Import_Report.xlsx',
        },
      })
    }

    return new Response(JSON.stringify({ success: false, code: 'SYS_004', message: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch

  const store = createStore()

  // 1. Tải template Category
  const templateBlob = await store.dispatch(categoryApi.endpoints.downloadCategoryImportTemplate.initiate()).unwrap()
  assert.ok(templateBlob instanceof Blob || typeof templateBlob === 'object')
  assert.match(requests[0]!.url, /\/api\/v1\/catalog\/categories\/import-template$/)
  assert.equal(requests[0]!.method, 'GET')

  // 2. Submit Category file job
  const formData = new FormData()
  const fileBlob = new Blob(['category test content'])
  formData.append('file', fileBlob, 'categories.xlsx')
  const submitResult = await store.dispatch(categoryApi.endpoints.submitCategoryImportJob.initiate(formData)).unwrap()
  assert.equal(submitResult.jobId, 'cat-job-5678')
  assert.equal(submitResult.status, 'QUEUED')
  assert.match(requests[1]!.url, /\/api\/v1\/catalog\/categories\/import-jobs$/)
  assert.equal(requests[1]!.method, 'POST')

  // 3. Tra cứu tiến độ (Progress)
  const progressResult = await store.dispatch(categoryApi.endpoints.getCategoryImportProgress.initiate('cat-job-5678')).unwrap()
  assert.equal(progressResult.jobId, 'cat-job-5678')
  assert.equal(progressResult.status, 'COMPLETED_WITH_ERRORS')
  assert.equal(progressResult.totalRows, 25)
  assert.equal(progressResult.createdRows, 20)
  assert.equal(progressResult.skippedRows, 3)
  assert.equal(progressResult.errorRows, 2)
  assert.equal(progressResult.percentage, 100)
  assert.match(requests[2]!.url, /\/api\/v1\/catalog\/categories\/import-jobs\/cat-job-5678$/)

  // 4. Tải báo cáo lỗi
  const reportBlob = await store.dispatch(categoryApi.endpoints.downloadCategoryImportReport.initiate('cat-job-5678')).unwrap()
  assert.ok(reportBlob instanceof Blob || typeof reportBlob === 'object')
  assert.match(requests[3]!.url, /\/api\/v1\/catalog\/categories\/import-jobs\/cat-job-5678\/error-report$/)
})

test('Brand & Category import error codes and reasons are properly mapped', () => {
  const brandErr1 = getCatalogErrorState({ status: 409, data: { code: 'BRIMP_001', message: 'Report is not ready' } })
  assert.equal(brandErr1.message, 'Báo cáo chưa sẵn sàng do tiến trình chưa kết thúc.')

  const brandErr2 = getCatalogErrorState({ status: 413, data: { code: 'BRIMP_002', message: 'Brand workbook exceeds 5 MiB' } })
  assert.equal(brandErr2.message, 'Dung lượng file vượt quá giới hạn 5 MiB.')

  const brandErr3 = getCatalogErrorState({ status: 503, data: { code: 'BRIMP_003', message: 'Brand import storage is unavailable' } })
  assert.equal(brandErr3.message, 'Dịch vụ import thương hiệu tạm thời không khả dụng, vui lòng thử lại sau.')

  const catErr1 = getCatalogErrorState({ status: 409, data: { code: 'CATIMP_001', message: 'Report is not ready' } })
  assert.equal(catErr1.message, 'Báo cáo chưa sẵn sàng do tiến trình chưa kết thúc.')

  const catErr2 = getCatalogErrorState({ status: 413, data: { code: 'CATIMP_002', message: 'Category workbook exceeds 5 MiB' } })
  assert.equal(catErr2.message, 'Dung lượng file vượt quá giới hạn 5 MiB.')

  const catErr3 = getCatalogErrorState({ status: 503, data: { code: 'CATIMP_003', message: 'Category import storage is unavailable' } })
  assert.equal(catErr3.message, 'Dịch vụ import danh mục tạm thời không khả dụng, vui lòng thử lại sau.')

  assert.equal(translateImportJobReason('INVALID_FILE'), 'File Excel không đúng định dạng hoặc bị hỏng.')
  assert.equal(translateImportJobReason('INVALID_HEADER'), 'Dòng tiêu đề (header) trong file Excel không đúng quy định.')
  assert.equal(translateImportJobReason('EMPTY_DATA'), 'File Excel không có dòng dữ liệu nào.')
  assert.equal(translateImportJobReason('ROW_LIMIT'), 'Số lượng dòng dữ liệu vượt quá giới hạn 10.000 dòng.')
  assert.equal(translateImportJobReason('PROCESSING_FAILED'), 'Đã xảy ra lỗi trong quá trình xử lý dữ liệu.')
})
