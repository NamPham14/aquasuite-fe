import {
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'
import { tokenStorage } from '../lib/tokenStorage.ts'
import { clearAuthLocal, updateAccessToken } from './authActions.ts'
import type { ApiResponse } from './types.ts'
import { getApiBaseUrl } from './apiBaseUrl.ts'

export { getApiBaseUrl } from './apiBaseUrl.ts'

interface AuthStateSlice {
  accessToken: string | null
  sessionGeneration: number
}

interface AppState {
  auth?: AuthStateSlice
}

interface RefreshOutcome {
  success: boolean
  accessToken?: string
  generation: number
}

interface ActiveRefreshState {
  generation: number
  promise: Promise<RefreshOutcome>
}

let activeRefresh: ActiveRefreshState | null = null

/** Xóa tham chiếu refresh đang chạy để cô lập các test; không phải thao tác logout. */
export function _resetActiveRefreshForTesting(): void {
  activeRefresh = null
}

/** Kiểm tra lỗi mạng/dịch vụ tạm thời (không phải lỗi xác thực). */
function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as Record<string, unknown>
  const status = err.status
  return (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 'FETCH_ERROR' ||
    status === 'TIMEOUT_ERROR' ||
    status === 'PARSING_ERROR' ||
    err instanceof TypeError
  )
}

export const rawBaseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
  // Thêm bearer token hiện có trong Redux nếu request chưa đặt Authorization.
  prepareHeaders: (headers, { getState }) => {
    if (!headers.has('authorization')) {
      const token = (getState() as AppState)?.auth?.accessToken
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
    }
    return headers
  },
})

/**
 * BaseQuery riêng cho /auth/refresh: KHÔNG gắn Authorization header.
 * Tránh gửi kèm access token hết hạn lên /auth/refresh khiến
 * BearerTokenAuthenticationFilter chặn 401 trước khi vào controller.
 */
const authRefreshBaseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
})

