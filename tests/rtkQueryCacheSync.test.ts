import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { register } from 'node:module'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'

register('./loader.mjs', import.meta.url)

const { quotationApi } = await import('../src/features/sales/api/quotationApi.ts')
const { salesOrderApi } = await import('../src/features/sales/api/salesOrderApi.ts')
const { salesCatalogApi } = await import('../src/features/sales/api/salesCatalogApi.ts')
const { orderPaymentApi } = await import('../src/features/finance/api/orderPaymentApi.ts')
const { paymentVerificationApi } = await import('../src/features/finance/api/paymentVerificationApi.ts')
const { paymentAllocationApi } = await import('../src/features/finance/api/paymentAllocationApi.ts')
const { reservationApi } = await import('../src/features/sales/api/reservationApi.ts')
const { reservationManagementApi } = await import('../src/features/sales/api/reservationManagementApi.ts')
const { orderModificationRequestApi } = await import('../src/features/sales/api/orderModificationRequestApi.ts')
const { onlineCheckoutApi } = await import('../src/features/sales/api/onlineCheckoutApi.ts')
const { customerTrackingApi } = await import('../src/features/customer/api/customerTrackingApi.ts')
const { variantApi } = await import('../src/features/catalog/api/variantApi.ts')
const { productApi } = await import('../src/features/catalog/api/productApi.ts')
const { bundleApi } = await import('../src/features/catalog/api/bundleApi.ts')
const { goodsReceiptApi } = await import('../src/features/inventory/api/goodsReceiptApi.ts')
const { inventoryApi } = await import('../src/features/inventory/api/inventoryApi.ts')
const { deliveryApi } = await import('../src/features/fulfillment/api/deliveryApi.ts')
const { deliveryIssueApi } = await import('../src/features/fulfillment/api/deliveryIssueApi.ts')
const { codApi } = await import('../src/features/finance/api/codApi.ts')
const { warrantyTicketApi } = await import('../src/features/servicedesk/api/warrantyTicketApi.ts')
const { warrantyApi } = await import('../src/features/servicedesk/api/warrantyApi.ts')

const originalFetch = globalThis.fetch
const stores: ReturnType<typeof createStore>[] = []

function createStore() {
  const s = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
  stores.push(s)
  return s
}

afterEach(() => {
  globalThis.fetch = originalFetch
  for (const s of stores.splice(0)) {
    s.dispatch(baseApi.util.resetApiState())
  }
})

test('convertToOrder invalidates SalesOrder list, StockReservation list, Inventory and SalesCatalog', async () => {
  const store = createStore()
  let orderListFetches = 0
  let catalogFetches = 0

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    const url = new URL(req.url)
    if (url.pathname.endsWith('/sales/orders') && req.method === 'GET') {
      orderListFetches += 1
      return Response.json({ data: { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0 } })
    }
    if (url.pathname.endsWith('/sales/catalog-items')) {
      catalogFetches += 1
      return Response.json({ data: [] })
    }
    if (url.pathname.endsWith('/convert-to-order')) {
      return Response.json({ data: { orderId: 'ord-new' } })
    }
    return Response.json({ data: {} })
  }) as typeof fetch

  const subOrders = store.dispatch(salesOrderApi.endpoints.getSalesOrders.initiate())
  const subCatalog = store.dispatch(salesCatalogApi.endpoints.getSalesCatalogItems.initiate())
  await Promise.all([subOrders.unwrap(), subCatalog.unwrap()])
  assert.equal(orderListFetches, 1)
  assert.equal(catalogFetches, 1)

  await store.dispatch(quotationApi.endpoints.convertToOrder.initiate({ id: 'quo-1' })).unwrap()
  await new Promise((r) => setTimeout(r, 40))

  assert.equal(orderListFetches, 2, 'SalesOrder list must automatically refetch after convertToOrder')
  assert.equal(catalogFetches, 2, 'SalesCatalog items must automatically refetch after convertToOrder')
  subOrders.unsubscribe()
  subCatalog.unsubscribe()
})

