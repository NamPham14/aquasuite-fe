import { Navigate, Outlet } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { tokenStorage } from '../../../shared/lib/tokenStorage.ts'
import { useAuth } from '../hooks/useAuth.ts'
import { triggerAuthBootstrap } from '../hooks/useAuthBootstrap.ts'

/** Chờ khôi phục phiên, hiển thị lỗi có thể thử lại hoặc chỉ render route con khi đã đăng nhập. */
export function ProtectedRoute() {
  const { isAuthenticated, isBootstrapping, bootstrapError } = useAuth()
  const dispatch = useDispatch()

  if (isBootstrapping) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center min-h-screen bg-gray-50"
      >
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-600 font-medium">
          Đang khôi phục phiên làm việc...
        </p>
      </div>
    )
  }

  if (
    bootstrapError &&
    (bootstrapError.type === 'SERVICE_UNAVAILABLE' ||
      bootstrapError.type === 'NETWORK_ERROR')
  ) {
    const canRetry = tokenStorage.hasRefreshToken()

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4 text-center">
        <div className="bg-white p-6 rounded-xl shadow-xs border border-gray-200 max-w-md w-full">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            Lỗi kết nối máy chủ xác thực
          </h2>
          <p className="text-xs text-gray-600 mb-6">{bootstrapError.message}</p>
          <div className="flex gap-3 justify-center">
            {canRetry && (
              <button
                type="button"
                onClick={() => void triggerAuthBootstrap(dispatch)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md cursor-pointer transition-colors"
              >
                Thử lại (Retry)
              </button>
            )}
            <a
              href="/login"
              className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md transition-colors"
            >
              Về trang đăng nhập
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
