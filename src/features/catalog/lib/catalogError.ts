import { normalizeApiError } from '../../../shared/api/apiError.ts'

/** Thông báo chung và lỗi từng trường để form catalog trình bày. */
export interface CatalogErrorState {
  message: string
  fields: Record<string, string>
}

const messages: Record<string, string> = {
  CAT_003: 'Mã danh mục không đúng định dạng.',
  CAT_004: 'Mã thương hiệu không đúng định dạng.',
  CAT_005: 'Mã danh mục đã tồn tại.',
  CAT_006: 'Mã thương hiệu đã tồn tại.',
  CAT_007: 'Tên danh mục đã tồn tại trong cùng danh mục cha.',
  CAT_008: 'Tên thương hiệu đã tồn tại.',
  CAT_009: 'Danh mục cha không còn tồn tại.',
  CAT_010: 'Danh mục không thể là cha của chính nó.',
  CAT_011: 'Không thể chọn danh mục con làm cha vì sẽ tạo vòng lặp.',
  CAT_012: 'Cấu trúc danh mục đang xung đột. Vui lòng tải lại và thử lại.',
  CAT_013: 'Không thể xóa danh mục đang có danh mục con.',
  CAT_016: 'Không thể xóa danh mục đang được sản phẩm sử dụng.',
  CAT_017: 'Không thể xóa thương hiệu đang được sản phẩm sử dụng.',
  AUTH_002: 'Tài khoản không có quyền thực hiện thao tác này.',
  BRIMP_001: 'Báo cáo chưa sẵn sàng do tiến trình chưa kết thúc.',
  BRIMP_002: 'Dung lượng file vượt quá giới hạn 5 MiB.',
  BRIMP_003: 'Dịch vụ import thương hiệu tạm thời không khả dụng, vui lòng thử lại sau.',
  CATIMP_001: 'Báo cáo chưa sẵn sàng do tiến trình chưa kết thúc.',
  CATIMP_002: 'Dung lượng file vượt quá giới hạn 5 MiB.',
  CATIMP_003: 'Dịch vụ import danh mục tạm thời không khả dụng, vui lòng thử lại sau.',
}

const jobReasonMessages: Record<string, string> = {
  INVALID_FILE: 'File Excel không đúng định dạng hoặc bị hỏng.',
  INVALID_HEADER: 'Dòng tiêu đề (header) trong file Excel không đúng quy định.',
  EMPTY_DATA: 'File Excel không có dòng dữ liệu nào.',
  ROW_LIMIT: 'Số lượng dòng dữ liệu vượt quá giới hạn 10.000 dòng.',
  PROCESSING_FAILED: 'Đã xảy ra lỗi trong quá trình xử lý dữ liệu.',
}

/** Chuyển mã nguyên nhân thất bại của job import sang tiếng Việt dễ hiểu. */
export function translateImportJobReason(reason?: string | null): string {
  if (!reason) return 'Tiến trình thất bại do lỗi không xác định.'
  return jobReasonMessages[reason] || `Tiến trình thất bại: ${reason}`
}

/** Chuẩn hóa lỗi API và dịch các mã nghiệp vụ catalog thành thông báo cho người dùng. */
export function getCatalogErrorState(error: unknown): CatalogErrorState {
  const normalized = normalizeApiError(error)
  const fields = Object.fromEntries(
    (normalized.errors ?? []).map(({ field, message }) => [field, message]),
  )
  return {
    message: (normalized.code && messages[normalized.code]) || normalized.message,
    fields,
  }
}
