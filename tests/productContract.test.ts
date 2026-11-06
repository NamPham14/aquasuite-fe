import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { productApi } from '../src/features/catalog/api/productApi.ts'
import { productSchema } from '../src/features/catalog/schemas/product.schema.ts'

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

test('product schema validates and normalizes product data according to business rules', () => {
  const valid = productSchema.parse({
    productCode: ' sp-ro-001 ',
    productName: '  Máy lọc nước RO AquaPure 5 lõi  ',
    categoryId: 'cat-uuid-1',
    brandId: 'brand-uuid-1',
    description: '  Mô tả sản phẩm chất lượng cao  ',
    productType: 'NORMAL',
    status: 'DRAFT',
    imageUrls: ['https://example.com/img1.jpg'],
    specifications: { 'Công suất': '50W' },
  })

  assert.equal(valid.productCode, 'SP-RO-001')
  assert.equal(valid.productName, 'Máy lọc nước RO AquaPure 5 lõi')
  assert.equal(valid.categoryId, 'cat-uuid-1')
  assert.equal(valid.brandId, 'brand-uuid-1')
  assert.equal(valid.description, 'Mô tả sản phẩm chất lượng cao')
  assert.equal(valid.productType, 'NORMAL')
  assert.equal(valid.status, 'DRAFT')
  assert.deepEqual(valid.imageUrls, ['https://example.com/img1.jpg'])
  assert.deepEqual(valid.specifications, { 'Công suất': '50W' })

  // Code validation: must be uppercase and start with alphanumeric
  assert.equal(
    productSchema.safeParse({
      productCode: '_INVALID',
      productName: 'Tên',
      categoryId: 'cat-1',
    }).success,
    false,
  )

  // Name validation: required
  assert.equal(
    productSchema.safeParse({
      productCode: 'SP-001',
      productName: '',
      categoryId: 'cat-1',
    }).success,
    false,
  )

  // Category validation: required
  assert.equal(
    productSchema.safeParse({
      productCode: 'SP-001',
      productName: 'Sản phẩm',
      categoryId: '',
    }).success,
    false,
  )
})

test('product API endpoints follow backend contract and unwrap envelope data', async () => {
  const requests: { url: string; method: string; body?: unknown }[] = []

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init)
    const body = request.method !== 'GET' && request.method !== 'DELETE'
      ? await request.clone().json()
      : undefined

    requests.push({
      url: request.url,
      method: request.method,
      body,
    })

    if (request.method === 'GET' && request.url.includes('/catalog/products?')) {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'Lấy danh sách sản phẩm thành công',
          data: {
            content: [
              {
                productId: 'prod-uuid-1',
                productCode: 'SP-RO-001',
                productName: 'Máy lọc nước RO AquaPure',
                categoryId: 'cat-uuid-1',
                categoryName: 'Máy lọc nước',
                brandId: 'brand-uuid-1',
                brandName: 'AquaPure',
                productType: 'NORMAL',
                status: 'ACTIVE',
                primaryImageUrl: 'https://example.com/p1.jpg',
                minSellingPrice: 5000000,
                maxSellingPrice: 6000000,
                totalVariants: 2,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            number: 0,
            size: 20,
            totalElements: 1,
            totalPages: 1,
          },
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (request.method === 'POST' && request.url.endsWith('/catalog/products')) {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'Product created successfully.',
          data: {
            productId: 'new-prod-uuid',
            productCode: 'SP-NEW-001',
            productName: 'Sản phẩm mới',
            category: { categoryId: 'cat-1', categoryCode: 'CAT1', categoryName: 'Danh mục 1' },
            brand: null,
            description: null,
            specifications: {},
            productType: 'NORMAL',
            status: 'DRAFT',
            images: [],
            variants: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (request.method === 'PATCH' && request.url.includes('/status')) {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'Cập nhật trạng thái sản phẩm thành công',
          data: {
            productId: 'prod-uuid-1',
            status: 'DISCONTINUED',
          },
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    if (request.method === 'DELETE') {
      return new Response(
        JSON.stringify({
          success: true,
          code: 'SUCCESS',
          message: 'Xóa sản phẩm thành công',
          data: null,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response('{}', { status: 200 })
  }) as typeof fetch

  const store = createStore()

  // 1. Test getProducts
  const listResult = await store.dispatch(
    productApi.endpoints.getProducts.initiate({
      page: 0,
      size: 20,
      keyword: 'AquaPure',
      categoryId: 'cat-uuid-1',
      status: 'ACTIVE',
    }),
  ).unwrap()

  assert.equal(listResult.items.length, 1)
  assert.equal(listResult.items[0]!.productCode, 'SP-RO-001')
  assert.equal(listResult.totalElements, 1)
  assert.match(requests[0]!.url, /\/api\/v1\/catalog\/products\?/)
  assert.match(requests[0]!.url, /keyword=AquaPure/)

  // 2. Test createProduct
  await store.dispatch(
    productApi.endpoints.createProduct.initiate({
      productCode: 'SP-NEW-001',
      productName: 'Sản phẩm mới',
      categoryId: 'cat-1',
      productType: 'NORMAL',
      status: 'DRAFT',
    }),
  ).unwrap()

  assert.equal(requests[1]!.method, 'POST')
  assert.match(requests[1]!.url, /\/api\/v1\/catalog\/products$/)
  assert.deepEqual(requests[1]!.body, {
    productCode: 'SP-NEW-001',
    productName: 'Sản phẩm mới',
    categoryId: 'cat-1',
    productType: 'NORMAL',
    status: 'DRAFT',
  })

  // 3. Test updateProductStatus
  await store.dispatch(
    productApi.endpoints.updateProductStatus.initiate({
      id: 'prod-uuid-1',
      data: { status: 'DISCONTINUED' },
    }),
  ).unwrap()

  const patchReq = requests.find((r) => r.method === 'PATCH')
  assert.ok(patchReq, 'PATCH request should exist')
  assert.match(patchReq.url, /\/api\/v1\/catalog\/products\/prod-uuid-1\/status$/)
  assert.deepEqual(patchReq.body, { status: 'DISCONTINUED' })

  // 4. Test deleteProduct
  await store.dispatch(
    productApi.endpoints.deleteProduct.initiate('prod-uuid-1'),
  ).unwrap()

  const deleteReq = requests.find((r) => r.method === 'DELETE')
  assert.ok(deleteReq, 'DELETE request should exist')
  assert.match(deleteReq.url, /\/api\/v1\/catalog\/products\/prod-uuid-1$/)
})
