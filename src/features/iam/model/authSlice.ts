import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { clearAuthLocal, updateAccessToken } from '../../../shared/api/authActions.ts'
import type { AuthState, BootstrapError, UserSummary } from '../types/auth.types.ts'

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: true,
  sessionGeneration: 0,
  bootstrapError: null,
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Bắt đầu luồng phiên mới bằng cách tăng generation và xóa lỗi bootstrap.
     * Kết quả bất đồng bộ thuộc generation cũ sẽ bị loại bỏ.
     */
    startSession: (state) => {
      state.sessionGeneration += 1
      state.bootstrapError = null
    },

    /**
     * Xác nhận user và access token chỉ khi phản hồi còn thuộc phiên hiện tại.
     */
    setCredentials: (
      state,
      action: PayloadAction<{
        user: UserSummary
        accessToken: string
        generation: number
      }>,
    ) => {
      if (action.payload.generation !== state.sessionGeneration) {
        return
      }
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.isAuthenticated = true
      state.isBootstrapping = false
      state.bootstrapError = null
    },

    /**
     * Cập nhật profile /me nếu generation không đổi trong lúc request chạy.
     */
    setUserProfile: (
      state,
      action: PayloadAction<{
        user: UserSummary
        generation: number
      }>,
    ) => {
      if (action.payload.generation !== state.sessionGeneration) {
        return
      }
      state.user = action.payload.user
    },

    // Bật/tắt trạng thái chờ khôi phục phiên để route guard chọn UI phù hợp.
    setBootstrapping: (state, action: PayloadAction<boolean>) => {
      state.isBootstrapping = action.payload
    },

    // Ghi lỗi khôi phục và kết thúc trạng thái chờ.
    setBootstrapError: (state, action: PayloadAction<BootstrapError | null>) => {
      state.bootstrapError = action.payload
      state.isBootstrapping = false
    },

    // Xóa thông báo lỗi bootstrap sau khi UI đã xử lý hoặc người dùng thử lại.
    clearBootstrapError: (state) => {
      state.bootstrapError = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Hủy định danh và access token cục bộ; tăng generation để kết quả cũ bị loại.
      .addCase(clearAuthLocal, (state) => {
        state.sessionGeneration += 1
        state.user = null
        state.accessToken = null
        state.isAuthenticated = false
        state.isBootstrapping = false
      })
      // Chỉ nhận access token nếu kết quả thuộc generation đang hoạt động.
      .addCase(updateAccessToken, (state, action) => {
        if (action.payload.generation !== state.sessionGeneration) {
          return
        }
        state.accessToken = action.payload.accessToken
      })
  },
})

export const {
  startSession,
  setCredentials,
  setUserProfile,
  setBootstrapping,
  setBootstrapError,
  clearBootstrapError,
} = authSlice.actions

export { clearAuthLocal, updateAccessToken }
export const authReducer = authSlice.reducer
