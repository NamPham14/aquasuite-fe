import type { FieldErrorDetail } from './types'

export interface ApiError {
  status?: number | string
  originalStatus?: number
  code?: string
  message: string
  errors?: FieldErrorDetail[]
  details?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readFieldErrors(value: unknown): FieldErrorDetail[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter((item): item is FieldErrorDetail =>
    isRecord(item) && typeof item.field === 'string' && typeof item.message === 'string',
  )
}

/** Normalizes RTK Query errors without assuming the response body is JSON. */
export function normalizeApiError(error: unknown): ApiError {
  if (isRecord(error) && (typeof error.status === 'number' || typeof error.status === 'string')) {
    const payload = isRecord(error.data) ? error.data : undefined
    const status = error.status
    let fallback = 'Đã xảy ra lỗi khi gọi API.'
    if (status === 'FETCH_ERROR') fallback = 'Không thể kết nối đến máy chủ.'
    else if (status === 'TIMEOUT_ERROR') fallback = 'Yêu cầu đã hết thời gian chờ.'
    else if (status === 'PARSING_ERROR') fallback = 'Không thể xử lý phản hồi từ máy chủ.'

    return {
      status,
      originalStatus: typeof error.originalStatus === 'number' ? error.originalStatus : undefined,
      code: typeof payload?.code === 'string' ? payload.code : undefined,
      message: typeof payload?.message === 'string' && payload.message.trim() ? payload.message : fallback,
      errors: readFieldErrors(payload?.errors),
      details: error.data,
    }
  }

  if (error instanceof Error && error.message) return { message: error.message }
  return { message: 'Đã xảy ra lỗi không xác định.' }
}
