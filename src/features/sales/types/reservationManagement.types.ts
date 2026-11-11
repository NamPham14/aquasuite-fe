export interface StockReservation {
  reservationId: string; orderId: string; orderItemId: string; variantId: string
  warehouseCode: string; requestedQty: number; heldQty: number; consumedQty: number
  releasedQty: number; waitingQty: number; status: string
}
export interface ReservationActivity {
  requestId: string; reservationId: string; action: string; heldBefore: number; heldAfter: number
  actorId: string; reason: string | null; createdAt: string
}
export interface ReservationRelease {
  decisionId: string; orderId: string; executedBy: string; executedAt: string
  lines: { reservationId: string; orderItemId: string; releasedQty: number }[]
}
export interface ReservationDecision {
  decisionId: string; type: string; status: string; requestedBy: string; requestedAt: string
  reason: string | null; reviewedBy: string | null; reviewedAt: string | null; decisionNote: string | null
  releaseStatus: 'PENDING_UC26_COMPLETION' | 'PENDING_APPROVAL' | 'NOT_APPLICABLE' | 'PENDING_RELEASE' | 'COMPLETED'
  release: ReservationRelease | null
}
export interface ReservationHistory {
  orderId: string; reservations: StockReservation[]; activities: ReservationActivity[]; decisions: ReservationDecision[]
  actorNames?: Record<string, string>
}
