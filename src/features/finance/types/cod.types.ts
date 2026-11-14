export type CodStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'
export interface CodCollection {
  collectionId: string; deliveryId: string; orderId: string; customerId: string; shipperId: string
  amount: number; status: CodStatus; collectedAt: string; submittedAt: string
  reviewedBy?: string; reviewedAt?: string; rejectReason?: string; note?: string; version: number
}
export interface CodPage { items: CodCollection[]; page: number; size: number; totalElements: number; totalPages: number }
export interface CodFilters { shipperId?: string; orderId?: string; status?: string; page: number; size: number }
export interface CodClaim { deliveryId: string; amount: number; collectedAt: string; note: string; idempotencyKey: string }
export interface CodBalance { orderId: string; storeOutstanding: number; shipperHeld: number; customerCollectible: number; pendingClaimAmount: number }
