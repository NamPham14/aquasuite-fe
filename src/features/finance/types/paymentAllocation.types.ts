export interface PaymentAllocationReceipt {
  receiptId: string
  receiptCode: string
  orderId: string
  customerId: string
  receiptAmount: number
  allocatedAmount: number
  remainingAmount: number
  paymentMethod: string
  receivedAt: string
}

export interface PaymentAllocationReceiptPage {
  content: PaymentAllocationReceipt[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface PaymentAllocationTarget {
  invoiceId: string
  invoiceCode: string
  invoiceSymbol?: string | null
  issueDate: string
  dueDate?: string | null
  totalAmount: number
  verifiedPaidAmount: number
  outstandingAmount: number
}

export interface PaymentAllocationTargets {
  receiptId: string
  receiptCode: string
  orderId: string
  customerId: string
  receiptAmount: number
  allocatedAmount: number
  remainingAmount: number
  invoices: PaymentAllocationTarget[]
}

export interface PaymentAllocationLine {
  allocationId: string
  allocationRequestId: string
  transactionId: string
  orderId: string
  invoiceId: string
  allocatedAmount: number
  allocationType: 'MANUAL' | 'AUTO_ADVANCE' | 'REPOINTED' | string
  allocationStatus?: 'ACTIVE' | 'REVERSED' | string
  allocatedBy?: string | null
  allocatedAt: string
  reason?: string | null
  reversedBy?: string | null
  reversedAt?: string | null
  reversalReason?: string | null
}

export interface CreatePaymentAllocationRequest {
  allocationRequestId: string
  allocations: { invoiceId: string; allocatedAmount: number }[]
  reason?: string
}

export interface PaymentAllocationBatch {
  allocationRequestId: string
  receiptId: string
  orderId: string
  allocatedAmount: number
  remainingReceiptAmount: number
  allocations: PaymentAllocationLine[]
}
