import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardList,
  Layers,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UserCheck,
} from 'lucide-react'
import { formatVnd } from '../../../shared/lib/money.ts'

interface StorefrontQuickAccessStripProps {
  isAuthenticated: boolean
  username?: string
  totalCartItems: number
  cartSubtotal: number
  totalCatalogCount?: number
  comboCount?: number
}

/**
 * Dải lối tắt danh mục & dịch vụ hậu mãi thực tế trên Trang chủ Storefront.
 * Chỉ hiển thị thanh nhắc hoàn tất giỏ hàng khi khách đang có sản phẩm trong giỏ.
 */
export function StorefrontQuickAccessStrip({
  isAuthenticated,
  username,
  totalCartItems,
  cartSubtotal,
  totalCatalogCount = 24,
  comboCount = 3,
}: StorefrontQuickAccessStripProps) {
  return (
    <section aria-label="Lối tắt danh mục và dịch vụ khách hàng" className="space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Danh mục Thiết bị Vệ sinh */}
        <Link
          to="/storefront#catalog"
          className="aqua-shine-btn group relative overflow-hidden rounded-2xl border border-sky-200/80 bg-gradient-to-br from-white via-white to-sky-50/80 p-4 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:shadow-sky-500/15 hover:border-sky-400 transition-all duration-300 flex items-start justify-between gap-3 focus-visible:outline-2 focus-visible:outline-sky-600"
        >
          <Sparkles
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 text-sky-500/10 group-hover:scale-125 group-hover:-rotate-12 group-hover:text-sky-500/20 transition-all duration-500"
          />
          <div className="relative z-10 flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/30 group-hover:scale-110 transition-transform duration-300">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-slate-900 group-hover:text-sky-800 transition-colors">
                  Danh mục Thiết bị
                </span>
                <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 tabular-nums">
                  {totalCatalogCount}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-sky-700">
                Bồn cầu, Lavabo, Sen vòi
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                Xem thông số &amp; tồn kho thực tế
              </p>
            </div>
          </div>
          <ArrowRight
            className="relative z-10 h-4 w-4 shrink-0 text-sky-500/70 group-hover:text-sky-700 group-hover:translate-x-1 transition-all"
            aria-hidden="true"
          />
        </Link>

        {/* Card 2: Gói Combo Phòng tắm Trọn bộ */}
        <Link
          to="/storefront#combos"
          className="aqua-shine-btn group relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-white via-white to-amber-50/80 p-4 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/15 hover:border-amber-400 transition-all duration-300 flex items-start justify-between gap-3 focus-visible:outline-2 focus-visible:outline-amber-600"
        >
          <Layers
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 text-amber-500/10 group-hover:scale-125 group-hover:-rotate-12 group-hover:text-amber-500/20 transition-all duration-500"
          />
          <div className="relative z-10 flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30 group-hover:scale-110 transition-transform duration-300">
              <Layers className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-slate-900 group-hover:text-amber-800 transition-colors">
                  Combo Phòng tắm
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 tabular-nums">
                  {comboCount} gói
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-amber-800">
                Tiết kiệm lên tới 18%
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                Đồng bộ thiết bị căn hộ &amp; biệt thự
              </p>
            </div>
          </div>
          <ArrowRight
            className="relative z-10 h-4 w-4 shrink-0 text-amber-500/70 group-hover:text-amber-700 group-hover:translate-x-1 transition-all"
            aria-hidden="true"
          />
        </Link>

        {/* Card 3: Bảo hành điện tử */}
        <Link
          to={isAuthenticated ? '/profile/warranties' : '/login-customer'}
          className="aqua-shine-btn group relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white via-white to-indigo-50/80 p-4 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/15 hover:border-indigo-400 transition-all duration-300 flex items-start justify-between gap-3 focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          <ShieldCheck
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 text-indigo-500/10 group-hover:scale-125 group-hover:-rotate-12 group-hover:text-indigo-500/20 transition-all duration-500"
          />
          <div className="relative z-10 flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-800 block transition-colors">
                Bảo hành Điện tử
              </span>
              <p className="mt-1 text-xs font-bold text-indigo-700">
                Tra cứu theo mã Serial
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                Kiểm tra thời hạn &amp; điều khoản
              </p>
            </div>
          </div>
          <ArrowRight
            className="relative z-10 h-4 w-4 shrink-0 text-indigo-500/70 group-hover:text-indigo-700 group-hover:translate-x-1 transition-all"
            aria-hidden="true"
          />
        </Link>

        {/* Card 4: Hỗ trợ kỹ thuật / Tài khoản */}
        <Link
          to={isAuthenticated ? '/profile/warranty-tickets' : '/login-customer'}
          className="aqua-shine-btn group relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-white via-white to-emerald-50/80 p-4 shadow-sm hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/15 hover:border-emerald-400 transition-all duration-300 flex items-start justify-between gap-3 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          {isAuthenticated ? (
            <ClipboardList
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 text-emerald-500/10 group-hover:scale-125 group-hover:-rotate-12 group-hover:text-emerald-500/20 transition-all duration-500"
            />
          ) : (
            <UserCheck
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-3 -right-3 h-16 w-16 text-emerald-500/10 group-hover:scale-125 group-hover:-rotate-12 group-hover:text-emerald-500/20 transition-all duration-500"
            />
          )}
          <div className="relative z-10 flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
              {isAuthenticated ? (
                <ClipboardList className="h-5 w-5" aria-hidden="true" />
              ) : (
                <UserCheck className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-extrabold text-slate-900 group-hover:text-emerald-800 block transition-colors">
                {isAuthenticated ? 'Hỗ trợ & Lắp đặt' : 'Tài khoản Khách hàng'}
              </span>
              <p className="mt-1 text-xs font-bold text-emerald-700 truncate">
                {isAuthenticated
                  ? `Xin chào, ${username || 'Quý khách'}`
                  : 'Đăng nhập / Đăng ký ngay'}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                {isAuthenticated
                  ? 'Gửi yêu cầu bảo trì & kỹ thuật'
                  : 'Lưu địa chỉ giao hàng & bảo hành'}
              </p>
            </div>
          </div>
          <ArrowRight
            className="relative z-10 h-4 w-4 shrink-0 text-emerald-500/70 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all"
            aria-hidden="true"
          />
        </Link>
      </div>

      {/* Thanh nhắc giỏ hàng chỉ xuất hiện khi khách đang có sản phẩm chờ thanh toán */}
      {totalCartItems > 0 && (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-cyan-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <span className="font-bold text-slate-900">
                Bạn đang có {totalCartItems} sản phẩm trong giỏ hàng
              </span>
              <span className="mx-2 text-slate-300">•</span>
              <span className="font-extrabold text-sky-700 tabular-nums">
                Tạm tính: {formatVnd(cartSubtotal)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/cart"
              className="rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50 transition"
            >
              Xem giỏ hàng
            </Link>
            <Link
              to="/checkout"
              className="aqua-shine-btn inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-3.5 py-1.5 text-xs font-bold text-white hover:from-sky-500 hover:to-cyan-500 shadow-sm shadow-sky-500/25 transition"
            >
              <span>Tiến hành thanh toán</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
