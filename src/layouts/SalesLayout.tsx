import { Outlet, Link, NavLink } from 'react-router-dom'
import { Droplets, ShoppingCart, User as UserIcon, LogOut, LogIn } from 'lucide-react'
import { useAuth } from '../features/iam/hooks/useAuth.ts'
import { useGetCartQuery } from '../features/sales/api/cartApi.ts'

/**
 * Bố cục giao diện trang bán hàng dành cho khách hàng (SalesLayout).
 * Chỉ quản lý thanh điều hướng trên cùng (Header), thông tin phiên và vùng hiển thị <Outlet />.
 */
export function SalesLayout() {
  const { user, isAuthenticated, logout } = useAuth()
  const { data: cart } = useGetCartQuery(undefined, { skip: !isAuthenticated })

  const totalItems = cart?.totalItems ?? 0

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link to="/cart" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs group-hover:bg-sky-700 transition">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-slate-900">
                  AquaSuite
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-wider text-sky-600">
                  Storefront
                </span>
              </div>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              <NavLink
                to="/cart"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    isActive
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                Giỏ hàng của tôi
              </NavLink>
              <NavLink
                to="/checkout"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    isActive
                      ? 'bg-sky-50 text-sky-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`
                }
              >
                Đặt hàng & PayOS
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/cart"
              aria-label="Giỏ hàng"
              className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
            >
              <ShoppingCart className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline">Giỏ hàng</span>
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-bold bg-sky-600 text-white">
                {totalItems}
              </span>
            </Link>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="hidden md:inline font-medium max-w-36 truncate">
                    {user.username || user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void logout()}
                  title="Đăng xuất"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login-customer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}

