export interface DeliveryCandidate {
  orderItemId: string; variantId: string; sku: string; productName: string
  orderedQty: number; issuedQty: number; remainingQty: number; heldQty: number; availableQty: number
  serialTracking?: boolean
  dispatchableQty: number
}
export interface DeliveryCandidates {
  orderId: string; orderCode: string; deliveryAddress: string | null; eligible: boolean; items: DeliveryCandidate[]
  salesInvoiceId: string; invoiceCode: string
  maxCodAmount: number
}
export interface DeliveryInvoice {
  invoiceId: string; invoiceCode: string; orderId: string; type: string; status: string
}
export interface CreateDeliveryRequest {
  deliveryId: string; warehouseCode: 'WH_MAIN'; recipientName: string; recipientPhone: string
  deliveryAddress: string; scheduledDate: string | null; codAmount: number; note: string | null
  items: { orderItemId: string; quantity: number }[]
}
export interface DeliveryIssueResult {
  deliveryId: string; deliveryCode: string; orderId: string; batchNo: number
  deliveryStatus: string; confirmedAt: string | null
  salesInvoiceId: string | null
}
