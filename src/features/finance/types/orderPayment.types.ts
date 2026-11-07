/**
 * Kiểu dữ liệu cho UC-23 — Quản lý & theo dõi thanh toán của đơn hàng (module Finance).
 * Khớp contract backend tại com.aquasuite.ims.module.finance.internal.payload.
 */

/** Phương thức ghi nhận tại quầy (UC-23): tiền mặt -> VERIFIED, chuyển khoản -> PENDING. */
export type RecordablePaymentMethod = 'CASH' | 'BANK_TRANSFER'

/** Trạng thái một giao dịch thu tiền. PENDING chờ UC-70 xác minh. */
export type OrderPaymentTxnStatus = 'VERIFIED' | 'PENDING' | 'REJECTED' | string

/** Body gửi lên khi ghi nhận một khoản thanh toán cho đơn. */
export interface RecordOrderPaymentRequest {
  /** Mã chống ghi trùng; gửi lại cùng mã + cùng dữ liệu trả về giao dịch cũ. */
  idempotencyKey: string
  /** Số tiền ghi nhận, > 0 và tối đa 2 chữ số thập phân. */
  amount: number
  /** Tiền mặt hoặc chuyển khoản. */
  paymentMethod: RecordablePaymentMethod
  /** Mã tham chiếu chuyển khoản (nếu có). */
  referenceNo?: string
  /** Ghi chú (nếu có). */
  description?: string
}

/** Một giao dịch thu tiền của đơn (lịch sử thanh toán). */
export interface OrderPaymentResponse {
  transactionId: string
  transactionCode: string
  orderId: string
  invoiceId?: string | null
  amount: number
  paymentMethod: string
  status: OrderPaymentTxnStatus
  referenceNo?: string | null
  description?: string | null
  /** Lý do từ chối (chỉ có khi status = REJECTED, do UC-70 ghi). */
  rejectReason?: string | null
  transactionDate: string
  createdBy?: string | null
}

/** Tổng quan thanh toán toàn đơn (GET /payment-summary). */
export interface OrderPaymentSummaryResponse {
  orderId: string
  totalAmount: number
  verifiedPaid: number
  pendingAmount: number
  remaining: number
  paymentStatus: string
}

/** Tiến độ của một mốc thanh toán theo thỏa thuận (UC-23). */
export interface OrderMilestoneProgress {
  milestoneId: string
  stageName: string
  sortOrder: number
  /** Số tiền theo thỏa thuận của mốc. */
  agreedAmount: number
  /** Số đã xác minh được phân bổ vào mốc này. */
  paidAmount: number
  /** Số còn thiếu của mốc = agreedAmount - paidAmount. */
  remainingAmount: number
}

/** Tổng quan tiến độ theo mốc của đơn (GET /payment-milestones). */
export interface OrderMilestoneProgressResponse {
  orderId: string
  totalAmount: number
  verifiedPaid: number
  pendingAmount: number
  remaining: number
  hasMilestones: boolean
  milestones: OrderMilestoneProgress[]
}
