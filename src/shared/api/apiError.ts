import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'

export interface ApiError {
  status?: number | string
  message: string
  details?: unknown
}

interface ErrorPayload {
  message?: string
  error?: string
}

export function normalizeApiError(error: unknown): ApiError {
  if (isFetchBaseQueryError(error)) {
    const payload = error.data as ErrorPayload | undefined

    return {
      status: error.status,
      message: payload?.message ?? payload?.error ?? 'Đã xảy ra lỗi khi gọi API.',
      details: error.data,
    }
  }

  if (error instanceof Error) {
    return { message: error.message }
  }

  return { message: 'Đã xảy ra lỗi không xác định.' }
}

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error
}

