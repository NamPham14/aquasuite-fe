import { createAction } from '@reduxjs/toolkit'

/**
 * Action xóa trạng thái xác thực trong Redux: tăng generation, xóa access token,
 * hồ sơ và trạng thái đăng nhập. Storage được xử lý riêng bởi nơi gọi.
 */
export const clearAuthLocal = createAction('auth/clearAuthLocal')

/**
 * Action cập nhật access token mới sau khi làm mới; reducer kiểm tra generation.
 */
export const updateAccessToken = createAction<{
  accessToken: string
  generation: number
}>('auth/updateAccessToken')