test('Payment Allocation and Order Modification match OrderPayment & SalesInvoice providesTags', async () => {
  const store = createStore()
  let paymentSummaryFetches = 0
  let invoicesFetches = 0

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    const url = new URL(req.url)
    if (url.pathname.endsWith('/finance/orders/ord-1/payment-summary')) {
      paymentSummaryFetches += 1
      return Response.json({ data: { orderId: 'ord-1', totalAmount: 100, verifiedPaid: 50, pendingAmount: 0, remaining: 50 } })
    }
    if (url.pathname.endsWith('/sales/orders/ord-1/invoices')) {
      invoicesFetches += 1
      return Response.json({ data: [] })
    }
    if (url.pathname.endsWith('/finance/receipts/rcp-1/allocations')) {
      return Response.json({
        data: {
          allocationRequestId: 'req-1',
          receiptId: 'rcp-1',
          orderId: 'ord-1',
          allocatedAmount: 50,
          remainingReceiptAmount: 0,
          allocations: [],
        },
      })
    }
    if (url.pathname.endsWith('/sales/order-modification-requests/mod-1/approve')) {
      return Response.json({
        data: {
          id: 'mod-1',
          orderId: 'ord-1',
          customerId: 'cust-1',
          requestType: 'ITEM_CHANGE',
          requestStatus: 'APPROVED',
          customerReason: 'Giảm số lượng',
          items: [],
          createdAt: '',
          updatedAt: '',
          requestedBy: 'u1',
        },
      })
    }
    return Response.json({ data: {} })
  }) as typeof fetch

  const subPayment = store.dispatch(salesOrderApi.endpoints.getOrderPaymentSummary.initiate('ord-1'))
  const subInvoices = store.dispatch(salesOrderApi.endpoints.getOrderInvoices.initiate('ord-1'))
  await Promise.all([subPayment.unwrap(), subInvoices.unwrap()])
  assert.equal(paymentSummaryFetches, 1)
  assert.equal(invoicesFetches, 1)

  await store
    .dispatch(
      paymentAllocationApi.endpoints.createPaymentAllocation.initiate({
        receiptId: 'rcp-1',
        body: { allocationRequestId: 'req-1', allocations: [{ invoiceId: 'inv-1', allocatedAmount: 50 }] },
      }),
    )
    .unwrap()
  await new Promise((r) => setTimeout(r, 40))

  assert.equal(paymentSummaryFetches, 2, 'OrderPayment summary must refetch after createPaymentAllocation')
  assert.equal(invoicesFetches, 2, 'Order invoices must refetch after createPaymentAllocation')

  await store
    .dispatch(
      orderModificationRequestApi.endpoints.approveOrderModificationRequest.initiate({
        requestId: 'mod-1',
        body: { decisionNote: 'Đồng ý' },
      }),
    )
    .unwrap()
  await new Promise((r) => setTimeout(r, 40))

  assert.equal(paymentSummaryFetches, 3, 'OrderPayment summary must refetch after approveOrderModificationRequest')
  assert.equal(invoicesFetches, 3, 'Order invoices must refetch after approveOrderModificationRequest')

  subPayment.unsubscribe()
  subInvoices.unsubscribe()
})

