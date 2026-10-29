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

/** Gửi request, xử lý 401 bằng refresh single-flight và loại phản hồi thuộc phiên cũ. */
export const reauthBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Chụp generation trước request đầu tiên để phát hiện phiên thay đổi.
  const initialAppState = api.getState() as AppState
  const requestGen = initialAppState.auth?.sessionGeneration ?? 0

  let result = await rawBaseQuery(args, api, extraOptions)

  // Kiểm tra phiên không đổi hoặc kết thúc trong khi request đang chạy.
  const postRequestGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
  if (postRequestGen !== requestGen) {
    // Trả lỗi thay vì đưa phản hồi cũ của tài khoản A vào cache của tài khoản B.
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

  // Lỗi 403 không kích hoạt refresh; AUTH_008 kết thúc phiên cục bộ.
  if (result.error?.status === 403) {
    const errorData = result.error.data as { code?: string } | undefined
    if (errorData?.code === 'AUTH_008') {
      tokenStorage.clearRefreshToken()
      api.dispatch(clearAuthLocal())
    }
    return result
  }

  // Chỉ xử lý refresh cho lỗi 401 từ endpoint không thuộc nhóm auth này.
  if (result.error?.status !== 401 || isAuthEndpoint) {
    return result
  }

  // Các request cùng generation dùng chung một lần làm mới token.
  if (!activeRefresh || activeRefresh.generation !== requestGen) {
    const refreshPromise = (async (): Promise<RefreshOutcome> => {
      try {
        // Lấy và xóa refresh token trước khi gọi mạng; dừng nếu không lấy được.
        const refreshToken = tokenStorage.popRefreshToken()
        if (!refreshToken) {
          api.dispatch(clearAuthLocal())
          return { success: false, generation: requestGen }
        }

        const refreshResult = await rawBaseQuery(
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
            // Lưu refresh token mới vào sessionStorage.
            const saved = tokenStorage.setRefreshToken(tokenData.refresh_token)
            if (!saved) {
              // Không lưu được token thì kết thúc phiên cục bộ theo spec §7.
              api.dispatch(clearAuthLocal())
              return { success: false, generation: requestGen }
            }

            // Cập nhật access token trong bộ nhớ.
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

        // Refresh thất bại hoặc phản hồi không có cặp token hợp lệ.
        api.dispatch(clearAuthLocal())
        return { success: false, generation: requestGen }
      } catch {
        // Lỗi mạng hoặc lỗi bất ngờ: không thử lại refresh token cũ.
        api.dispatch(clearAuthLocal())
        return { success: false, generation: requestGen }
      }
    })()

    activeRefresh = {
      generation: requestGen,
      promise: refreshPromise,
    }

    // Xóa tham chiếu khi promise kết thúc, chỉ nếu nó vẫn là lần refresh hiện tại.
    refreshPromise.finally(() => {
      if (activeRefresh?.promise === refreshPromise) {
        activeRefresh = null
      }
    })
  }

  const outcome = await activeRefresh.promise

  // Chỉ thử lại request ban đầu nếu refresh thành công và generation không đổi.
  const finalGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
  if (outcome.success && finalGen === requestGen) {
    result = await rawBaseQuery(args, api, extraOptions)

    // Kiểm tra lại generation sau khi request thử lại hoàn tất.
    const postRetryGen = (api.getState() as AppState)?.auth?.sessionGeneration ?? 0
    if (postRetryGen !== requestGen) {
      // Loại phản hồi cũ để dữ liệu tài khoản A không vào cache của tài khoản B.
      return {
        error: {
          status: 'CUSTOM_ERROR',
          error: 'STALE_SESSION_DISCARDED',
        },
      }
    }
  }

  return result
}
