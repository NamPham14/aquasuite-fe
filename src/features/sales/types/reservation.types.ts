import type { DepositPaymentSummary } from './deposit.types'

export interface ReservationOrderSummary {
  orderId: string; orderCode: string; customerName: string; orderStatus: string; totalAmount: number
  payment?: DepositPaymentSummary
  depositStatus?: 'AWAITING_DEPOSIT' | 'SATISFIED'
}
export interface ReservationOrder extends ReservationOrderSummary {
  items: { orderItemId: string; variantId: string | null; sku: string; productName: string; variantName: string; quantity: number; comboId: string | null }[]
}
export interface ReservationRequest {
  requestId: string; warehouseCode: string; lines: { orderItemId: string; quantity: number }[]
}
export interface ReservationView {
  orderId: string; reservationRequested: boolean; reservationValue: number; payment: DepositPaymentSummary
  status: string; depositStatus: string; allocationStatus: string; allocationErrorCode: string | null
  warehouseCode: string | null; allocationId: string | null; lines: ReservationRequest['lines']
  lineStatuses: { orderItemId: string; requestedQty: number; heldQty: number; waitingQty: number; status: string }[]
}
export interface OrderReceipt {
  transactionId: string; transactionCode: string; amount: number; paymentMethod: string; status: string
  referenceNo: string | null; rejectReason: string | null
}
export interface ReservationOrderPage {
  content: ReservationOrderSummary[]; totalPages: number; totalElements: number
}
