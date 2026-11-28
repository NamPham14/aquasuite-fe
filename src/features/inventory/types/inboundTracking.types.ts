/**
 * Kiểu dữ liệu cho bộ API phụ trợ theo dõi Đơn mua đang về (PO), Phiếu nhập (GRN)
 * và Thẻ kho tường minh trên màn Quản lý Tồn kho (/api/v1/inventory/inbound-tracking/**).
 */

export type RestockActionHint = 'NEED_ORDER' | 'INCOMING_PARTIAL' | 'INCOMING_COVERED' | 'NONE'

export type MovementGroupFilter = 'ALL' | 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT'

export interface InventoryInboundKpiResponse {
  totalSkus: number
  needOrderCount: number
  incomingSkuCount: number
  totalIncomingQty: number
  openPoCount: number
  overduePoCount: number
  reservedSkuCount: number
  totalReservedQty: number
}

export interface VariantInboundSummaryResponse {
  variantId: string
  incomingQty: number
  openPoCount: number
  nearestExpectedDate?: string | null
  hasOverduePo: boolean
  suggestedOrderQty: number
  restockActionHint: RestockActionHint
}

export interface VariantGoodsReceiptBrief {
  goodsReceiptId: string
  receiptCode: string
  receiptDate?: string | null
  confirmedAt?: string | null
  receivedQty: number
  confirmedByName?: string | null
}

export interface PurchaseOrderTrackingItem {
  purchaseOrderId: string
  purchaseOrderItemId: string
  poCode: string
  status: string
  statusLabel: string
  supplierId?: string | null
  supplierCode?: string | null
  supplierName?: string | null
  orderDate?: string | null
  expectedDate?: string | null
  overdue: boolean
  unit?: string | null
  orderedQty: number
  receivedQty: number
  remainingQty: number
  unitCost?: number | null
  progressPercent: number
  receipts: VariantGoodsReceiptBrief[]
}

export interface VariantInboundDetailResponse {
  variantId: string
  onHandQty: number
  reservedQty: number
  availableQty: number
  minimumQty: number
  maximumQty?: number | null
  incomingQty: number
  projectedAvailableQty: number
  openPoCount: number
  hasOverduePo: boolean
  purchaseOrders: PurchaseOrderTrackingItem[]
}

export interface ReadableStockMovementResponse {
  movementId: string
  createdAt: string
  movementType: string
  movementTypeLabel: string
  quantity: number
  balanceAfter: number
  referenceType?: string | null
  documentCode: string
  goodsReceiptId?: string | null
  purchaseOrderId?: string | null
  poCode?: string | null
  poStatus?: string | null
  supplierName?: string | null
  deliveryId?: string | null
  orderId?: string | null
  orderCode?: string | null
  actorId?: string | null
  actorName?: string | null
  displayNote: string
}
