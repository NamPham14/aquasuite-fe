import { baseApi } from '../../../shared/api/baseApi.ts'
import { getApiBaseUrl } from '../../../shared/api/reauthBaseQuery.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type {
  CurrentUserResponseData,
  LoginRequest,
  LoginResponseData,
  TokenResponseData,
} from '../types/auth.types.ts'

const API_BASE = getApiBaseUrl()

async function safeFetch<T>(
  url: string,
  options: RequestInit,
  fallbackErrorMessage: string,
): Promise<ApiResponse<T>> {
  let response: Response
  try {
    response = await fetch(url, options)
  } catch (err: unknown) {
    const fetchErr = new Error('Không thể kết nối đến máy chủ xác thực.')
    Object.assign(fetchErr, {
      status: 'FETCH_ERROR',
      originalError: err,
    })
    throw fetchErr
  }

  let json: ApiResponse<T>
  try {
    json = (await response.json()) as ApiResponse<T>
  } catch {
    // Response body is not valid JSON (e.g. 502/503 HTML from reverse proxy or gateway)
    const parseErr = new Error(
      response.status >= 500
        ? 'Dịch vụ xác thực tạm thời không khả dụng (Lỗi máy chủ).'
        : 'Phản hồi từ máy chủ không hợp lệ.',
    )
    Object.assign(parseErr, {
      status: response.status,
      data: {
        code: response.status === 503 ? 'AUTH_009' : 'PARSING_ERROR',
        message: parseErr.message,
      },
    })
    throw parseErr
  }

  if (!response.ok) {
    const error = new Error(json.message || fallbackErrorMessage)
    Object.assign(error, {
      status: response.status,
      data: json,
    })
    throw error
  }

  return json
}

/**
 * Direct API caller for login.
 * Kept outside of RTK Query mutation state so that sensitive credentials
 * (passwords, refresh tokens) do not enter Redux actions or mutation cache.
 */
export async function loginApi(
  credentials: LoginRequest,
): Promise<ApiResponse<LoginResponseData>> {
  return safeFetch<LoginResponseData>(
    `${API_BASE}/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
      }),
    },
    'Đăng nhập không thành công',
  )
}

/**
 * Direct API caller for token refresh.
 * Keeps refresh token rotation out of RTK Query mutation cache.
 */
export async function refreshApi(
  refreshToken: string,
): Promise<ApiResponse<TokenResponseData>> {
  return safeFetch<TokenResponseData>(
    `${API_BASE}/auth/refresh`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    },
    'Làm mới phiên thất bại',
  )
}

/**
 * Direct API caller for logout session revocation.
 */
export async function logoutApi(
  accessToken: string,
): Promise<ApiResponse<null>> {
  return safeFetch<null>(
    `${API_BASE}/auth/logout`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    'Thu hồi phiên thất bại',
  )
}

/**
 * RTK Query endpoints for safe non-credential data (current user profile).
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<ApiResponse<CurrentUserResponseData>, void>({
      query: () => ({
        url: '/auth/me',
        method: 'GET',
      }),
      // Always fetch fresh IAM profile without stale caching
      keepUnusedDataFor: 0,
    }),
  }),
})

export const { useGetMeQuery, useLazyGetMeQuery } = authApi
