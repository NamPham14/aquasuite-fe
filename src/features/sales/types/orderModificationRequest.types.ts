export type OrderModificationRequestType = 'FULL_CANCELLATION' | 'ADDRESS_CHANGE' | 'ITEM_CHANGE'
export type OrderModificationRequestStatus = 'PENDING_REVIEW' | 'PENDING_CANCEL' | 'APPROVED' | 'REJECTED'
export type OrderModificationItemAction = 'REMOVE' | 'REDUCE' | 'SWAP'

export interface OrderModificationRequestItemResponse {
  id: string
  orderItemId: string
  originalVariantId: string
  requestedVariantId?: string | null
  changeAction: OrderModificationItemAction
  originalQuantity: number
  requestedQuantity?: number | null
  unitPriceSnapshot: number
  createdAt: string
}

export interface OrderModificationRequestResponse {
  id: string
  orderId: string
  customerId: string
  requestType: OrderModificationRequestType
  requestStatus: OrderModificationRequestStatus
  customerReason: string
  decisionNote?: string | null
  requestedDeliveryAddress?: string | null
  requestedBy: string
  reviewedBy?: string | null
  reviewedAt?: string | null
  replacementOrderId?: string | null
  originalInvoiceId?: string | null
  resultingInvoiceId?: string | null
  taxResultReference?: string | null
  priceDifference?: number | null
  refundTransactionId?: string | null
  createdAt: string
  updatedAt: string
  items: OrderModificationRequestItemResponse[]
}

export interface ReviewOrderModificationRequest {
  decisionNote: string
}

export interface ApproveOrderModificationRequest {
  decisionNote: string
  requestedDeliveryAddress?: string
  replacementOrderId?: string
}

export interface RecordOrderModificationTaxResultRequest {
  taxResultReference: string
  resultingInvoiceId: string
  replacementOrderId?: string
}

export interface CreateOrderModificationItemPayload {
  orderItemId: string
  changeAction: 'REDUCE' | 'REMOVE' | 'SWAP'
  requestedQuantity?: number
  requestedVariantId?: string
}

export interface CreateOrderModificationRequestPayload {
  orderId: string
  requestType: OrderModificationRequestType
  customerReason: string
  requestedDeliveryAddress?: string
  items?: CreateOrderModificationItemPayload[]
}

export type CreateMyOrderModificationRequestPayload = Omit<CreateOrderModificationRequestPayload, 'orderId'>

export interface CustomerOrderModificationRequestReceipt {
  id: string
  orderId: string
  requestType: OrderModificationRequestType
  requestStatus: OrderModificationRequestStatus
  customerReason: string
  createdAt: string
}
