import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Plus } from 'lucide-react'
import { formatVnd } from '../../../shared/lib/money.ts'
import type { CatalogItemOption } from '../data/catalogProducts.data.ts'

interface StorefrontProductCardProps {
  item: CatalogItemOption
  quantityInCart: number
  isAdding: boolean
  animationIndex?: number
  onAddToCart: (
    variantId: string,
    quantity: number,
    options?: { isCombo?: boolean },
  ) => Promise<boolean>
  onOpenDetail?: (item: CatalogItemOption) => void
}

/**
 * Thẻ sản phẩm Lookbook tối giản (Gallery Card — không viền hộp nhựa, không badge nhấp nháy).
 * Đặt trọng tâm vào ảnh sản phẩm, thương hiệu, mã SKU, giá bán và nút thêm nhanh vào giỏ.
 */
export function StorefrontProductCard({
  item,
  quantityInCart,
  isAdding,
  animationIndex = 0,
  onAddToCart,
  onOpenDetail,
}: StorefrontProductCardProps) {
  const [imgError, setImgError] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  const detailPath = `/products/${encodeURIComponent(item.variantId)}`
  const inStock = item.availableStock > 0

  const handleQuickAdd = async () => {
    if (!inStock || isAdding) return
    const ok = await onAddToCart(item.variantId, 1, { isCombo: item.isCombo })
    if (ok) {
      setJustAdded(true)
      window.setTimeout(() => setJustAdded(false), 1600)
    }
  }

  return (
    <article
      style={{ animationDelay: `${Math.min(animationIndex, 8) * 30}ms` }}
      className="animate-aqua-card-in group flex flex-col"
    >
      {/* Khung ảnh Lookbook 4:5 (Nền đá sáng, zoom êm khi hover, thanh thêm nhanh dưới đáy ảnh trên desktop) */}
      <div className="relative aspect-[4/4.3] w-full bg-[#EFECE6] overflow-hidden">
        <Link
          to={detailPath}
          onClick={() => onOpenDetail?.(item)}
          className="block h-full w-full focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#171614]"
        >
          {item.imageUrl && !imgError ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="h-full w-full bg-[#EFECE6] flex flex-col items-center justify-center p-6 text-center">
              <span className="font-editorial text-2xl tracking-[0.06em] text-[#57534E]">
                {item.brand}
              </span>
              <span className="mt-2 border-t border-[#D6D1C7] pt-2 text-[10px] font-mono tracking-[0.14em] text-[#78736A]">
                {item.sku}
              </span>
            </div>
          )}
        </Link>

        {/* Chỉ hiện tag góc tối giản khi hết hàng hoặc đã có trong giỏ */}
        {!inStock && (
          <span className="pointer-events-none absolute top-3 left-3 bg-[#171614]/85 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-medium text-[#FAF9F6]">
            Tạm hết hàng
          </span>
        )}
        {quantityInCart > 0 && (
          <span className="pointer-events-none absolute top-3 right-3 bg-[#FAF9F6]/95 border border-[#E2DDD4] px-2.5 py-1 text-[10px] font-semibold tracking-wide text-[#171614] tabular-nums">
            Trong giỏ: {quantityInCart}
          </span>
        )}

        {/* Thanh thêm nhanh vào giỏ khi hover trên desktop */}
        <div className="hidden sm:block absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0 transition-transform duration-200 ease-out">
          <button
            type="button"
            disabled={!inStock || isAdding}
            onClick={() => void handleQuickAdd()}
            className={`w-full h-10 flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.16em] font-semibold transition-colors cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed ${
              justAdded
                ? 'bg-[#245C42] text-white'
                : 'bg-[#171614]/92 text-[#FAF9F6] hover:bg-[#171614]'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Đã thêm vào giỏ</span>
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{inStock ? 'Thêm nhanh vào giỏ' : 'Tạm hết hàng'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Typography biên tập bên dưới ảnh */}
      <div className="pt-3.5 flex-1 flex flex-col justify-between gap-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-[#78736A]">
            <span className="truncate">
              {item.brand} &middot; {item.category}
            </span>
            <span className="font-mono shrink-0">{item.sku}</span>
          </div>

          <h3 className="text-[14px] font-medium text-[#171614] leading-[1.4] line-clamp-2 min-h-[2.45rem]">
            <Link
              to={detailPath}
              onClick={() => onOpenDetail?.(item)}
              className="hover:underline underline-offset-4 decoration-[#A8A298] focus-visible:outline-2 focus-visible:outline-[#171614]"
            >
              {item.name}
            </Link>
          </h3>
        </div>

        <div className="pt-2 border-t border-[#E6E2DA] flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[14px] font-semibold text-[#171614] tabular-nums">
              {formatVnd(item.sellingPrice)}
            </span>
            <span className="text-[11px] text-[#78736A] ml-1">/ {item.unit}</span>
          </div>

          {!item.isCombo || inStock ? (
            <button
              type="button"
              disabled={!inStock || isAdding}
              onClick={() => void handleQuickAdd()}
              aria-label={`Thêm ${item.name} vào giỏ hàng`}
              className="shrink-0 text-[11px] uppercase tracking-[0.12em] font-semibold text-[#171614] border-b border-[#171614] pb-0.5 hover:text-[#6B6760] hover:border-[#6B6760] disabled:opacity-40 disabled:border-transparent cursor-pointer transition-colors"
            >
              {justAdded ? 'Đã thêm ✓' : '+ Thêm giỏ'}
            </button>
          ) : (
            <Link
              to={detailPath}
              onClick={() => onOpenDetail?.(item)}
              className="shrink-0 text-[11px] uppercase tracking-[0.12em] font-semibold text-[#171614] border-b border-[#171614] pb-0.5 hover:text-[#6B6760] hover:border-[#6B6760] transition-colors"
            >
              Xem cấu hình
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
