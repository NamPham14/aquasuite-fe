/**
 * Kiểu dữ liệu cho UC-70 — kế toán xác minh/từ chối khoản chuyển khoản đang chờ.
 * Khớp contract backend tại com.aquasuite.ims.module.finance.internal.payload.
 */

/** Một khoản chuyển khoản trong hàng chờ xác minh. */
export interface PaymentVerificationItem {
  transactionId: string
  transactionCode: string
  orderId: string
  customerId?: string | null
  amount: number
  paymentMethod: string
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | string
  referenceNo?: string | null
  description?: string | null
  rejectReason?: string | null
  transactionDate: string
  createdBy?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
}

/** Trang danh sách khoản chờ xác minh. */
export interface PaymentVerificationPage {
  content: PaymentVerificationItem[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
