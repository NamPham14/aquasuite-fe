import { useEffect, useRef } from 'react'
import { useDispatch } from 'react-redux'
import type { Dispatch } from '@reduxjs/toolkit'
import { tokenStorage } from '../../../shared/lib/tokenStorage.ts'
import { baseApi } from '../../../shared/api/baseApi.ts'
import { authApi, refreshApi } from '../api/authApi.ts'
import {
  clearAuthLocal,
  setBootstrapError,
  setBootstrapping,
  setCredentials,
  startSession,
  updateAccessToken,
} from '../model/authSlice.ts'
import type { AuthState } from '../types/auth.types.ts'

interface RootAuthState {
  auth: AuthState
}

/** Nhận diện lỗi mạng/dịch vụ để phân biệt với phiên không hợp lệ khi bootstrap. */
function isOutageOrNetworkError(err: any): boolean {
  if (!err) return false
  const status = err.status
  const code = err.data?.code
  return (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 'FETCH_ERROR' ||
    status === 'TIMEOUT_ERROR' ||
    status === 'PARSING_ERROR' ||
    code === 'AUTH_009' ||
    err instanceof TypeError ||
    err.name === 'TypeError'
  )
}

let isGlobalBootstrapInProgress = false

/** Khôi phục phiên: consume refresh token, đổi token, tải /me và chỉ nhận kết quả của generation hiện tại. */
export async function triggerAuthBootstrap(dispatch: Dispatch): Promise<void> {
  if (isGlobalBootstrapInProgress) {
    return
  }
  isGlobalBootstrapInProgress = true

  if (!tokenStorage.hasRefreshToken()) {
    dispatch(setBootstrapping(false))
    isGlobalBootstrapInProgress = false
    return
  }

  dispatch(startSession())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startGen = (dispatch as any)(
    (_: unknown, getState: () => RootAuthState) =>
      getState().auth.sessionGeneration,
  )

  // Lấy và xóa refresh token trước khi gọi mạng; nếu xóa thất bại thì dừng.
  const refreshToken = tokenStorage.popRefreshToken()
  if (!refreshToken) {
    dispatch(clearAuthLocal())
    isGlobalBootstrapInProgress = false
    return
  }

  try {
    // Bước 1: gọi trực tiếp để đổi cặp token.
    const refreshRes = await refreshApi(refreshToken)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentGen = (dispatch as any)(
      (_: unknown, getState: () => RootAuthState) =>
        getState().auth.sessionGeneration,
    )
    if (currentGen !== startGen) {
      isGlobalBootstrapInProgress = false
      return
    }

    const tokenData = refreshRes.data
    if (!tokenData?.access_token || !tokenData?.refresh_token) {
      dispatch(clearAuthLocal())
      dispatch(
        setBootstrapError({
          type: 'SESSION_EXPIRED',
          message: 'Phản hồi token từ máy chủ không hợp lệ.',
        }),
      )
      isGlobalBootstrapInProgress = false
      return
    }

    // Lưu refresh token mới vào sessionStorage.
    const saved = tokenStorage.setRefreshToken(tokenData.refresh_token)
    if (!saved) {
      dispatch(clearAuthLocal())
      isGlobalBootstrapInProgress = false
      return
    }

    // Tạm lưu access token trong bộ nhớ để xác thực request /me.
    dispatch(
      updateAccessToken({
        accessToken: tokenData.access_token,
        generation: startGen,
      }),
    )

    try {
      // Bước 2: lấy hồ sơ của người dùng hiện hành.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meRes = await (dispatch as any)(
        authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
      ).unwrap()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentGen = (dispatch as any)(
        (_: unknown, getState: () => RootAuthState) =>
          getState().auth.sessionGeneration,
      )
      if (currentGen !== startGen) {
        isGlobalBootstrapInProgress = false
        return
      }

      if (!meRes.data) {
        tokenStorage.clearRefreshToken()
        dispatch(clearAuthLocal())
        isGlobalBootstrapInProgress = false
        return
      }

      dispatch(
        setCredentials({
          user: meRes.data,
          accessToken: tokenData.access_token,
          generation: startGen,
        }),
      )
    } catch (meError: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentGen = (dispatch as any)(
        (_: unknown, getState: () => RootAuthState) =>
          getState().auth.sessionGeneration,
      )
      if (currentGen !== startGen) {
        isGlobalBootstrapInProgress = false
        return
      }

      if (isOutageOrNetworkError(meError)) {
        // Token mới còn trong sessionStorage, có thể cho phép thử khôi phục lại.
        dispatch(
          setBootstrapError({
            type: 'SERVICE_UNAVAILABLE',
            message:
              'Dịch vụ máy chủ tạm thời không khả dụng khi tải hồ sơ (503 / Lỗi mạng). Vui lòng thử lại.',
          }),
        )
      } else {
        // Phiên không hợp lệ: xóa token và trạng thái đăng nhập cục bộ.
        tokenStorage.clearRefreshToken()
        dispatch(clearAuthLocal())
        dispatch(
          setBootstrapError({
            type: 'SESSION_EXPIRED',
            message: 'Phiên làm việc đã hết hạn hoặc tài khoản không hoạt động.',
          }),
        )
      }
    }
  } catch (refreshError: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentGen = (dispatch as any)(
      (_: unknown, getState: () => RootAuthState) =>
        getState().auth.sessionGeneration,
    )
    if (currentGen !== startGen) {
      isGlobalBootstrapInProgress = false
      return
    }

    dispatch(clearAuthLocal())
    dispatch(baseApi.util.resetApiState())

    // Refresh token đã bị xóa trước request; dù là 503, mất mạng hay 401,
    // không thể thử lại token cũ một cách an toàn. Yêu cầu đăng nhập lại
    // để tránh lặp vô hạn với token không thể khôi phục.
    const message = isOutageOrNetworkError(refreshError)
      ? 'Dịch vụ xác thực tạm thời không khả dụng trong quá trình khôi phục phiên (503 / Mất kết nối). Vui lòng đăng nhập lại.'
      : 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'

    dispatch(
      setBootstrapError({
        type: 'SESSION_EXPIRED',
        message,
      }),
    )
  } finally {
    isGlobalBootstrapInProgress = false
  }
}

/**
 * Hook khôi phục phiên; chỉ mount một lần tại gốc ứng dụng (src/App.tsx).
 * Kích hoạt bootstrap khi App mount; ref tránh gọi lại trong cùng vòng đời component.
 */
export function useAuthBootstrap() {
  const dispatch = useDispatch()
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current) return
    mounted.current = true

    void triggerAuthBootstrap(dispatch)
  }, [dispatch])
}
