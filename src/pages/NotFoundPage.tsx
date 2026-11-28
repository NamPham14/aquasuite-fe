import { Link } from 'react-router-dom'
import { useAuth } from '../features/iam/hooks/useAuth'
import { isCustomerRole } from '../features/iam/types/auth.types'

export function NotFoundPage() {
  const { isAuthenticated, user } = useAuth()
  const isCustomer = isAuthenticated && isCustomerRole(user?.roles)
  const fallbackPath = isCustomer ? '/storefront' : '/app/dashboard'
  const fallbackLabel = isCustomer ? 'Về Showroom mua sắm' : 'Về bảng điều khiển'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-aqs-page px-4 text-center font-aqs-sans text-aqs-ink">
      <div className="w-full max-w-md rounded-card border border-aqs-border bg-aqs-surface p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-aqs-accent">Lỗi điều hướng</p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight tabular-nums text-aqs-ink">404</h1>
        <h2 className="mt-2 text-lg font-bold text-aqs-ink">Không tìm thấy trang</h2>
        <p className="mt-2 text-sm leading-relaxed text-aqs-ink-muted">
          Đường dẫn bạn truy cập không tồn tại hoặc tài khoản hiện tại chưa được cấp quyền.
        </p>
        <Link
          to={fallbackPath}
          className="mt-6 inline-flex min-h-10 items-center justify-center rounded-control bg-aqs-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-aqs-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-focus"
        >
          {fallbackLabel}
        </Link>
      </div>
    </main>
  )
}
