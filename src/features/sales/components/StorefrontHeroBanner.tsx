import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Award,
  ChevronLeft,
  ChevronRight,
  Droplets,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  X,
} from 'lucide-react'
import { formatVnd } from '../../../shared/lib/money.ts'
import type { CatalogItemOption } from '../data/catalogProducts.data.ts'

interface StorefrontHeroBannerProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onSelectQuickKeyword: (keyword: string) => void
  totalCatalogCount: number
  featuredItems?: CatalogItemOption[]
  onOpenFeatured?: (item: CatalogItemOption) => void
}

const QUICK_KEYWORDS = [
  { label: 'Bồn cầu TOTO', keyword: 'TOTO' },
  { label: 'Chậu rửa Lavabo', keyword: 'Chậu rửa' },
  { label: 'Sen cây tắm', keyword: 'Sen' },
  { label: 'INAX Aqua Ceramic', keyword: 'INAX' },
  { label: 'Phụ kiện 2.000đ', keyword: 'Gioăng' },
]

const TRUST_HIGHLIGHTS = [
  {
    icon: Award,
    title: 'Chính hãng 100%',
    desc: 'Phân phối TOTO, INAX, KOHLER & Tiền Phong chuẩn xuất xứ',
    iconBg: 'from-sky-500 to-blue-600 shadow-sky-500/25',
    barColor: 'from-sky-500 to-cyan-400',
  },
  {
    icon: QrCode,
    title: 'VietQR PayOS 24/7',
    desc: 'Quét mã chuyển khoản xác nhận tự động hoặc COD linh hoạt',
    iconBg: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
    barColor: 'from-emerald-500 to-teal-400',
  },
  {
    icon: ShieldCheck,
    title: 'Bảo hành điện tử',
    desc: 'Tra cứu thời hạn theo Serial & gửi phiếu hỗ trợ trực tuyến',
    iconBg: 'from-indigo-500 to-violet-600 shadow-indigo-500/25',
    barColor: 'from-indigo-500 to-purple-400',
  },
  {
    icon: Truck,
    title: 'Giao hàng công trình',
    desc: 'Tồn kho thực tế, hỗ trợ giao theo tiến độ lắp đặt',
    iconBg: 'from-amber-500 to-orange-600 shadow-amber-500/25',
    barColor: 'from-amber-500 to-orange-400',
  },
]

/**
 * Hero Banner & Thanh tìm kiếm trung tâm cho Trang chủ Khách hàng (AquaSuite Storefront).
 * Trang bị nền ánh sáng cực quang chuyển động, hiệu ứng kính mờ và thẻ tiêu điểm sản phẩm tương tác.
 */
