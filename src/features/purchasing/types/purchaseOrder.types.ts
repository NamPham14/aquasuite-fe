import type { PageParams } from '../../../shared/api/types'

export type PurchaseOrderStatus =
  | 'DRAFT'
  | 'QUOTED'
  | 'CONFIRMED'
  | 'PARTIALLY_RECEIVED'
  | 'COMPLETED'
  | 'CANCELLED'

export type PurchaseOrderStageStatus = 'PENDING' | 'SETTLED' | 'CANCELLED'
export type PurchaseOrderDeliveryType = 'SINGLE' | 'STAGED'
export type RollbackRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface CreatePurchaseOrderStageRequest {
  stageId?: string
  stageName: string
  description?: string
  expectedDeliveryDate: string
  percent: number
  amount: number
  sortOrder?: number
}

export interface SettleStageRequest {
  actualAmount: number
  paidAt?: string
  paymentMethod: string
  paymentReference?: string
  note?: string
}

export interface StageRollbackRequest {
  requestReason: string
}

export interface ReviewRollbackRequest {
  approved: boolean
  reviewNote?: string
}

export interface ReopenPoRequest {
  reopenReason: string
}

export interface CloseShortPoRequest {
  closeReason: string
}

export interface StageRollbackRequestResponse {
  rollbackId: string
  stageId: string
  purchaseOrderId: string
  requestedBy: string
  requestedByName?: string
  requestedAt: string
  requestReason: string
  status: RollbackRequestStatus
  reviewedBy?: string
  reviewedByName?: string
  reviewedAt?: string
  reviewNote?: string
  createdAt: string
}

export interface PurchaseOrderStageResponse {
  stageId: string
  purchaseOrderId: string
  stageName: string
  description?: string
  expectedDeliveryDate: string
  percent: number
  amount: number
  status: PurchaseOrderStageStatus
  actualAmount?: number | null
  paidAt?: string | null
  paidBy?: string | null
  paidByName?: string | null
  paymentMethod?: string | null
  paymentReference?: string | null
  settlementNote?: string | null
  sortOrder: number
  version: number
  hasPendingRollback?: boolean
  latestRollbackRequest?: StageRollbackRequestResponse | null
}

export interface CreatePurchaseOrderItemRequest {
  variantId: string
  quantity: number
}

export interface CreatePurchaseOrderRequest {
  supplierId: string
  warehouseId?: string
  warehouseCode?: string
  expectedDate?: string
  note?: string
  deliveryPlanType?: PurchaseOrderDeliveryType
  stages?: CreatePurchaseOrderStageRequest[]
  items: CreatePurchaseOrderItemRequest[]
}

export interface UpdatePurchaseOrderItemRequest {
  variantId: string
  quantity: number
  unitCost?: number | null
}

export interface UpdatePurchaseOrderRequest {
  expectedDate?: string
  note?: string
  deliveryPlanType?: PurchaseOrderDeliveryType
  stages?: CreatePurchaseOrderStageRequest[]
  version: number
  items: UpdatePurchaseOrderItemRequest[]
}

export interface CancelPurchaseOrderRequest {
  cancelReason: string
}

export interface ClosePurchaseOrderRequest {
  closeReason: string
}

export interface PurchaseOrderItemResponse {
  poItemId: string
  variantId: string
  sku: string
  productName: string
  unit: string
  quantity: number
  receivedQty: number
  remainingQty: number
  unitCost?: number | null
  lineTotal?: number | null
  sortOrder: number
  lastSupplyPrice?: number | null
}

export interface PurchaseOrderReceiptItemResponse {
  goodsReceiptId: string
  receiptCode: string
  status: string
  receiptDate: string
  supplierInvoiceNo?: string
  totalAmount: number
  confirmedAt?: string
}

export interface PurchaseOrderResponse {
  purchaseOrderId: string
  poCode: string
  supplierId: string
  supplierName?: string
  supplierCode?: string
  supplierPhone?: string
  warehouseId?: string
  warehouseCode?: string
  status: PurchaseOrderStatus
  orderDate: string
  expectedDate?: string
  totalAmount: number
  paidAmount?: number
  deliveryPlanType?: PurchaseOrderDeliveryType
  isShortClosed?: boolean
  reopenedBy?: string
  reopenedByName?: string
  reopenedAt?: string
  reopenReason?: string
  totalStages?: number
  settledStages?: number
  note?: string
  createdBy: string
  createdByName?: string
  confirmedBy?: string
  confirmedByName?: string
  confirmedAt?: string
  cancelledBy?: string
  cancelledByName?: string
  cancelledAt?: string
  cancelReason?: string
  closedBy?: string
  closedByName?: string
  closedAt?: string
  closeReason?: string
  version: number
  createdAt: string
  updatedAt: string
  items: PurchaseOrderItemResponse[]
  receipts: PurchaseOrderReceiptItemResponse[]
  stages?: PurchaseOrderStageResponse[]
}

export interface PurchaseOrderListItemResponse {
  purchaseOrderId: string
  poCode: string
  supplierId: string
  supplierName?: string
  supplierCode?: string
  warehouseCode?: string
  status: PurchaseOrderStatus
  orderDate: string
  expectedDate?: string
  totalAmount: number
  paidAmount?: number
  deliveryPlanType?: PurchaseOrderDeliveryType
  isShortClosed?: boolean
  totalStages?: number
  settledStages?: number
  totalItems: number
  createdByName?: string
  createdAt: string
}

export interface PurchaseOrderFilterParams extends PageParams {
  search?: string
  supplierId?: string
  status?: PurchaseOrderStatus | ''
  fromDate?: string
  toDate?: string
}

export interface LowStockSuggestionResponse {
  variantId: string
  sku: string
  productName: string
  unit: string
  onHandQty: number
  availableQty: number
  minimumQty: number
  maximumQty?: number
  incomingQty: number
  suggestedQty?: number
  lastSupplyPrice?: number
}

export interface SupplierItemOptionResponse {
  variantId: string
  sku: string
  productName: string
  unit: string
  lastSupplyPrice?: number
  suppliedBySupplier: boolean
}

export interface SupplierOptionResponse {
  supplierId: string
  supplierCode: string
  supplierName: string
  contactName?: string
  phone?: string
  email?: string
  address?: string
}
