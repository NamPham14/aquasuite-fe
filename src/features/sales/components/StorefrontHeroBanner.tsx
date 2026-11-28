import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Search,
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
  { label: 'Lavabo', keyword: 'Chậu rửa' },
  { label: 'Sen cây', keyword: 'Sen' },
  { label: 'INAX Aqua Ceramic', keyword: 'INAX' },
  { label: 'Phụ kiện', keyword: 'Gioăng' },
]

/**
 * Full-bleed Architectural Hero cho Showroom AquaSuite.
 * Kết hợp ảnh không gian phòng tắm thực tế, tiêu đề serif biên tập, thanh tìm kiếm sắc nét và tiêu điểm sản phẩm tinh giản.
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
  const [isUserPaused, setIsUserPaused] = useState(false)
  const [isInteracting, setIsInteracting] = useState(false)

  const spotlightList = featuredItems.slice(0, 4)
  const safeIndex = spotlightList.length > 0 ? spotlightIndex % spotlightList.length : 0
  const activeSpotlight = spotlightList[safeIndex]

  useEffect(() => {
    if (spotlightList.length <= 1 || isUserPaused || isInteracting) return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlightList.length)
    }, 6500)
    return () => window.clearInterval(timer)
  }, [spotlightList.length, isUserPaused, isInteracting])

  return (
    <section
      aria-label="Giới thiệu Showroom và tìm kiếm thiết bị vệ sinh"
      className="relative w-full min-h-[520px] lg:min-h-[600px] flex items-end bg-[#171614] overflow-hidden"
    >
      {/* Ảnh nền kiến trúc showroom full-bleed */}
      <img
        src="/images/hero-sanctuary.jpg"
        alt="Không gian phòng tắm tối giản sang trọng với bồn tắm đá và vòi đồng mờ"
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* Lớp chuyển tối biên tập chỉ tại vùng chữ để giữ độ tương phản cao và độ sáng tự nhiên bên phải */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#121110]/88 via-[#121110]/45 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#121110]/78 via-transparent to-black/25"
      />

      <div className="relative z-10 max-w-[1440px] w-full mx-auto px-5 sm:px-8 lg:px-12 py-10 sm:py-14 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-end">
          {/* Cột trái: Tiêu đề biên tập + Thanh tìm kiếm sắc nét */}
          <div className="lg:col-span-8 space-y-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#DFD8CC] font-medium">
              Thám Vân Home &middot; Bộ sưu tập 2026 &middot; {totalCatalogCount} mẫu sẵn kho
            </p>

            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[54px] font-normal text-white leading-[1.08] tracking-[-0.015em] max-w-2xl">
              Nghệ thuật của nước,
              <br />
              <em className="italic text-[#EDE4D5] font-normal">tĩnh tại trong từng đường nét.</em>
            </h1>

            <p className="text-xs sm:text-sm text-[#D8D3CA] leading-relaxed max-w-lg font-light">
              Thiết bị vệ sinh TOTO, INAX, KOHLER &amp; GROHE chính hãng — tồn kho thực tế tại showroom, thanh toán VietQR và bảo hành điện tử theo từng Serial.
            </p>

            {/* Thanh tìm kiếm kiến trúc */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="pt-2 max-w-lg"
            >
              <label htmlFor="storefront-hero-search" className="sr-only">
                Tìm kiếm thiết bị vệ sinh theo tên, mã SKU hoặc thông số
              </label>
              <div className="flex items-stretch h-12 bg-[#FAF9F6] border border-white/25 rounded-[2px] overflow-hidden shadow-lg">
                <div className="relative flex-1 flex items-center min-w-0">
                  <Search
                    className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#78736A]"
                    aria-hidden="true"
                  />
                  <input
                    id="storefront-hero-search"
                    type="search"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="Tìm tên sản phẩm, mã SKU hoặc thương hiệu..."
                    className="h-full w-full bg-transparent pl-10 pr-8 text-xs sm:text-sm text-[#171614] placeholder:text-[#8A857C] focus:outline-none"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => onSearchChange('')}
                      aria-label="Xóa từ khóa tìm kiếm"
                      className="absolute right-2 inline-flex h-7 w-7 items-center justify-center text-[#78736A] hover:text-[#171614] cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="bg-[#171614] text-[#FAF9F6] hover:bg-[#2E2C28] px-5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors cursor-pointer shrink-0"
                >
                  Tìm kiếm
                </button>
              </div>

              {/* Từ khóa gợi ý dạng text link thanh mảnh */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
                <span className="uppercase tracking-[0.16em] text-[#A8A298]">Gợi ý:</span>
                {QUICK_KEYWORDS.map((item) => {
                  const isSelected =
                    searchTerm.trim().toLowerCase() === item.keyword.toLowerCase()
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onSelectQuickKeyword(isSelected ? '' : item.keyword)}
                      className={`pb-0.5 border-b transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white ${
                        isSelected
                          ? 'border-white text-white font-semibold'
                          : 'border-transparent text-[#D8D3CA] hover:text-white hover:border-white/60'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </form>
          </div>

          {/* Cột phải: Ghi chú Tiêu điểm biên tập (không đóng khung hộp nhựa) */}
          <div
            className="lg:col-span-4 lg:justify-self-end w-full lg:max-w-xs"
            onMouseEnter={() => setIsInteracting(true)}
            onMouseLeave={() => setIsInteracting(false)}
            onFocusCapture={() => setIsInteracting(true)}
            onBlurCapture={() => setIsInteracting(false)}
          >
            {activeSpotlight && (
              <div className="border-l border-white/35 pl-5 py-1 text-white space-y-2.5 bg-[#121110]/35 lg:bg-transparent backdrop-blur-[2px] lg:backdrop-blur-none pr-3 lg:pr-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#D8D3CA]">
                    Tiêu điểm ({safeIndex + 1}/{spotlightList.length})
                  </span>
                  {spotlightList.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={
                          isUserPaused
                            ? 'Tiếp tục chuyển sản phẩm tiêu điểm'
                            : 'Tạm dừng chuyển sản phẩm tiêu điểm'
                        }
                        aria-pressed={isUserPaused}
                        onClick={() => setIsUserPaused((p) => !p)}
                        className="h-7 w-7 inline-flex items-center justify-center text-[#D8D3CA] hover:text-white transition-colors cursor-pointer"
                      >
                        {isUserPaused ? (
                          <Play className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <Pause className="h-3 w-3" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="Sản phẩm tiêu điểm trước"
                        onClick={() =>
                          setSpotlightIndex(
                            (prev) => (prev - 1 + spotlightList.length) % spotlightList.length,
                          )
                        }
                        className="h-7 w-7 inline-flex items-center justify-center text-[#D8D3CA] hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label="Sản phẩm tiêu điểm tiếp theo"
                        onClick={() =>
                          setSpotlightIndex((prev) => (prev + 1) % spotlightList.length)
                        }
                        className="h-7 w-7 inline-flex items-center justify-center text-[#D8D3CA] hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#B8B2A6]">
                    {activeSpotlight.brand} &middot; {activeSpotlight.sku}
                  </p>
                  <h2 className="font-editorial text-lg font-normal text-white leading-snug mt-0.5 line-clamp-2">
                    <Link
                      to={`/products/${encodeURIComponent(activeSpotlight.variantId)}`}
                      onClick={() => onOpenFeatured?.(activeSpotlight)}
                      className="hover:underline underline-offset-4"
                    >
                      {activeSpotlight.name}
                    </Link>
                  </h2>
                </div>

                <div className="flex items-center justify-between gap-4 pt-1">
                  <span className="text-sm font-medium text-[#EDE4D5] tabular-nums">
                    {formatVnd(activeSpotlight.sellingPrice)}
                  </span>
                  <Link
                    to={`/products/${encodeURIComponent(activeSpotlight.variantId)}`}
                    onClick={() => onOpenFeatured?.(activeSpotlight)}
                    className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-white border-b border-white/50 pb-0.5 hover:border-white transition-colors"
                  >
                    <span>Xem chi tiết</span>
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
