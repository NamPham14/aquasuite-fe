import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useLazyGetMeQuery } from '../api/authApi.ts'
import { setUserProfile } from '../model/authSlice.ts'
import type { AuthState, UserSummary } from '../types/auth.types.ts'

interface RootAuthState {
  auth: AuthState
}

/** So sánh hồ sơ hiện tại với hồ sơ mới để tránh cập nhật thừa (giữ nguyên tham chiếu khi không đổi). */
function isSameProfile(current: UserSummary | null, next: UserSummary): boolean {
  if (!current) return false
  if (
    current.id !== next.id ||
    current.username !== next.username ||
    current.email !== next.email ||
    current.roles.length !== next.roles.length
  ) {
    return false
  }
  return current.roles.every((role) => next.roles.includes(role))
}

/**
 * Đồng bộ hồ sơ/vai trò của người dùng đang đăng nhập mỗi khi tab được focus trở lại.
 *
 * Nhờ đó sidebar (lọc theo `user.roles`) phản ánh ngay khi quản trị viên đổi vai trò
 * hoặc phân quyền cho tài khoản này, mà không cần đăng nhập lại. Chỉ cập nhật trường
 * hồ sơ qua `setUserProfile` nên không chạm tới access/refresh token của phiên.
 */
export function useProfileSync() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector((state: RootAuthState) => state.auth.isAuthenticated)
  const [fetchMe] = useLazyGetMeQuery()

  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false

    // Đọc trạng thái auth đồng bộ tại thời điểm gọi để tránh closure cũ.
    const readAuth = (): AuthState =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dispatch as any)((_: unknown, getState: () => RootAuthState) => getState().auth)

    const sync = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return

      const before = readAuth()
      if (!before.isAuthenticated) return

      try {
        // preferCacheValue = false → luôn gọi mạng để lấy vai trò mới nhất.
        const res = await fetchMe(undefined, false).unwrap()
        if (cancelled || !res?.data) return

        const after = readAuth()
        // Bỏ kết quả nếu phiên đã đổi (đăng xuất / đăng nhập lại) hoặc đã mất xác thực.
        if (!after.isAuthenticated || after.sessionGeneration !== before.sessionGeneration) return

        if (isSameProfile(after.user, res.data)) return

        dispatch(setUserProfile({ user: res.data, generation: after.sessionGeneration }))
      } catch {
        // Bỏ qua lỗi tạm thời; base query đã tự xử lý refresh token / thu hồi phiên.
      }
    }

    const handleFocus = () => void sync()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void sync()
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [isAuthenticated, dispatch, fetchMe])
}
