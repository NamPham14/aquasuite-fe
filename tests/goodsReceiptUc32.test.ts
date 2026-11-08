import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { goodsReceiptApi } from '../src/features/inventory/api/goodsReceiptApi.ts'

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

// Bắt request fetch và trả JSON cố định cho test contract (giống orderPaymentUc23).
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

test('getReceivablePurchaseOrder gọi GET đúng URL và bóc tách data', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    {
      data: {
        purchaseOrderId: 'po-1',
        poCode: 'PO-202611-0001',
        status: 'CONFIRMED',
        receivable: true,
        warehouseCode: 'WH_MAIN',
        supplierId: 'sup-1',
        items: [
          {
            purchaseOrderItemId: 'poi-1',
            variantId: 'var-1',
            sku: 'TOTO-LT4706-W',
            productName: 'Chậu rửa',
            unit: 'Cái',
            unitCost: 1000000,
            quantityOrdered: 10,
            quantityReceived: 0,
            remainingQty: 10,
          },
        ],
      },
    },
    requests as any,
  )

  const result = await store
    .dispatch(goodsReceiptApi.endpoints.getReceivablePurchaseOrder.initiate('po-1'))
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/inventory\/goods-receipts\/receivable\/po-1$/)
  assert.equal(requests[0].method, 'GET')
  assert.equal(result.receivable, true)
  assert.equal(result.warehouseCode, 'WH_MAIN')
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].remainingQty, 10)
})

test('createGoodsReceipt gửi POST đúng URL/body và bóc tách data', async () => {
  const store = createStore()
  const requests: { url: string; method: string; body?: unknown }[] = []
  mockJson(
    {
      data: {
        goodsReceiptId: 'gr-1',
        receiptCode: 'GRN2611080001',
        purchaseOrderId: 'po-1',
        status: 'CONFIRMED',
        receiptDate: '2026-11-08',
        totalAmount: 7000000,
        createdBy: 'user-1',
        createdAt: new Date().toISOString(),
        items: [
          {
            goodsReceiptItemId: 'gri-1',
            purchaseOrderItemId: 'poi-1',
            variantId: 'var-1',
            unit: 'Cái',
            quantity: 7,
            unitCost: 1000000,
            lineTotal: 7000000,
          },
        ],
      },
    },
    requests,
  )

  const result = await store
    .dispatch(
      goodsReceiptApi.endpoints.createGoodsReceipt.initiate({
        purchaseOrderId: 'po-1',
        supplierInvoiceNo: 'HD-2026-001',
        items: [{ purchaseOrderItemId: 'poi-1', quantity: 7 }],
      }),
    )
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/inventory\/goods-receipts$/)
  assert.equal(requests[0].method, 'POST')
  assert.equal((requests[0].body as any).purchaseOrderId, 'po-1')
  assert.equal((requests[0].body as any).supplierInvoiceNo, 'HD-2026-001')
  assert.equal((requests[0].body as any).items[0].quantity, 7)
  assert.equal(result.status, 'CONFIRMED')
  assert.equal(result.receiptCode, 'GRN2611080001')
  assert.equal(result.items?.[0].quantity, 7)
})

test('getGoodsReceiptsByPurchaseOrder gọi GET đúng URL và trả mảng', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    {
      data: [
        {
          goodsReceiptId: 'gr-1',
          receiptCode: 'GRN-1',
          purchaseOrderId: 'po-1',
          status: 'CONFIRMED',
          receiptDate: '2026-11-08',
          totalAmount: 7000000,
          createdBy: 'user-1',
          createdAt: new Date().toISOString(),
        },
      ],
    },
    requests as any,
  )

  const result = await store
    .dispatch(goodsReceiptApi.endpoints.getGoodsReceiptsByPurchaseOrder.initiate('po-1'))
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/inventory\/goods-receipts\/by-purchase-order\/po-1$/)
  assert.equal(result.length, 1)
  assert.equal(result[0].receiptCode, 'GRN-1')
})
