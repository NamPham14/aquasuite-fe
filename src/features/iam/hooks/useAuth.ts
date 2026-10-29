import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { tokenStorage } from '../../../shared/lib/tokenStorage.ts'
import { baseApi } from '../../../shared/api/baseApi.ts'
import { authApi, loginApi, logoutApi } from '../api/authApi.ts'
import {
  clearAuthLocal,
  setCredentials,
  startSession,
  updateAccessToken,
} from '../model/authSlice.ts'
import type { AuthState, LoginRequest } from '../types/auth.types.ts'

interface RootAuthState {
  auth: AuthState
}

export function useAuth() {
  const dispatch = useDispatch()
  const {
    user,
    accessToken,
    isAuthenticated,
    isBootstrapping,
    sessionGeneration,
    bootstrapError,
  } = useSelector((state: RootAuthState) => state.auth)

  const login = useCallback(
    async (credentials: LoginRequest) => {
      // 1. Advance generation and reset RTK query cache so old session data cannot pollute new session
      dispatch(startSession())
      dispatch(baseApi.util.resetApiState())

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startGen = (dispatch as any)(
        (_: unknown, getState: () => RootAuthState) =>
          getState().auth.sessionGeneration,
      )

      // 2. Direct login call — keeps credentials and refresh tokens out of RTK Query mutation cache
      const loginResponse = await loginApi(credentials)

      // 3. Race condition check: drop response if generation changed while network was in flight
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let currentGen = (dispatch as any)(
        (_: unknown, getState: () => RootAuthState) =>
          getState().auth.sessionGeneration,
      )
      if (currentGen !== startGen) {
        return null
      }

      const tokenData = loginResponse.data
      if (!tokenData?.access_token || !tokenData?.refresh_token) {
        throw new Error('Dữ liệu token trả về từ máy chủ không hợp lệ')
      }

      // 4. Save refresh token to sessionStorage; fail-closed if write fails
      const saved = tokenStorage.setRefreshToken(tokenData.refresh_token)
      if (!saved) {
        dispatch(clearAuthLocal())
        throw new Error('Không thể lưu phiên đăng nhập vào trình duyệt. Vui lòng thử lại.')
      }

      // 5. Temporarily register access token in memory to authenticate the subsequent /me request
      dispatch(
        updateAccessToken({
          accessToken: tokenData.access_token,
          generation: startGen,
        }),
      )

      try {
        // 6. Fetch authoritative current user profile from GET /api/v1/auth/me before opening route
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
          return null
        }

        if (!meRes.data) {
          throw new Error('Không nhận được thông tin hồ sơ người dùng từ /me')
        }

        // 7. Commit authenticated credentials and profile
        dispatch(
          setCredentials({
            user: meRes.data,
            accessToken: tokenData.access_token,
            generation: startGen,
          }),
        )

        return tokenData
      } catch (meError) {
        // CRITICAL FIX: Only clear auth local if the current generation still matches startGen!
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentGen = (dispatch as any)(
          (_: unknown, getState: () => RootAuthState) =>
            getState().auth.sessionGeneration,
        )
        if (currentGen === startGen) {
          tokenStorage.clearRefreshToken()
          dispatch(clearAuthLocal())
          dispatch(baseApi.util.resetApiState())
        }
        throw meError
      }
    },
    [dispatch],
  )

  const logout = useCallback(async () => {
    // 1. Snapshot access token before clearing local state
    const snapshotToken = accessToken

    // 2. Synchronously clear auth state, storage tombstone, and RTK Query cache before any await
    dispatch(clearAuthLocal())
    const clearResult = tokenStorage.clearRefreshToken()
    dispatch(baseApi.util.resetApiState())

    // 3. Inform backend to revoke server session (if access token was present)
    if (snapshotToken) {
      try {
        await logoutApi(snapshotToken)
        // Case A: Server revoke verified
        if (clearResult.status === 'CLEARED') {
          toast.success('Đăng xuất thành công. Đã thu hồi phiên trên máy chủ.')
        } else if (clearResult.status === 'TOMBSTONED') {
          toast.warning('Đã thu hồi phiên trên máy chủ. Đã đặt khóa phiên trên trình duyệt.')
        } else {
          toast.warning('Đã thu hồi phiên trên máy chủ. Không thể xóa bộ nhớ cục bộ; vui lòng đóng trình duyệt.')
        }
      } catch {
        // Case B: Server revoke failed
        if (clearResult.status === 'CLEARED') {
          toast.warning(
            'Đã đăng xuất trên thiết bị. Không thể thu hồi phiên trên máy chủ do sự cố kết nối.',
          )
        } else if (clearResult.status === 'TOMBSTONED') {
          toast.error(
            'Cảnh báo: Không thể xóa storage và máy chủ chưa thu hồi phiên. Đã đặt khóa phiên; vui lòng đóng tab trình duyệt.',
          )
        } else {
          toast.error(
            'Cảnh báo bảo mật: Không thể xóa dữ liệu phiên trên trình duyệt và không thể thu hồi trên máy chủ. Vui lòng đóng toàn bộ cửa sổ trình duyệt.',
          )
        }
      }
    } else {
      // Case C: Access token was missing -> Backend revoke was NOT CALLED / UNVERIFIED
      if (clearResult.status === 'CLEARED') {
        toast.warning(
          'Đã đăng xuất trên thiết bị. Chưa xác nhận thu hồi phiên trên máy chủ do thiếu token xác thực.',
        )
      } else if (clearResult.status === 'TOMBSTONED') {
        toast.warning(
          'Chưa xác nhận thu hồi phiên trên máy chủ do thiếu token xác thực. Đã đặt khóa phiên trên trình duyệt.',
        )
      } else {
        toast.error(
          'Cảnh báo bảo mật: Chưa xác nhận thu hồi phiên trên máy chủ và không thể xóa bộ nhớ phiên. Vui lòng đóng toàn bộ cửa sổ trình duyệt.',
        )
      }
    }
  }, [accessToken, dispatch])

  return {
    user,
    accessToken,
    isAuthenticated,
    isBootstrapping,
    sessionGeneration,
    bootstrapError,
    login,
    logout,
  }
}
