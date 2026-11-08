export type DebtStatus = 'NO_CREDIT' | 'WITHIN_TERM' | 'OVERDUE' | 'CREDIT_BLOCKED' | 'BLACKLISTED' | 'BLOCKED'
export type ReminderType = 'UPCOMING' | 'OVERDUE' | 'FINAL'
export type DebtCallResult = 'PROMISED_TO_PAY' | 'NEEDS_REVIEW' | 'NO_ANSWER' | 'NUMBER_UNREACHABLE'

export interface CustomerDebtSummary {
  customerId: string; customerCode: string; customerName: string; phone?: string; companyName?: string; customerType?: string
  creditLimit: number; unbilledCommitment: number; issuedInvoiceReceivable: number; unallocatedAdvanceAmount: number
  outstandingBalance: number; overdueBalance: number; availableCredit: number; nearestDueDate?: string; debtStatus: DebtStatus
}
export interface CustomerDebtPage { content: CustomerDebtSummary[]; page: number; size: number; totalElements: number; totalPages: number }
export interface DebtDashboardStats { totalOutstanding: number; overdueCustomerCount: number; creditBlockedCustomerCount: number }
export interface CustomerDebtProfile {
  customerId: string; customerCode: string; customerName: string; phone?: string; email?: string; customerType?: string; taxCode?: string
  companyName?: string; addresses?: string[]; projects?: string[]; creditLimit?: number; creditTermDays?: number; status: string
}
export interface InvoiceDebt { invoiceId: string; invoiceCode: string; invoiceSymbol?: string; orderId: string; issueDate: string; signedAt?: string; dueDate: string; status: string; totalAmount: number; verifiedPaidAmount: number; outstandingAmount: number }
export interface OrderDebt { orderId: string; orderCode: string; orderChannel?: string; orderStatus: string; paymentStatus: string; dueDate?: string; totalAmount: number; verifiedPaidAmount: number; outstandingAmount: number }
export interface PaymentReceipt { transactionId: string; transactionCode: string; orderId?: string; invoiceId?: string; amount: number; paymentMethod?: string; transactionDate: string; status: string }
export interface UnallocatedReceipt { transactionId: string; transactionCode: string; orderId: string; amount: number; transactionDate: string }
export interface AuditEntry { id: string; actorId?: string; entityType?: string; entityId?: string; action: string; oldData?: Record<string, unknown>; newData?: Record<string, unknown>; reason?: string; createdAt: string }
export interface CustomerDebtDetail { customer: CustomerDebtProfile; summary: CustomerDebtSummary; invoices: InvoiceDebt[]; orders: OrderDebt[]; verifiedReceipts: PaymentReceipt[]; unallocatedOrderReceipts: UnallocatedReceipt[]; unallocatedVerifiedReceiptAmount: number; reminderHistory: AuditEntry[] }
export interface CreditCheckRequest { orderId?: string; orderChannel: string; newOrderAmount: number }
export interface CreditCheckResult { customerId: string; approved: boolean; overrideAllowed: boolean; debtStatus: DebtStatus; reasonCode: string; creditLimit: number; outstandingBalance: number; overdueBalance: number; availableCredit: number }
export interface ReasonRequest { reason: string }
export interface DebtReminderRequest { reminderType: ReminderType }
export interface DebtReminderResult { outstandingBalance: number; emailResult: string; smsResult: string; message: string }
export interface DebtCallRequest { callResult: DebtCallResult; promisedPaymentDate?: string; note?: string }
export interface StatementEmailResult { emailResult: string; message: string }
export interface CreditApprovalGrantRequest { ownerEmail: string; password: string; customerId: string; creditLimit: number; creditTermDays: number }
export interface CreditApprovalGrant { approvalToken: string; expiresAt: string; approvedBy: string }
export interface UpdateCreditProfileRequest { creditLimit: number; creditTermDays: number; approvalToken: string; reason: string }
export interface CustomerCreditProfileResult { customerId: string; creditLimit: number; creditTermDays: number; requestedBy: string; approvedBy: string }
