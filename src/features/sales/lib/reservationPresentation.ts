import type { ReservationOrder } from '../types/reservation.types'

const labels: Record<string, string> = {
  CONFIRMED: 'Đã xác nhận', PROCESSING: 'Đang xử lý', COMPLETED: 'Đã thực hiện', CANCELLED: 'Đã hủy',
  NOT_REQUESTED: 'Chưa có yêu cầu', AWAITING_DEPOSIT: 'Chưa đủ cọc', SATISFIED: 'Đã đủ cọc',
  PARTIALLY_PAID: 'Chưa đủ cọc', PENDING_VERIFICATION: 'Chờ xác minh', PENDING: 'Đang chờ xử lý',
  HELD: 'Đang giữ hàng', PARTIALLY_HELD: 'Đã giữ một phần', WAITING_STOCK: 'Chờ hàng',
  RESERVATION_PENDING: 'Chờ phân bổ', FAILED: 'Phân bổ chưa thành công', CONSUMED: 'Đã xuất', RELEASED: 'Đã giải phóng',
  FULL_CANCELLATION: 'Hủy toàn bộ đơn', ITEM_CHANGE: 'Thay đổi dòng hàng', ADDRESS_CHANGE: 'Đổi địa chỉ',
  PENDING_APPROVAL: 'Chờ duyệt hủy/đổi', PENDING_UC26_COMPLETION: 'Chờ hoàn tất hủy/đổi',
  PENDING_RELEASE: 'Chờ giải phóng', NOT_APPLICABLE: 'Không áp dụng', APPROVED: 'Đã duyệt',
  PENDING_REVIEW: 'Chờ duyệt', PENDING_CANCEL: 'Chờ hoàn tất hủy đơn', REJECTED: 'Đã từ chối',
  RESERVE: 'Giữ hàng', RELEASE: 'Giải phóng hàng', CONSUME: 'Xuất hàng',
  VERIFIED: 'Đã xác minh', CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản',
}
export const reservationLabel = (value: string | null | undefined) => value ? labels[value] ?? value : '—'
export type ReservationItems = ReservationOrder['items']
export function reservationProduct(items: ReservationItems, orderItemId: string, variantId?: string) {
  return items.find((item) => item.orderItemId === orderItemId && (!variantId || item.variantId === variantId))
}
