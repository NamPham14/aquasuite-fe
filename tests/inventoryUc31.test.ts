import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { inventoryApi } from '../src/features/inventory/api/inventoryApi.ts'

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

/** Bắt request fetch và trả JSON cố định cho test contract (giống goodsReceiptUc32). */
function mockJson(payload: unknown, requests: { url: string; method: string; body?: unknown }[]) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    const body = req.method !== 'GET' ? await req.clone().json() : undefined
    requests.push({ url: req.url, method: req.method, body })
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch
}

/** Giả lập một trang Spring Data (content/number/size/...) cho endpoint danh sách. */
function springPage(content: unknown[]) {
  return { data: { content, number: 0, size: 10, totalElements: content.length, totalPages: 1 } }
}

test('searchInventory gửi GET đúng query (page 0-based, keyword, status, lowStockOnly, sort)', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(springPage([]), requests as any)

  await store
    .dispatch(inventoryApi.endpoints.searchInventory.initiate({
      keyword: 'TOTO', status: 'LOW_STOCK', lowStockOnly: true,
      page: 2, size: 10, sortBy: 'updatedAt', direction: 'desc',
    }))
    .unwrap()

  assert.equal(requests.length, 1)
  assert.equal(requests[0].method, 'GET')
  const url = requests[0].url
  assert.match(url, /\/inventory\?/)
  assert.match(url, /page=1/) // UI trang 2 -> BE page 1 (0-based)
  assert.match(url, /keyword=TOTO/)
  assert.match(url, /status=LOW_STOCK/)
  assert.match(url, /lowStockOnly=true/)
  assert.match(url, /sort=updatedAt%2Cdesc/)
})

test('searchInventory ánh xạ Spring Page -> PageResponse (content->items, number+1)', async () => {
  const store = createStore()
  const requests: any[] = []
  mockJson(
    {
      data: {
        content: [{
          variantId: 'var-1', sku: 'TOTO-LT4706-W', productName: 'Chậu rửa', unit: 'Cái',
          onHandQty: 5, reservedQty: 0, availableQty: 5, minimumQty: 5, maximumQty: null,
          status: 'LOW_STOCK', lowStock: true,
        }],
        number: 0, size: 10, totalElements: 1, totalPages: 1,
      },
    },
    requests,
  )

  const result = await store
    .dispatch(inventoryApi.endpoints.searchInventory.initiate({ page: 1, size: 10 }))
    .unwrap()

  assert.equal(result.items.length, 1)
  assert.equal(result.page, 1) // number 0 -> page 1
  assert.equal(result.totalElements, 1)
  assert.equal(result.items[0].sku, 'TOTO-LT4706-W')
  assert.equal(result.items[0].status, 'LOW_STOCK')
  assert.equal(result.items[0].lowStock, true)
})

test('getLowStock gọi GET /inventory/low-stock', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(springPage([]), requests as any)

  await store.dispatch(inventoryApi.endpoints.getLowStock.initiate({ page: 1, size: 10 })).unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/inventory\/low-stock\?/)
  assert.equal(requests[0].method, 'GET')
})

test('getInventoryDetail gọi GET /inventory/{id} và bóc tách data', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    { data: { variantId: 'var-1', warehouseCode: 'WH_MAIN', onHandQty: 10, reservedQty: 2, availableQty: 8, minimumQty: 5, maximumQty: 100, isLowStock: false } },
    requests as any,
  )

  const result = await store.dispatch(inventoryApi.endpoints.getInventoryDetail.initiate('var-1')).unwrap()

  assert.match(requests[0].url, /\/inventory\/var-1$/)
  assert.equal(result.availableQty, 8)
  assert.equal(result.isLowStock, false)
})

test('getStockMovements gọi GET đúng URL + phân trang và map Page', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    { data: { content: [{ movementId: 'm-1', inventoryId: 'inv-1', variantId: 'var-1', movementType: 'GOODS_RECEIPT', quantity: 7, balanceAfter: 7, referenceType: 'GOODS_RECEIPT', createdAt: new Date().toISOString() }], number: 0, size: 20, totalElements: 1, totalPages: 1 } },
    requests as any,
  )

  const result = await store
    .dispatch(inventoryApi.endpoints.getStockMovements.initiate({ variantId: 'var-1', page: 1, size: 20 }))
    .unwrap()

  assert.match(requests[0].url, /\/inventory\/var-1\/movements\?/)
  assert.match(requests[0].url, /page=0/)
  assert.match(requests[0].url, /size=20/)
  assert.equal(result.items[0].movementType, 'GOODS_RECEIPT')
  assert.equal(result.items[0].quantity, 7)
})

test('updateThreshold gửi PATCH đúng URL/body và bóc tách data (luồng D)', async () => {
  const store = createStore()
  const requests: { url: string; method: string; body?: unknown }[] = []
  mockJson(
    { data: { variantId: 'var-1', warehouseCode: 'WH_MAIN', onHandQty: 10, reservedQty: 0, availableQty: 10, minimumQty: 12, maximumQty: 100, isLowStock: true } },
    requests,
  )

  const result = await store
    .dispatch(inventoryApi.endpoints.updateThreshold.initiate({ variantId: 'var-1', body: { minimumQty: 12, maximumQty: 100 } }))
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/inventory\/var-1\/threshold$/)
  assert.equal(requests[0].method, 'PATCH')
  assert.equal((requests[0].body as any).minimumQty, 12)
  assert.equal((requests[0].body as any).maximumQty, 100)
  assert.equal(result.minimumQty, 12)
  assert.equal(result.isLowStock, true)
})
