export type CodReviewStatus = 'SUBMITTED' | 'ACCEPTED' | 'REJECTED'
export interface CodCollection {
  collectionId: string; deliveryId: string; deliveryCode: string; orderId: string; customerId: string; shipperId: string
  expectedAmount: number; amount: number; reviewStatus: CodReviewStatus; collectedAt: string; submittedAt: string
  reviewedBy?: string; reviewedAt?: string; rejectReason?: string; note?: string; version: number
  remittedAmount: number; heldAmount: number; remittanceStatus: string | null
}
export interface CodPage { items: CodCollection[]; page: number; size: number; totalElements: number; totalPages: number }
export interface CodFilters { shipperId?: string; orderId?: string; status?: string; page: number; size: number }
export interface CodClaim { deliveryId: string; amount: number; collectedAt: string; note: string; idempotencyKey: string }
export interface CodRemit {
  idempotencyKey: string; shipperId: string; amount: number; note: string
  items: { collectionId: string; amount: number; expectedVersion: number }[]
}
export interface CodReceipt {
  remittanceId: string; shipperId: string; receivedBy: string; receivedAt: string; amount: number; note?: string
  items: { collectionId: string; orderId: string; transactionId: string; amount: number }[]
}
export interface CodBalance { orderId: string; storeOutstanding: number; shipperHeld: number; customerCollectible: number; pendingClaimAmount: number }
