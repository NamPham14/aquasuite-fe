import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { inboundTrackingApi } from '../src/features/inventory/api/inboundTrackingApi.ts'

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

function mockJson(payload: unknown, requests: { url: string; method: string }[]) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: req.url, method: req.method })
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch
}

test('getInventoryInboundKpi gọi GET /inventory/inbound-tracking/kpi-overview và bóc tách data', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    {
      data: {
        totalSkus: 3,
        needOrderCount: 1,
        incomingSkuCount: 1,
        totalIncomingQty: 20,
        openPoCount: 1,
        overduePoCount: 0,
        reservedSkuCount: 2,
        totalReservedQty: 12,
      },
    },
    requests,
  )

  const res = await store
    .dispatch(inboundTrackingApi.endpoints.getInventoryInboundKpi.initiate())
    .unwrap()

  assert.equal(requests.length, 1)
  assert.match(requests[0].url, /\/inventory\/inbound-tracking\/kpi-overview$/)
  assert.equal(res.needOrderCount, 1)
  assert.equal(res.totalIncomingQty, 20)
})

test('getInventoryInboundSummaries truyền danh sách variantIds và trả map theo variantId', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    {
      data: {
        'var-1': {
          variantId: 'var-1',
          incomingQty: 20,
          openPoCount: 1,
          nearestExpectedDate: '2026-11-29',
          hasOverduePo: false,
          suggestedOrderQty: 0,
          restockActionHint: 'INCOMING_COVERED',
        },
      },
    },
    requests,
  )

  const res = await store
    .dispatch(inboundTrackingApi.endpoints.getInventoryInboundSummaries.initiate(['var-1', 'var-2']))
    .unwrap()

  assert.match(requests[0].url, /\/inventory\/inbound-tracking\/summaries\?/)
  assert.match(requests[0].url, /variantIds=var-1/)
  assert.match(requests[0].url, /variantIds=var-2/)
  assert.equal(res['var-1'].restockActionHint, 'INCOMING_COVERED')
  assert.equal(res['var-1'].incomingQty, 20)
})

test('getVariantPurchaseOrders gọi đúng URL và bóc tách danh sách PO đang chờ nhập', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    {
      data: {
        variantId: 'var-1',
        onHandQty: 136,
        reservedQty: 8,
        availableQty: 128,
        minimumQty: 130,
        incomingQty: 20,
        projectedAvailableQty: 148,
        openPoCount: 1,
        hasOverduePo: false,
        purchaseOrders: [
          {
            purchaseOrderId: 'po-1',
            purchaseOrderItemId: 'poi-1',
            poCode: 'PO-2611-004',
            status: 'PARTIALLY_RECEIVED',
            statusLabel: 'Nhận một phần',
            orderedQty: 26,
            receivedQty: 6,
            remainingQty: 20,
            overdue: false,
            progressPercent: 23,
            receipts: [],
          },
        ],
      },
    },
    requests,
  )

  const res = await store
    .dispatch(
      inboundTrackingApi.endpoints.getVariantPurchaseOrders.initiate({
        variantId: 'var-1',
        includeCompleted: true,
      }),
    )
    .unwrap()

  assert.match(
    requests[0].url,
    /\/inventory\/inbound-tracking\/variants\/var-1\/purchase-orders\?includeCompleted=true$/,
  )
  assert.equal(res.projectedAvailableQty, 148)
  assert.equal(res.purchaseOrders[0].poCode, 'PO-2611-004')
})

test('getReadableStockMovements gửi group, phân trang 0-based và chuyển sang PageResponse', async () => {
  const store = createStore()
  const requests: { url: string; method: string }[] = []
  mockJson(
    {
      data: {
        content: [
          {
            movementId: 'm-1',
            createdAt: '2026-11-26T13:07:05Z',
            movementType: 'STOCK_DISPATCH',
            movementTypeLabel: 'Xuất kho',
            quantity: -1,
            balanceAfter: 130,
            documentCode: 'ORD-001',
            displayNote: 'Xuất kho giao hàng cho đơn ORD-001',
          },
        ],
        number: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
      },
    },
    requests,
  )

  const res = await store
    .dispatch(
      inboundTrackingApi.endpoints.getReadableStockMovements.initiate({
        variantId: 'var-1',
        group: 'OUTBOUND',
        page: 1,
        size: 20,
      }),
    )
    .unwrap()

  assert.match(requests[0].url, /\/inventory\/inbound-tracking\/variants\/var-1\/movements\?/)
  assert.match(requests[0].url, /group=OUTBOUND/)
  assert.match(requests[0].url, /page=0/)
  assert.equal(res.page, 1)
  assert.equal(res.items[0].displayNote, 'Xuất kho giao hàng cho đơn ORD-001')
})