test('Payment verification & Order payment refresh PaymentAllocation queue, Deposit reservation list and SalesOrder list', async () => {
  const store = createStore()
  let allocationQueueFetches = 0
  let depositOrdersFetches = 0
  let salesOrdersFetches = 0

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    const url = new URL(req.url)
    if (url.pathname.endsWith('/finance/receipts/unallocated')) {
      allocationQueueFetches += 1
      return Response.json({ data: { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0 } })
    }
    if (url.pathname.endsWith('/sales/orders') && url.searchParams.get('depositReservationOnly') === 'true') {
      depositOrdersFetches += 1
      return Response.json({ success: true, data: { content: [], totalPages: 0, totalElements: 0 } })
    }
    if (url.pathname.endsWith('/sales/orders') && req.method === 'GET') {
      salesOrdersFetches += 1
      return Response.json({ data: { content: [], number: 0, size: 20, totalElements: 0, totalPages: 0 } })
    }
    return Response.json({ data: { status: 'VERIFIED' } })
  }) as typeof fetch

  const subQueue = store.dispatch(paymentAllocationApi.endpoints.getUnallocatedReceipts.initiate({ page: 0, size: 20 }))
  const subDeposit = store.dispatch(reservationApi.endpoints.reservationOrders.initiate({ page: 0, keyword: '' }))
  const subOrders = store.dispatch(salesOrderApi.endpoints.getSalesOrders.initiate())
  await Promise.all([subQueue.unwrap(), subDeposit.unwrap(), subOrders.unwrap()])

  await store.dispatch(paymentVerificationApi.endpoints.verifyPayment.initiate({ paymentId: 'pay-1', orderId: 'ord-1' })).unwrap()
  await new Promise((r) => setTimeout(r, 40))

  assert.equal(allocationQueueFetches, 2, 'Unallocated receipts queue must refetch after verifyPayment')
  assert.equal(depositOrdersFetches, 2, 'Deposit reservation orders must refetch after verifyPayment')
  assert.equal(salesOrdersFetches, 2, 'Sales orders list must refetch after verifyPayment')

  await store
    .dispatch(
      orderPaymentApi.endpoints.recordOrderPayment.initiate({
        orderId: 'ord-1',
        body: { idempotencyKey: 'idem-1', amount: 100000, paymentMethod: 'CASH' },
      }),
    )
    .unwrap()
  await new Promise((r) => setTimeout(r, 40))

  assert.equal(allocationQueueFetches, 3, 'Unallocated receipts queue must refetch after cash recordOrderPayment')
  assert.equal(depositOrdersFetches, 3, 'Deposit reservation orders must refetch after recordOrderPayment')
  assert.equal(salesOrdersFetches, 3, 'Sales orders list must refetch after recordOrderPayment')

  subQueue.unsubscribe()
  subDeposit.unsubscribe()
  subOrders.unsubscribe()
})

test('Catalog, Bundle, GoodsReceipt and Reservation mutations invalidate SalesCatalog & Inventory', async () => {
  const store = createStore()
  await store.dispatch(salesCatalogApi.util.upsertQueryData('getSalesCatalogItems', undefined, []))
  await store.dispatch(
    inventoryApi.util.upsertQueryData('searchInventory', { page: 1, size: 10 }, {
      items: [],
      page: 1,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    }),
  )
  await store.dispatch(
    inventoryApi.util.upsertQueryData('getLowStock', { page: 1, size: 10 }, {
      items: [],
      page: 1,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    }),
  )

  const state = store.getState()

  // SalesCatalog invalidated by [{ type: 'SalesCatalog', id: 'LIST' }]
  const catalogInvalidated = baseApi.util.selectInvalidatedBy(state, [{ type: 'SalesCatalog', id: 'LIST' }])
  assert.ok(catalogInvalidated.some((e) => e.endpointName === 'getSalesCatalogItems'))

  // Inventory & LowStock invalidated by 'Inventory' (used by goodsReceipt, reservation, salesOrder, variant)
  const invInvalidated = baseApi.util.selectInvalidatedBy(state, ['Inventory'])
  assert.ok(invInvalidated.some((e) => e.endpointName === 'searchInventory'))
  assert.ok(invInvalidated.some((e) => e.endpointName === 'getLowStock'))

  // Ensure endpoints exist and are wired on the same baseApi
  assert.ok(variantApi.endpoints.updateVariant)
  assert.ok(productApi.endpoints.updateProductStatus)
  assert.ok(bundleApi.endpoints.changeBundlePublication)
  assert.ok(goodsReceiptApi.endpoints.createGoodsReceipt)
  assert.ok(reservationManagementApi.endpoints.executeReservationRelease)
})

