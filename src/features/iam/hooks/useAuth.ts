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

/** Cung cấp trạng thái phiên từ Redux cùng hai thao tác login/logout cho UI. */
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

  // Mở generation mới, login, lưu refresh token, lấy /me rồi mới xác nhận đăng nhập.
  // Bỏ kết quả async nếu generation đã đổi; lỗi /me chỉ xóa phiên vẫn thuộc generation này.
  const login = useCallback(
    async (credentials: LoginRequest) => {
      // 1. Tăng generation và xóa cache để dữ liệu phiên cũ không ảnh hưởng phiên mới.
      dispatch(startSession())
      dispatch(baseApi.util.resetApiState())

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startGen = (dispatch as any)(
        (_: unknown, getState: () => RootAuthState) =>
          getState().auth.sessionGeneration,
      )

      // 2. Gọi login trực tiếp để không đưa credential vào cache mutation của RTK Query.
      const loginResponse = await loginApi(credentials)

      // 3. Bỏ phản hồi nếu generation đã đổi trong lúc request đang chạy.
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

      // 4. Lưu refresh token vào sessionStorage; dừng an toàn nếu ghi thất bại.
      const saved = tokenStorage.setRefreshToken(tokenData.refresh_token)
      if (!saved) {
        dispatch(clearAuthLocal())
        throw new Error('Không thể lưu phiên đăng nhập vào trình duyệt. Vui lòng thử lại.')
      }

      // 5. Tạm lưu access token trong bộ nhớ để xác thực request /me tiếp theo.
      dispatch(
        updateAccessToken({
          accessToken: tokenData.access_token,
          generation: startGen,
        }),
      )

      try {
        // 6. Lấy hồ sơ hiện hành từ GET /api/v1/auth/me trước khi mở route.
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

        // 7. Ghi nhận profile và token để hoàn tất đăng nhập.
        dispatch(
          setCredentials({
            user: meRes.data,
            accessToken: tokenData.access_token,
            generation: startGen,
          }),
        )

        return tokenData
      } catch (meError) {
        // Chỉ xóa phiên cục bộ nếu generation vẫn khớp với phiên bắt đầu request.
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

  // Xóa phiên cục bộ ngay, sau đó mới gọi BE revoke; thông báo phản ánh kết quả từng bước.
  const logout = useCallback(async () => {
    // 1. Lưu tạm access token trước khi xóa trạng thái cục bộ.
    const snapshotToken = accessToken

    // 2. Xóa state, xử lý storage/tombstone và xóa cache trước khi đợi request mạng.
    dispatch(clearAuthLocal())
    const clearResult = tokenStorage.clearRefreshToken()
    dispatch(baseApi.util.resetApiState())

    // 3. Yêu cầu backend thu hồi phiên nếu có access token.
    if (snapshotToken) {
      try {
        await logoutApi(snapshotToken)
        // Trường hợp A: máy chủ đã xác nhận thu hồi phiên.
        if (clearResult.status === 'CLEARED') {
          toast.success('Đăng xuất thành công. Đã thu hồi phiên trên máy chủ.')
        } else if (clearResult.status === 'TOMBSTONED') {
          toast.warning('Đã thu hồi phiên trên máy chủ. Đã đặt khóa phiên trên trình duyệt.')
        } else {
          toast.warning('Đã thu hồi phiên trên máy chủ. Không thể xóa bộ nhớ cục bộ; vui lòng đóng trình duyệt.')
        }
      } catch {
        // Trường hợp B: không xác nhận được việc thu hồi phiên trên máy chủ.
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
      // Trường hợp C: không có access token, chưa gọi và chưa xác nhận thu hồi trên BE.
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