/** Gửi request, xử lý 401 bằng refresh single-flight và loại phản hồi thuộc phiên cũ. */
export const reauthBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  { isRequestCurrent?: () => boolean }
> = async (args, api, extraOptions) => {
  // Chụp generation và access token trước request đầu tiên.
  const initialAppState = api.getState() as AppState
  const requestGen = initialAppState.auth?.sessionGeneration ?? 0
  const requestAccessToken = initialAppState.auth?.accessToken ?? null

  let result = await rawBaseQuery(args, api, extraOptions)

  // Kiểm tra phiên không đổi hoặc kết thúc trong khi request đang chạy.
  const postRequestGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
  if (postRequestGen !== requestGen || (extraOptions?.isRequestCurrent && !extraOptions.isRequestCurrent())) {
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: 'STALE_SESSION_DISCARDED',
      },
    }
  }

  const requestUrl = typeof args === 'string' ? args : args.url
  const isAuthEndpoint =
    requestUrl.includes('/auth/login') ||
    requestUrl.includes('/auth/refresh') ||
    requestUrl.includes('/auth/logout')

  const handleInactiveAccount = (response: typeof result) => {
    if (response.error?.status === 403 && (response.error.data as { code?: string } | undefined)?.code === 'AUTH_008') {
      tokenStorage.clearRefreshToken()
      api.dispatch(clearAuthLocal())
    }
  }

  if (result.error?.status === 403) {
    handleInactiveAccount(result)
    return result
  }

  if (result.error?.status !== 401 || isAuthEndpoint) {
    return result
  }

  // Trước khi khởi tạo refresh mới, kiểm tra xem một request khác trong cùng generation
  // đã refresh thành công và cập nhật accessToken trong Redux chưa.
  const latestAccessToken = (api.getState() as AppState)?.auth?.accessToken ?? null
  if (latestAccessToken && latestAccessToken !== requestAccessToken) {
    // Access token đã được cập nhật bởi một refresh khác → retry ngay với token mới.
    result = await rawBaseQuery(args, api, extraOptions)
    const postRetryGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
    if (postRetryGen !== requestGen || (extraOptions?.isRequestCurrent && !extraOptions.isRequestCurrent())) {
      return {
        error: {
          status: 'CUSTOM_ERROR',
          error: 'STALE_SESSION_DISCARDED',
        },
      }
    }
    handleInactiveAccount(result)
    return result
  }

  // Các request cùng generation dùng chung một lần làm mới token.
  if (!activeRefresh || activeRefresh.generation !== requestGen) {
    const refreshPromise = (async (): Promise<RefreshOutcome> => {
      try {
        // Đọc refresh token KHÔNG xóa. Token cũ bị ghi đè chỉ khi server xác nhận rotation.
        const refreshToken = tokenStorage.getRefreshToken()
        if (!refreshToken) {
          api.dispatch(clearAuthLocal())
          return { success: false, generation: requestGen }
        }

        // Dùng authRefreshBaseQuery (KHÔNG gắn Authorization header) để tránh
        // BearerTokenAuthenticationFilter chặn 401 do expired access token.
        const refreshResult = await authRefreshBaseQuery(
          {
            url: '/auth/refresh',
            method: 'POST',
            body: { refresh_token: refreshToken },
          },
          api,
          extraOptions,
        )

        // Bỏ phản hồi nếu generation đã đổi trong lúc làm mới.
        const currentGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
        if (currentGen !== requestGen) {
          return { success: false, generation: requestGen }
        }

        if (refreshResult.data) {
          const envelope = refreshResult.data as ApiResponse<{
            access_token: string
            refresh_token: string
            token_type?: string
            expires_in?: number
          }>

          const tokenData = envelope.data
          if (tokenData?.access_token && tokenData?.refresh_token) {
            // Server đã xác nhận rotation → lưu token mới (ghi đè token cũ).
            const saved = tokenStorage.setRefreshToken(tokenData.refresh_token)
            if (!saved) {
              api.dispatch(clearAuthLocal())
              return { success: false, generation: requestGen }
            }

            api.dispatch(
              updateAccessToken({
                accessToken: tokenData.access_token,
                generation: requestGen,
              }),
            )

            return {
              success: true,
              accessToken: tokenData.access_token,
              generation: requestGen,
            }
          }
        }

        // Phân biệt lỗi tạm thời vs lỗi xác thực thực sự.
        if (refreshResult.error && isTransientError(refreshResult.error)) {
          // Lỗi tạm thời: GIỮ NGUYÊN refresh token, KHÔNG xóa phiên.
          return { success: false, generation: requestGen }
        }

        // Lỗi xác thực thực sự: xóa phiên.
        tokenStorage.clearRefreshToken()
        api.dispatch(clearAuthLocal())
        return { success: false, generation: requestGen }
      } catch {
        // Lỗi mạng bất ngờ: GIỮ NGUYÊN refresh token trong storage.
        return { success: false, generation: requestGen }
      }
    })()

    activeRefresh = {
      generation: requestGen,
      promise: refreshPromise,
    }

    // Xóa tham chiếu đồng bộ khi promise kết thúc.
    refreshPromise.finally(() => {
      if (activeRefresh?.promise === refreshPromise) {
        activeRefresh = null
      }
    })
  }

  const outcome = await activeRefresh.promise

  const finalGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
  if (outcome.success && finalGen === requestGen && (!extraOptions?.isRequestCurrent || extraOptions.isRequestCurrent())) {
    result = await rawBaseQuery(args, api, extraOptions)

    const postRetryGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
    if (postRetryGen !== requestGen || (extraOptions?.isRequestCurrent && !extraOptions.isRequestCurrent())) {
      return {
        error: {
          status: 'CUSTOM_ERROR',
          error: 'STALE_SESSION_DISCARDED',
        },
      }
    }
    handleInactiveAccount(result)
  }

  return result
}
