import { normalizeApiError } from '../../../shared/api/apiError.ts'

const controlClass = 'inline-flex h-10 items-center justify-center rounded-control border px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent disabled:cursor-not-allowed disabled:opacity-50'
export const bundleButtonClass = `${controlClass} border-aqs-border bg-aqs-surface text-aqs-ink hover:border-slate-300 hover:bg-aqs-surface-subtle`
export const bundlePrimaryClass = `${controlClass} border-aqs-accent bg-aqs-accent font-semibold text-white hover:bg-aqs-accent-hover`
export const bundleDangerClass = `${controlClass} border-aqs-danger bg-aqs-danger font-semibold text-white hover:bg-aqs-danger-hover`
export const publicationLabels = { DRAFT: 'Bản nháp', PUBLISHED: 'Đã công bố', UNPUBLISHED: 'Ngừng công bố' }
export function bundleMoney(value: number | null | undefined): string {
  return value == null ? 'Chưa xác định' : `${value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ₫`
}
export function localDateInput(iso?: string | null, exclusiveEnd = false): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (exclusiveEnd && date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0 && date.getMilliseconds() === 0) date.setDate(date.getDate() - 1)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
export function bundleError(error: unknown) {
  const result = normalizeApiError(error)
  const messages: Record<string, string> = {
    CATALOG_BUNDLE_003: 'Combo đã được người khác thay đổi. Tải lại dữ liệu mới trước khi tiếp tục.',
    CATALOG_BUNDLE_006: 'Trạng thái combo không cho phép thao tác. Hãy tải lại; cần ngừng công bố trước khi sửa.',
    DB_001: 'Mã combo đã tồn tại hoặc dữ liệu tham chiếu không hợp lệ.',
    AUTH_002: 'Bạn không có quyền quản lý combo.',
    SYS_004: 'Combo không còn tồn tại hoặc đã bị xóa.',
  }
  return { ...result, message: messages[result.code ?? ''] ?? result.message,
    uncertain: result.status == null || result.status === 'FETCH_ERROR' || result.status === 'TIMEOUT_ERROR' || result.status === 'PARSING_ERROR' || (typeof result.status === 'number' && result.status >= 500),
    stale: result.code === 'CATALOG_BUNDLE_003' || result.code === 'CATALOG_BUNDLE_006' || result.status === 404,
    forbidden: result.status === 403,
  }
}
