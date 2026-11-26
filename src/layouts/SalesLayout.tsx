import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  Droplets,
  Home,
  Layers,
  LogIn,
  LogOut,
  Package,
  PhoneCall,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../features/iam/hooks/useAuth.ts'
import { isCustomerRole } from '../features/iam/types/auth.types.ts'
import { useCustomerCart } from '../features/sales/hooks/useCustomerCart.ts'

/**
 * Bố cục giao diện trang bán hàng dành cho khách hàng (SalesLayout).
 * Thanh điều hướng kính mờ nền tối nổi bật, tập trung các mục duyệt Showroom, Giỏ hàng và Hồ sơ khách hàng.
 */
export function SalesLayout() {
  const { user, isAuthenticated, logout } = useAuth()
  const { totalItems } = useCustomerCart(isAuthenticated)
  const location = useLocation()
  // Nhân viên vẫn xem được trang cửa hàng; lối tắt tài khoản đưa họ về dashboard thay vì hồ sơ khách hàng.
  const isStaff = isAuthenticated && !!user && !isCustomerRole(user.roles)

  const onStorefront = location.pathname === '/storefront' || location.pathname === '/home'
  const isCatalogHash = onStorefront && location.hash === '#catalog'
  const isComboHash = onStorefront && location.hash === '#combos'
  const isHomeActive = onStorefront && !isCatalogHash && !isComboHash

  const navPillClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all duration-200 ${
      active
        ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 font-extrabold shadow-md shadow-cyan-400/30'
        : 'font-semibold text-slate-200 hover:text-white hover:bg-white/10'
    }`

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-sky-50/35 to-slate-100/80 text-slate-900 relative overflow-x-hidden">
      {/* Ánh sáng nền nhẹ tạo chiều sâu hiện đại */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_top,rgba(14,165,233,0.10),transparent_70%)] z-0"
      />

      <header className="sticky top-0 z-30 bg-gradient-to-r from-slate-950/95 via-sky-950/95 to-slate-900/95 backdrop-blur-xl border-b border-cyan-400/25 shadow-xl shadow-slate-950/20 text-white">
        <div
          aria-hidden="true"
          className="h-0.5 w-full bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 animate-aqua-aurora"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <Link to="/storefront" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/35 group-hover:scale-105 transition-all duration-300">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-white">
                  Aqua<span className="text-cyan-300">Suite</span>
                </span>
                <span className="block text-[10px] font-bold uppercase tracking-widest text-cyan-300/90">
                  Showroom
                </span>
              </div>
            </Link>

            <nav
              className="hidden md:flex items-center gap-1 rounded-2xl bg-white/10 border border-white/15 p-1 backdrop-blur-md"
              aria-label="Điều hướng cửa hàng"
            >
              <Link to="/storefront" className={navPillClass(isHomeActive)}>
                <Home className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Trang chủ</span>
              </Link>
              <Link to="/storefront#catalog" className={navPillClass(isCatalogHash)}>
                <Package className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sản phẩm</span>
              </Link>
              <Link to="/storefront#combos" className={navPillClass(isComboHash)}>
                <Layers className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Combo ưu đãi</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to="/cart"
              aria-label="Giỏ hàng"
              className={`group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ${
                totalItems > 0
                  ? 'border-cyan-300/50 bg-cyan-400/15 text-white hover:bg-cyan-400/25 shadow-md shadow-cyan-500/20'
                  : 'border-white/20 bg-white/10 hover:border-cyan-300/50 hover:bg-white/15 text-slate-100'
              }`}
            >
              <ShoppingCart className="w-4 h-4 text-cyan-300 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Giỏ hàng</span>
              <span
                className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full text-[11px] font-extrabold tabular-nums transition-transform group-hover:scale-105 ${
                  totalItems > 0
                    ? 'bg-gradient-to-r from-cyan-400 to-sky-400 text-slate-950 shadow-sm shadow-cyan-400/40'
                    : 'bg-white/20 text-white'
                }`}
              >
                {totalItems}
              </span>
            </Link>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-white/15">
                <Link
                  to={isStaff ? '/app/dashboard' : '/profile'}
                  title={isStaff ? 'Về trang quản trị' : 'Tài khoản, Bảo hành & Yêu cầu hỗ trợ'}
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 hover:border-cyan-300/40 px-2.5 py-1 text-xs text-white transition focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-sky-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="hidden md:inline font-semibold max-w-36 truncate">
                    {user.username || user.email}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  title="Đăng xuất"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-rose-300 hover:bg-rose-500/15 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đăng xuất</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="aqua-shine-btn inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 text-xs font-extrabold transition shadow-md shadow-cyan-400/30"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>

        {/* Thanh điều hướng phụ trên màn hình nhỏ */}
        <nav
          className="flex md:hidden items-center gap-1.5 overflow-x-auto px-4 pb-2.5 pt-1 border-t border-white/10"
          aria-label="Điều hướng di động"
        >
          <Link to="/storefront" className={navPillClass(isHomeActive)}>
            Trang chủ
          </Link>
          <Link to="/storefront#catalog" className={navPillClass(isCatalogHash)}>
            Sản phẩm
          </Link>
          <Link to="/storefront#combos" className={navPillClass(isComboHash)}>
            Combo ưu đãi
          </Link>
        </nav>
      </header>

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      <footer className="relative z-10 mt-10 border-t border-slate-200/80 bg-white/75 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center text-white">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800">AquaSuite Showroom</span>
              <span className="mx-2 text-slate-300">•</span>
              <span>Thám Vân Home — Thiết bị vệ sinh &amp; Giải pháp phòng tắm đồng bộ</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-sky-600" />
              VietQR PayOS 24/7
            </span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Bảo hành điện tử Serial
            </span>
            <span className="inline-flex items-center gap-1">
              <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
              Tư vấn kỹ thuật công trình
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