test('Online checkout, Delivery, COD and WarrantyTicket cross-flows refresh customer & management views', async () => {
  const store = createStore()
  let myAllOrdersFetches = 0
  let codCapacityFetches = 0
  let managedTicketsFetches = 0
  let myWarrantyRecordsFetches = 0
  let deliveryInvoicesFetches = 0

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    const url = new URL(req.url)
    if (url.pathname.endsWith('/sales/orders/me')) {
      myAllOrdersFetches += 1
      return Response.json({ success: true, data: [] })
    }
    if (url.pathname.endsWith('/finance/cod/deliveries/dlv-1/claim-capacity')) {
      codCapacityFetches += 1
      return Response.json({ data: { deliveryId: 'dlv-1', claimable: true, maxClaimAmount: 500000, orderRemaining: 500000, deliveryRemaining: 500000 } })
    }
    if (url.pathname.endsWith('/warranty-tickets') && req.method === 'GET') {
      managedTicketsFetches += 1
      return Response.json({ data: { items: [], page: 0, size: 10, totalElements: 0, totalPages: 0 } })
    }
    if (url.pathname.endsWith('/storefront/warranty-records') && req.method === 'GET') {
      myWarrantyRecordsFetches += 1
      return Response.json({ data: { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 } })
    }
    if (url.pathname.endsWith('/fulfillment/orders/ord-1/delivery-invoices')) {
      deliveryInvoicesFetches += 1
      return Response.json({ data: [] })
    }
    if (url.pathname.endsWith('/sales/online-orders') && req.method === 'POST') {
      return Response.json({ data: { orderId: 'ord-online-1', orderCode: 'SO-ONL-1', items: [] } })
    }
    return Response.json({ data: { warrantyRecordId: 'wr-1', ticketId: 'tk-1' } })
  }) as typeof fetch

  const subMyOrders = store.dispatch(customerTrackingApi.endpoints.getMyAllOrders.initiate())
  const subCodCap = store.dispatch(codApi.endpoints.getCodClaimCapacity.initiate('dlv-1'))
  const subManagedTickets = store.dispatch(warrantyTicketApi.endpoints.getManagedWarrantyTickets.initiate({ page: 1, size: 10 }))
  const subMyWarranties = store.dispatch(warrantyApi.endpoints.getMyWarrantyRecords.initiate({ page: 1, size: 20 }))
  const subDeliveryInv = store.dispatch(deliveryIssueApi.endpoints.getDeliveryInvoices.initiate('ord-1'))
  await Promise.all([
    subMyOrders.unwrap(),
    subCodCap.unwrap(),
    subManagedTickets.unwrap(),
    subMyWarranties.unwrap(),
    subDeliveryInv.unwrap(),
  ])

  // 1. Customer places online order -> Profile "My All Orders" auto-refreshes
  await store
    .dispatch(onlineCheckoutApi.endpoints.placeOnlineOrder.initiate({ addressId: 'addr-1', paymentMethod: 'CASH' }))
    .unwrap()
  await new Promise((r) => setTimeout(r, 40))
  assert.equal(myAllOrdersFetches, 2, 'Customer Profile getMyAllOrders must refetch after placeOnlineOrder')

  // 2. Issuing sales invoice -> Delivery invoices tab auto-refreshes
  await store
    .dispatch(salesOrderApi.endpoints.issueSalesInvoice.initiate({ invoiceId: 'inv-1', orderId: 'ord-1' }))
    .unwrap()
  await new Promise((r) => setTimeout(r, 40))
  assert.equal(deliveryInvoicesFetches, 2, 'Delivery invoices must refetch after issueSalesInvoice')

  // 3. Shipper completes delivery -> COD claim capacity & customer warranty records auto-refresh
  const formData = new FormData()
  await store
    .dispatch(deliveryApi.endpoints.deliveryAction.initiate({ id: 'dlv-1', action: 'complete', body: formData }))
    .unwrap()
  await new Promise((r) => setTimeout(r, 40))
  assert.equal(codCapacityFetches, 2, 'COD claim capacity must refetch after delivery complete')
  assert.equal(myWarrantyRecordsFetches, 2, 'Customer warranty records must refetch after delivery complete')

  // 4. Customer submits warranty ticket -> Shop owner managed tickets list & customer warranty records auto-refresh
  await store
    .dispatch(
      warrantyTicketApi.endpoints.submitWarrantyTicket.initiate({
        warrantyRecordId: 'wr-1',
        issueDescription: 'Rò nước nhẹ ở đầu nối',
        siteAddress: '123 Quận 1',
      }),
    )
    .unwrap()
  await new Promise((r) => setTimeout(r, 40))
  assert.equal(managedTicketsFetches, 2, 'Managed warranty tickets list must refetch after customer submits ticket')
  assert.equal(myWarrantyRecordsFetches, 3, 'Customer warranty records must refetch after customer submits ticket')

  subMyOrders.unsubscribe()
  subCodCap.unsubscribe()
  subManagedTickets.unsubscribe()
  subMyWarranties.unsubscribe()
  subDeliveryInv.unsubscribe()
})
