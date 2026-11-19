import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { isCustomerRole } from '../types/auth.types'

/** Chờ bootstrap; người đã đăng nhập về dashboard hoặc storefront theo vai trò, còn lại được vào route công khai như login. */
export function PublicOnlyRoute() {
  const { isAuthenticated, isBootstrapping, user } = useAuth()

  if (isBootstrapping) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center justify-center min-h-screen bg-gray-50"
      >
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-gray-600 font-medium">
          Đang tải ứng dụng...
        </p>
      </div>
    )
  }

  if (isAuthenticated) {
    const redirectPath = isCustomerRole(user?.roles) ? '/storefront' : '/app/dashboard'
    return <Navigate to={redirectPath} replace />
  }

  return <Outlet />
}
