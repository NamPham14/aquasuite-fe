import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ShoppingBag } from 'lucide-react'
import { formatVnd } from '../../../shared/lib/money.ts'

interface StorefrontQuickAccessStripProps {
  isAuthenticated: boolean
  username?: string
  totalCartItems: number
  cartSubtotal: number
  totalCatalogCount?: number
  comboCount?: number
  onSelectCollectionCategory?: (category: string) => void
}

/**
 * Dải Bộ sưu tập Tuyển chọn (Curated Collections Lookbook) theo phong cách showroom kiến trúc.
 * Trình bày 3 phân khu không gian phòng tắm kèm lối tắt tra cứu bảo hành Serial và thanh nhắc giỏ hàng tối giản.
 */
export function StorefrontQuickAccessStrip({
  isAuthenticated,
  username,
  totalCartItems,
  cartSubtotal,
  totalCatalogCount = 24,
  comboCount = 3,
  onSelectCollectionCategory,
}: StorefrontQuickAccessStripProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})

  const handleBrowseCategory = (category: string) => {
    if (onSelectCollectionCategory) {
      onSelectCollectionCategory(category)
    }
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section
      aria-label="Bộ sưu tập không gian và dịch vụ khách hàng"
      className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-12 sm:py-16 border-b border-[#E6E2DA] space-y-8"
    >
      {/* Thanh nhắc giỏ hàng tối giản khi đang có hàng */}
      {totalCartItems > 0 && (
        <div className="border-l-2 border-[#171614] bg-[#F2EFE9] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-[#171614]">
            <ShoppingBag className="h-4 w-4 text-[#171614]" aria-hidden="true" />
            <span>
              Giỏ hàng hiện có <strong className="font-semibold">{totalCartItems} sản phẩm</strong>
              <span className="mx-2 text-[#A8A298]" aria-hidden="true">/</span>
              <span className="tabular-nums font-semibold">{formatVnd(cartSubtotal)}</span>
            </span>
          </div>
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] border-b border-[#171614] pb-0.5 hover:text-[#6B6760] hover:border-[#6B6760] transition-colors"
          >
            <span>Mở giỏ &amp; Thanh toán</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}

      {/* Tiêu đề khu vực + Lối tắt dịch vụ */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#78736A]">
            Không gian tuyển chọn
          </p>
          <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-[#171614] mt-1.5 tracking-[-0.01em]">
            Phân khu Thiết bị &amp; Dịch vụ Khách hàng
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs text-[#57534E]">
          <Link
            to={isAuthenticated ? '/profile/warranties' : '/login'}
            className="inline-flex items-center gap-1.5 border-b border-[#D6D2C9] pb-0.5 hover:text-[#171614] hover:border-[#171614] transition-colors"
          >
            <span>Bảo hành điện tử Serial</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
          <Link
            to={isAuthenticated ? '/profile/warranty-tickets' : '/login'}
            className="inline-flex items-center gap-1.5 border-b border-[#D6D2C9] pb-0.5 hover:text-[#171614] hover:border-[#171614] transition-colors"
          >
            <span>
              {isAuthenticated
                ? `Hỗ trợ kỹ thuật (${username || 'Hồ sơ'})`
                : 'Đăng nhập tra cứu bảo hành'}
            </span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* 3 Khối Lookbook Kiến trúc (Không viền bo nhựa, ảnh 4:3 lớn, chữ biên tập bên dưới) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        <button
          type="button"
          onClick={() => handleBrowseCategory('Chậu rửa')}
          className="group text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
        >
          <div className="aspect-[4/3] w-full bg-[#ECE8E0] overflow-hidden">
            <img
              src="/images/collection-ceramic.jpg"
              alt="Chậu rửa sứ đặt bàn và vòi gắn tường niken mờ"
              className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
            />
          </div>
          <div className="pt-4 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
              01 &middot; Sứ vệ sinh &amp; Lavabo
            </p>
            <h3 className="font-editorial text-xl text-[#171614] group-hover:underline underline-offset-4 decoration-[#A8A298]">
              Men sứ kháng khuẩn &amp; Chậu đặt bàn
            </h3>
            <p className="text-xs text-[#6B6760] leading-relaxed">
              TOTO CeFiONtect, INAX Aqua Ceramic và chậu điêu khắc Kohler ({totalCatalogCount} mẫu sẵn kho).
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleBrowseCategory('Sen tắm')}
          className="group text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
        >
          <div className="aspect-[4/3] w-full bg-[#ECE8E0] overflow-hidden">
            {!failedImages['shower'] ? (
              <img
                src="https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1000&q=85"
                alt="Sen cây nhiệt độ và vòi chậu phòng tắm hiện đại"
                onError={() => setFailedImages((prev) => ({ ...prev, shower: true }))}
                className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-[#EAE5DC] text-[#57534E] font-editorial text-2xl">
                GROHE &middot; TOTO
              </div>
            )}
          </div>
          <div className="pt-4 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
              02 &middot; Sen vòi điều nhiệt
            </p>
            <h3 className="font-editorial text-xl text-[#171614] group-hover:underline underline-offset-4 decoration-[#A8A298]">
              Hệ thống sen cây &amp; Vòi đồng thau
            </h3>
            <p className="text-xs text-[#6B6760] leading-relaxed">
              Công nghệ ổn định nhiệt SMA, Grohe TurboStat và lớp mạ chống ăn mòn chuẩn Nhật – Đức.
            </p>
          </div>
        </button>

        <Link
          to="/storefront#combos"
          className="group text-left block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#171614]"
        >
          <div className="aspect-[4/3] w-full bg-[#ECE8E0] overflow-hidden">
            {!failedImages['combo'] ? (
              <img
                src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1000&q=85"
                alt="Giải pháp phòng tắm đồng bộ biệt thự và căn hộ"
                onError={() => setFailedImages((prev) => ({ ...prev, combo: true }))}
                className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-[#EAE5DC] text-[#57534E] font-editorial text-2xl">
                COMBO DỰ ÁN
              </div>
            )}
          </div>
          <div className="pt-4 space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
              03 &middot; Giải pháp đồng bộ ({comboCount} bộ)
            </p>
            <h3 className="font-editorial text-xl text-[#171614] group-hover:underline underline-offset-4 decoration-[#A8A298]">
              Combo phòng tắm biệt thự &amp; dự án
            </h3>
            <p className="text-xs text-[#6B6760] leading-relaxed">
              Cấu hình tương thích kỹ thuật lắp đặt và tối ưu chi phí hoàn thiện lên tới 18%.
            </p>
          </div>
        </Link>
      </div>
    </section>
  )
}
