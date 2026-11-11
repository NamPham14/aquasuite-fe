import { normalizeApiError } from '../../../shared/api/apiError.ts'

const controlClass = 'inline-flex min-h-10 items-center justify-center rounded-md border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50'
export const bundleButtonClass = `${controlClass} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`
export const bundlePrimaryClass = `${controlClass} border-sky-700 bg-sky-700 text-white hover:bg-sky-800`
export const bundleDangerClass = `${controlClass} border-rose-700 bg-rose-700 text-white hover:bg-rose-800`
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
