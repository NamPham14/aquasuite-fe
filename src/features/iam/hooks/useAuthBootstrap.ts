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

  // Pop refresh token: fail-closed before network call
  const refreshToken = tokenStorage.popRefreshToken()
  if (!refreshToken) {
    dispatch(clearAuthLocal())
    isGlobalBootstrapInProgress = false
    return
  }

  try {
    // Step 1: Refresh token pair directly
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

    // Save new refresh token to sessionStorage
    const saved = tokenStorage.setRefreshToken(tokenData.refresh_token)
    if (!saved) {
      dispatch(clearAuthLocal())
      isGlobalBootstrapInProgress = false
      return
    }

    // Temporarily store access token in memory to authenticate /me
    dispatch(
      updateAccessToken({
        accessToken: tokenData.access_token,
        generation: startGen,
      }),
    )

    try {
      // Step 2: Fetch current authenticated user profile
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
        // Token is preserved in sessionStorage; allow retry recovery
        dispatch(
          setBootstrapError({
            type: 'SERVICE_UNAVAILABLE',
            message:
              'Dịch vụ máy chủ tạm thời không khả dụng khi tải hồ sơ (503 / Lỗi mạng). Vui lòng thử lại.',
          }),
        )
      } else {
        // 401 or 403 AUTH_008: invalid session -> fail-closed
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

    // The refresh token was popped from storage before this network call.
    // Whether this failure was an outage (503), network disconnect, or 401 invalid token,
    // the refresh token has been consumed and cannot be retried safely.
    // Transition to SESSION_EXPIRED to prompt the user to re-authenticate,
    // preventing an infinite error screen loop with an unrecoverable token.
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
 * Root bootstrap hook. Must ONLY be mounted once at application root (src/App.tsx).
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
