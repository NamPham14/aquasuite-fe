import { baseApi } from '../../../shared/api/baseApi.ts'
import { getApiBaseUrl } from '../../../shared/api/apiBaseUrl.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type {
  CurrentUserResponseData,
  LoginRequest,
  LoginResponseData,
  TokenResponseData,
} from '../types/auth.types.ts'

const API_BASE = getApiBaseUrl()

/** Gửi request auth trực tiếp, đọc envelope JSON và ném lỗi có status/data để UI phân loại. */
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
    // Phản hồi không phải JSON hợp lệ (ví dụ trang HTML lỗi 502/503 từ proxy).
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
 * Gọi API đăng nhập trực tiếp ngoài RTK Query để mật khẩu và refresh token
 * không đi vào Redux action hoặc cache của mutation.
 * Gửi email đã trim và mật khẩu tới BE; trả envelope chứa cặp token và user.
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
 * Gọi API làm mới token trực tiếp, tránh lưu refresh token trong cache mutation.
 * Gửi refresh token một lần để nhận cặp token mới; hàm gọi chịu trách nhiệm lưu token.
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
 * Gọi API đăng xuất trực tiếp để yêu cầu thu hồi phiên.
 * Dùng access token đã chụp trước khi xóa state để yêu cầu BE thu hồi phiên.
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
 * Endpoint RTK Query cho dữ liệu hồ sơ không chứa credential.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Lấy hồ sơ hiện hành; base query tự gắn bearer token và xử lý refresh khi cần.
    getMe: builder.query<ApiResponse<CurrentUserResponseData>, void>({
      query: () => ({
        url: '/auth/me',
        method: 'GET',
      }),
      // Không giữ cache hồ sơ sau khi không còn component sử dụng.
      keepUnusedDataFor: 0,
    }),
  }),
})

export const { useGetMeQuery, useLazyGetMeQuery } = authApi