export function StorefrontHeroBanner({
  searchTerm,
  onSearchChange,
  onSelectQuickKeyword,
  totalCatalogCount,
  featuredItems = [],
  onOpenFeatured,
}: StorefrontHeroBannerProps) {
  const [spotlightIndex, setSpotlightIndex] = useState(0)
  const [failedSpotlightIds, setFailedSpotlightIds] = useState<Record<string, boolean>>({})

  const spotlightList = featuredItems.slice(0, 4)
  const safeIndex = spotlightList.length > 0 ? spotlightIndex % spotlightList.length : 0
  const activeSpotlight = spotlightList[safeIndex]
  const spotlightImgError = activeSpotlight
    ? Boolean(failedSpotlightIds[activeSpotlight.variantId])
    : false

  useEffect(() => {
    if (spotlightList.length <= 1) return
    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlightList.length)
    }, 5500)
    return () => window.clearInterval(timer)
  }, [spotlightList.length])

  return (
    <section
      aria-label="Giới thiệu Showroom và tìm kiếm thiết bị vệ sinh"
      className="relative rounded-3xl border border-sky-200/70 bg-white shadow-xl shadow-sky-950/10 overflow-hidden"
    >
      {/* Sân khấu Hero chính */}
      <div className="relative bg-gradient-to-br from-slate-950 via-sky-950 to-indigo-950 px-5 py-7 sm:px-9 sm:py-10 text-white overflow-hidden">
        {/* Lưới kiến trúc & Các quầng sáng trôi nổi */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 aqua-hero-grid opacity-55"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-cyan-500/25 blur-3xl animate-aqua-float"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 right-10 h-80 w-80 rounded-full bg-sky-500/25 blur-3xl animate-aqua-float-reverse"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/3 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl"
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-8 items-center">
          {/* Cột trái: Tiêu đề + Search phát sáng + Từ khóa nhanh */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/35 bg-white/10 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-semibold text-cyan-200 shadow-lg shadow-cyan-950/30">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
              <span>Showroom Thiết Bị Vệ Sinh Chính Hãng — Thám Vân Home</span>
              <span className="text-cyan-400/60">•</span>
              <span className="tabular-nums font-bold text-white">
                {totalCatalogCount} sản phẩm sẵn sàng
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-[1.16]">
              Giải pháp phòng tắm &amp;{' '}
              <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-teal-300 bg-clip-text text-transparent animate-aqua-aurora">
                cấp thoát nước đồng bộ
              </span>{' '}
              cho ngôi nhà của bạn
            </h1>

            <p className="text-xs sm:text-sm text-slate-300/95 leading-relaxed max-w-2xl">
              Tra cứu tồn kho thực tế, thông số kỹ thuật chuẩn xác (tâm xả, kích thước, công nghệ men sứ),
              đặt hàng trực tuyến nhanh chóng qua cổng <strong className="text-cyan-200 font-semibold">VietQR PayOS</strong> và theo dõi bảo hành điện tử tập trung.
            </p>

            {/* Thanh tìm kiếm phát sáng */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="pt-2 max-w-2xl"
            >
              <label htmlFor="storefront-hero-search" className="sr-only">
                Tìm kiếm thiết bị vệ sinh theo tên, mã SKU hoặc thông số
              </label>
              <div className="relative group">
                <div
                  aria-hidden="true"
                  className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-sky-400 via-cyan-300 to-indigo-400 opacity-45 blur-sm group-focus-within:opacity-95 group-hover:opacity-75 transition duration-300"
                />
                <div className="relative flex items-center">
                  <Search
                    className="pointer-events-none absolute left-4 h-4 w-4 text-sky-600"
                    aria-hidden="true"
                  />
                  <input
                    id="storefront-hero-search"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Tìm tên sản phẩm, mã SKU hoặc thương hiệu..."
                    className={`h-12 sm:h-13 w-full rounded-2xl border border-white/40 bg-white/95 pl-11 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 shadow-lg focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                      searchTerm ? 'pr-36' : 'pr-28'
                    }`}
                  />
                  <div className="absolute right-2 flex items-center gap-1.5">
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => onSearchChange('')}
                        aria-label="Xóa từ khóa tìm kiếm"
                        className="inline-flex items-center justify-center rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      type="submit"
                      className="aqua-shine-btn inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-3.5 py-2 text-xs font-bold text-white hover:from-sky-500 hover:to-cyan-500 shadow-sm shadow-sky-500/25 cursor-pointer transition"
                    >
                      <Search className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Tìm kiếm</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Từ khóa tìm nhanh có hiệu ứng nổi */}
              <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[11px] font-semibold text-cyan-200/80 mr-0.5">
                  Gợi ý nhanh:
                </span>
                {QUICK_KEYWORDS.map((item) => {
                  const isSelected =
                    searchTerm.trim().toLowerCase() === item.keyword.toLowerCase()
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() =>
                        onSelectQuickKeyword(isSelected ? '' : item.keyword)
                      }
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-200 cursor-pointer hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-sky-400 ${
                        isSelected
                          ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-bold shadow-md shadow-cyan-400/35'
                          : 'bg-white/10 backdrop-blur-md text-slate-100 border border-white/15 hover:bg-white/20 hover:border-cyan-300/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </form>
          </div>

          {/* Cột phải: Thẻ Tiêu điểm Sản phẩm Kính mờ Tương tác */}
          <div className="lg:col-span-5">
            {activeSpotlight ? (
              <div className="relative rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-4 sm:p-5 shadow-2xl shadow-black/30 hover:border-cyan-300/45 transition-all duration-300">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 border border-amber-300/35 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    <Sparkles className="h-3 w-3 text-amber-300" aria-hidden="true" />
                    Tiêu điểm Showroom
                  </span>

                  {spotlightList.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Sản phẩm tiêu điểm trước"
                        onClick={() =>
                          setSpotlightIndex(
                            (prev) => (prev - 1 + spotlightList.length) % spotlightList.length,
                          )
                        }
                        className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Sản phẩm tiêu điểm tiếp theo"
                        onClick={() =>
                          setSpotlightIndex((prev) => (prev + 1) % spotlightList.length)
                        }
                        className="h-7 w-7 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Khung hiển thị sản phẩm nổi bật */}
                <div className="flex gap-3.5 items-center">
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 shrink-0 rounded-xl overflow-hidden border border-white/20 bg-slate-900/60 flex items-center justify-center">
                    {activeSpotlight.imageUrl && !spotlightImgError ? (
                      <img
                        src={activeSpotlight.imageUrl}
                        alt={activeSpotlight.name}
                        onError={() =>
                          setFailedSpotlightIds((prev) => ({
                            ...prev,
                            [activeSpotlight.variantId]: true,
                          }))
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-sky-500/30 via-cyan-500/20 to-indigo-600/30 flex flex-col items-center justify-center p-2 text-center">
                        <Droplets className="h-7 w-7 text-cyan-300 mb-1" aria-hidden="true" />
                        <span className="text-[10px] font-bold text-cyan-100">
                          {activeSpotlight.brand}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="rounded bg-cyan-400/20 border border-cyan-300/30 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                        {activeSpotlight.brand}
                      </span>
                      <span className="text-[10px] font-mono text-slate-300 truncate">
                        {activeSpotlight.sku}
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                      <Link
                        to={`/products/${encodeURIComponent(activeSpotlight.variantId)}`}
                        className="hover:text-cyan-200 transition-colors"
                      >
                        {activeSpotlight.name}
                      </Link>
                    </h2>

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-cyan-300 tabular-nums">
                        {formatVnd(activeSpotlight.sellingPrice)}
                      </span>
                      <span className="text-[11px] text-slate-300">
                        / {activeSpotlight.unit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Spotlight */}
                <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {spotlightList.map((item, idx) => (
                      <button
                        key={item.variantId}
                        type="button"
                        aria-label={`Chọn sản phẩm tiêu điểm ${idx + 1}`}
                        onClick={() => setSpotlightIndex(idx)}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          idx === safeIndex
                            ? 'w-6 bg-cyan-300'
                            : 'w-2 bg-white/30 hover:bg-white/55'
                        }`}
                      />
                    ))}
                  </div>

                  <Link
                    to={`/products/${encodeURIComponent(activeSpotlight.variantId)}`}
                    onClick={() => onOpenFeatured?.(activeSpotlight)}
                    className="aqua-shine-btn inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 hover:from-cyan-300 hover:to-sky-300 transition shadow-md shadow-cyan-500/25 cursor-pointer"
                  >
                    <span>Xem chi tiết</span>
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-5 text-center space-y-2">
                <Droplets className="h-8 w-8 text-cyan-300 mx-auto" aria-hidden="true" />
                <p className="text-sm font-bold text-white">AquaSuite Digital Showroom</p>
                <p className="text-xs text-slate-300">
                  Đồng bộ kho hàng thời gian thực &amp; thanh toán VietQR tự động
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dải cam kết dịch vụ có hiệu ứng Hover Lift & Gradient Highlight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200/80 bg-gradient-to-r from-white via-sky-50/35 to-white">
        {TRUST_HIGHLIGHTS.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.title}
              className="group relative p-4 sm:p-4.5 flex items-start gap-3 hover:bg-white transition-colors duration-200 overflow-hidden"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.iconBg} text-white shadow-md group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900 group-hover:text-sky-700 transition-colors">
                  {item.title}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                  {item.desc}
                </p>
              </div>
              <span
                aria-hidden="true"
                className={`absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r ${item.barColor} group-hover:w-full transition-all duration-300`}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}
