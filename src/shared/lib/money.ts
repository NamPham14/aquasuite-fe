/**
 * Tiện ích định dạng tiền tệ dùng chung cho toàn ứng dụng.
 * Tách riêng để các feature (sales, finance, ...) tái sử dụng thay vì tự viết lại.
 */

/**
 * Định dạng một số thành chuỗi tiền VND theo locale vi-VN.
 * @param value số tiền; nếu null/undefined/NaN sẽ coi là 0
 * @returns chuỗi tiền tệ, ví dụ "1.000.000 ₫"
 */
export function formatVnd(value?: number | null): string {
  const amount = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

/**
 * Định dạng mốc thời gian ISO thành ngày giờ vi-VN ngắn gọn.
 * @param value chuỗi thời gian ISO
 * @returns chuỗi ngày giờ hoặc "-" nếu không hợp lệ
 */
export function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
