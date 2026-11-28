import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LogIn,
  LogOut,
  ShoppingBag,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../features/iam/hooks/useAuth.ts'
import { isCustomerRole } from '../features/iam/types/auth.types.ts'
import { useCustomerCart } from '../features/sales/hooks/useCustomerCart.ts'

/**
 * Bố cục Showroom kiến trúc dành cho Khách hàng (SalesLayout).
 * Toàn màn hình (full-bleed) cho Trang chủ /storefront, giữ khung max-w-7xl chuẩn mực cho Giỏ hàng, Chi tiết SP & Hồ sơ.
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

  const navLinkClass = (active: boolean) =>
    `relative py-2 text-[13px] tracking-[0.04em] whitespace-nowrap transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614] ${
      active
        ? 'text-[#171614] font-semibold after:absolute after:inset-x-0 after:bottom-0 after:h-[1.5px] after:bg-[#171614]'
        : 'text-[#6B6760] hover:text-[#171614] font-normal'
    }`

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#171614] font-store-sans antialiased selection:bg-[#171614] selection:text-[#FAF9F6]">
      {/* Dải thông tin showroom tinh giản */}
      <div className="bg-[#171614] text-[#D8D4CC] text-[11px] tracking-[0.1em] uppercase">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 h-8 flex items-center justify-between gap-4">
          <span className="truncate">
            Thám Vân Home Showroom &mdash; Thiết bị vệ sinh chính hãng TOTO · INAX · KOHLER · GROHE
          </span>
          <span className="hidden md:inline shrink-0 text-[#A8A298]">
            Tồn kho thực tế &middot; Bảo hành điện tử Serial
          </span>
        </div>
      </div>

      {/* Thanh điều hướng kiểu Gallery */}
      <header className="sticky top-0 z-30 bg-[#FAF9F6]/92 backdrop-blur-md border-b border-[#E6E2DA]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 h-[68px] flex items-center justify-between gap-6">
          <Link
            to="/storefront"
            className="flex flex-col leading-none shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
          >
            <span className="font-editorial text-xl sm:text-[22px] tracking-[0.08em] text-[#171614] font-medium uppercase">
              AquaSuite
            </span>
            <span className="mt-1 text-[9px] uppercase tracking-[0.26em] text-[#78736A]">
              By Thám Vân Home
            </span>
          </Link>

          <nav
            className="hidden md:flex items-center gap-9"
            aria-label="Điều hướng cửa hàng"
          >
            <Link to="/storefront" className={navLinkClass(isHomeActive)}>
              Trang chủ
            </Link>
            <Link to="/storefront#catalog" className={navLinkClass(isCatalogHash)}>
              Sản phẩm
            </Link>
            <Link to="/storefront#combos" className={navLinkClass(isComboHash)}>
              Combo ưu đãi
            </Link>
          </nav>

          <div className="flex items-center gap-4 sm:gap-5 shrink-0">
            <Link
              to="/cart"
              aria-label="Giỏ hàng"
              className="inline-flex items-center gap-2 text-[13px] font-medium text-[#171614] hover:text-[#6B6760] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
            >
              <ShoppingBag className="w-4 h-4 stroke-[1.6]" aria-hidden="true" />
              <span className="hidden sm:inline">Giỏ hàng</span>
              <span className="tabular-nums text-xs text-[#6B6760]">({totalItems})</span>
            </Link>

            {isAuthenticated && user ? (
              <div className="flex items-center gap-3 pl-4 border-l border-[#E6E2DA]">
                <Link
                  to={isStaff ? '/app/dashboard' : '/profile'}
                  title={isStaff ? 'Về trang quản trị' : 'Tài khoản, Bảo hành & Yêu cầu hỗ trợ'}
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-[#171614] hover:text-[#6B6760] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
                >
                  <UserIcon className="w-4 h-4 stroke-[1.6]" aria-hidden="true" />
                  <span className="hidden md:inline max-w-36 truncate">
                    {user.username || user.email}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                  className="inline-flex items-center gap-1 text-xs text-[#78736A] hover:text-[#991B1B] transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 stroke-[1.6]" aria-hidden="true" />
                  <span className="hidden sm:inline">Thoát</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 border border-[#171614] bg-[#171614] text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 stroke-[1.6]" aria-hidden="true" />
                <span>Đăng nhập</span>
              </Link>
            )}
          </div>
        </div>

        {/* Điều hướng di động */}
        <nav
          className="flex md:hidden items-center gap-6 overflow-x-auto px-5 pb-2.5 border-t border-[#ECE8E0]"
          aria-label="Điều hướng di động"
        >
          <Link to="/storefront" className={navLinkClass(isHomeActive)}>
            Trang chủ
          </Link>
          <Link to="/storefront#catalog" className={navLinkClass(isCatalogHash)}>
            Sản phẩm
          </Link>
          <Link to="/storefront#combos" className={navLinkClass(isComboHash)}>
            Combo ưu đãi
          </Link>
        </nav>
      </header>

      <main
        className={
          onStorefront
            ? 'flex-1 w-full'
            : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8'
        }
      >
        <Outlet />
      </main>

      <footer className="bg-[#171614] text-[#C8C3BA] border-t border-[#2A2824]">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-3">
            <p className="font-editorial text-2xl tracking-[0.06em] text-white uppercase">
              AquaSuite
            </p>
            <p className="text-xs leading-relaxed text-[#9C978E] max-w-sm">
              Showroom Thám Vân Home — Giải pháp thiết bị vệ sinh và hệ thống cấp thoát nước đồng bộ cho biệt thự, căn hộ và công trình nghỉ dưỡng.
            </p>
          </div>

          <div className="md:col-span-3 space-y-2.5 text-xs">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8A857C] font-semibold">
              Danh mục Showroom
            </p>
            <ul className="space-y-2">
              <li>
                <Link to="/storefront#catalog" className="hover:text-white transition-colors">
                  Thiết bị vệ sinh chọn lọc
                </Link>
              </li>
              <li>
                <Link to="/storefront#combos" className="hover:text-white transition-colors">
                  Giải pháp Combo trọn bộ
                </Link>
              </li>
              <li>
                <Link to={isAuthenticated ? '/profile/warranties' : '/login'} className="hover:text-white transition-colors">
                  Tra cứu bảo hành Serial
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-2.5 text-xs">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#8A857C] font-semibold">
              Tiêu chuẩn dịch vụ
            </p>
            <ul className="space-y-2 text-[#A8A39A]">
              <li>Phân phối chính hãng TOTO, INAX, KOHLER, GROHE</li>
              <li>Thanh toán VietQR PayOS 24/7 &amp; giao hàng theo tiến độ</li>
              <li>Kích hoạt bảo hành điện tử ngay khi hoàn tất đơn hàng</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#282622]">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#7D7870]">
            <span>&copy; 2026 AquaSuite Showroom &mdash; Thám Vân Home</span>
            <span>Không gian kiến trúc phòng tắm đương đại</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
