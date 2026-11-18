import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Check,
  Droplets,
  Eye,
  Layers,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react'
import { formatVnd } from '../../../shared/lib/money.ts'
import type { CatalogItemOption } from '../data/catalogProducts.data.ts'

interface StorefrontProductCardProps {
  item: CatalogItemOption
  quantityInCart: number
  isAdding: boolean
  animationIndex?: number
  onAddToCart: (variantId: string, quantity: number) => Promise<boolean>
  onOpenDetail?: (item: CatalogItemOption) => void
}

/**
 * Thẻ hiển thị sản phẩm thiết bị vệ sinh trên Trang chủ Khách hàng (AquaSuite Storefront).
 * Trang bị hiệu ứng nâng thẻ 3D, overlay xem nhanh khi di chuột, placeholder studio và điều hướng sang trang chi tiết sản phẩm.
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
  const [selectedQty, setSelectedQty] = useState(1)
  const [justAdded, setJustAdded] = useState(false)

  const detailPath = `/products/${encodeURIComponent(item.variantId)}`

  const inStock = item.availableStock > 0
  const maxQty = inStock ? Math.max(1, Math.floor(item.availableStock)) : 1

  const specEntries = item.specifications
    ? Object.entries(item.specifications)
        .filter(
          ([key, val]) =>
            typeof val === 'string' &&
            !key.toLowerCase().includes('pdf') &&
            !key.toLowerCase().includes('cad'),
        )
        .slice(0, 3)
    : []

  const handleAddClick = async () => {
    const ok = await onAddToCart(item.variantId, selectedQty)
    if (ok) {
      setJustAdded(true)
      window.setTimeout(() => setJustAdded(false), 1600)
    }
  }

  return (
    <article
      style={{ animationDelay: `${Math.min(animationIndex, 8) * 45}ms` }}
      className="animate-aqua-card-in group relative rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:-translate-y-1.5 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-900/10 transition-all duration-300 flex flex-col overflow-hidden"
    >
      {/* Viền sáng trên đỉnh thẻ khi hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
      />

      {/* Khung ảnh 4:3 */}
      <Link
        to={detailPath}
        onClick={() => onOpenDetail?.(item)}
        className="relative aspect-4/3 w-full bg-slate-100 border-b border-slate-100 overflow-hidden cursor-pointer flex items-center justify-center"
      >
        {item.imageUrl && !imgError ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          /* Studio Placeholder sang trọng khi sản phẩm chưa có ảnh upload */
          <div className="relative h-full w-full bg-gradient-to-br from-slate-900 via-sky-950 to-cyan-950 flex flex-col items-center justify-center p-4 text-center overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 aqua-hero-grid opacity-45"
            />
            <div
              aria-hidden="true"
              className="absolute h-28 w-28 rounded-full border border-cyan-400/20 group-hover:scale-125 transition-transform duration-500"
            />
            <div
              aria-hidden="true"
              className="absolute h-40 w-40 rounded-full border border-sky-400/10 group-hover:scale-110 transition-transform duration-700"
            />
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400/25 to-sky-500/25 border border-cyan-300/35 text-cyan-200 shadow-lg shadow-cyan-950/50 mb-2 group-hover:scale-110 transition-transform duration-300">
              <Droplets className="h-6 w-6" aria-hidden="true" />
            </div>
            <span className="relative z-10 text-xs font-bold text-white tracking-wide">
              {item.brand}
            </span>
            <span className="relative z-10 text-[10px] font-mono text-cyan-200/80 mt-0.5 bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
              {item.sku}
            </span>
          </div>
        )}

        {/* Lớp phủ mờ & nút Xem thông số khi di chuột */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-slate-900 shadow-lg">
            <Eye className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            Xem thông số kỹ thuật
          </span>
        </div>

        {/* Badges góc trên trái */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5 z-10">
          {item.isCombo ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md shadow-amber-500/30">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              GÓI COMBO
            </span>
          ) : (
            <span className="rounded-full bg-slate-900/75 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
              {item.brand}
            </span>
          )}
        </div>

        {/* Badge tồn kho góc trên phải */}
        <div className="absolute top-2.5 right-2.5 z-10">
          {inStock ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/95 backdrop-blur-md border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 tabular-nums shadow-xs">
              <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Còn {item.availableStock} {item.unit}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50/95 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold text-rose-800 shadow-xs">
              Tạm hết hàng
            </span>
          )}
        </div>

        {/* Badge Đã có trong giỏ */}
        {quantityInCart > 0 && (
          <div className="absolute bottom-2.5 left-2.5 z-10 group-hover:opacity-0 transition-opacity">
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-600 to-cyan-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md tabular-nums">
              <ShoppingCart className="h-3 w-3" aria-hidden="true" />
              Đã có {quantityInCart} trong giỏ
            </span>
          </div>
        )}
      </Link>

      {/* Nội dung thẻ */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="font-semibold text-sky-700/80 truncate">
              {item.category}
            </span>
            <span className="font-mono font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
              {item.sku}
            </span>
          </div>

          <h3 className="text-sm font-extrabold text-slate-900 line-clamp-2 leading-snug min-h-[2.5rem]">
            <Link
              to={detailPath}
              onClick={() => onOpenDetail?.(item)}
              className="text-left group-hover:text-sky-700 transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 cursor-pointer block"
            >
              {item.name}
            </Link>
          </h3>

          {item.description && (
            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Chips thông số kỹ thuật ngắn */}
          {specEntries.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {specEntries.map(([key, val]) => (
                <span
                  key={key}
                  className="inline-block rounded-md bg-sky-50/70 border border-sky-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 truncate max-w-full"
                  title={`${key}: ${String(val)}`}
                >
                  {String(val)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Khu vực Giá & Nút thao tác */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                Giá niêm yết
              </span>
              <span className="text-base sm:text-lg font-black bg-gradient-to-r from-sky-700 via-cyan-600 to-blue-700 bg-clip-text text-transparent tabular-nums">
                {formatVnd(item.sellingPrice)}
              </span>
              <span className="text-xs text-slate-500 ml-1">/ {item.unit}</span>
            </div>

            <Link
              to={detailPath}
              onClick={() => onOpenDetail?.(item)}
              aria-label={`Xem chi tiết ${item.name}`}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Chi tiết</span>
            </Link>
          </div>

          {!item.isCombo ? (
            <div className="flex items-center gap-2">
              {/* Bộ chọn số lượng */}
              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 h-9 shadow-2xs">
                <button
                  type="button"
                  disabled={!inStock || selectedQty <= 1 || isAdding}
                  onClick={() => setSelectedQty((q) => Math.max(1, q - 1))}
                  aria-label="Giảm số lượng"
                  className="px-2 h-full text-slate-600 hover:text-sky-700 disabled:opacity-40 cursor-pointer transition"
                >
                  <Minus className="h-3 w-3" aria-hidden="true" />
                </button>
                <span className="w-7 text-center text-xs font-bold text-slate-900 tabular-nums">
                  {selectedQty}
                </span>
                <button
                  type="button"
                  disabled={!inStock || selectedQty >= maxQty || isAdding}
                  onClick={() => setSelectedQty((q) => Math.min(maxQty, q + 1))}
                  aria-label="Tăng số lượng"
                  className="px-2 h-full text-slate-600 hover:text-sky-700 disabled:opacity-40 cursor-pointer transition"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                disabled={!inStock || isAdding}
                onClick={() => void handleAddClick()}
                className={`aqua-shine-btn flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-white transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  justAdded
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md shadow-emerald-500/30 scale-[1.02]'
                    : 'bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 shadow-md shadow-sky-500/20 hover:shadow-lg hover:shadow-sky-500/30'
                }`}
              >
                {justAdded ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Đã thêm</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Thêm vào giỏ</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <Link
              to={detailPath}
              onClick={() => onOpenDetail?.(item)}
              className="aqua-shine-btn w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3 text-xs font-bold text-amber-900 hover:from-amber-100 hover:to-orange-100 transition cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
              <span>Xem cấu hình gói Combo ({item.components?.length ?? 0} thiết bị)</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

interface StorefrontProductDetailModalProps {
  product: CatalogItemOption | null
  quantityInCart: number
  isAdding: boolean
  onClose: () => void
  onAddToCart: (variantId: string, quantity: number) => Promise<boolean>
}

/**
 * Modal xem chi tiết kỹ thuật sản phẩm dành riêng cho Khách hàng trên Storefront.
 */
export function StorefrontProductDetailModal({
  product,
  quantityInCart,
  isAdding,
  onClose,
  onAddToCart,
}: StorefrontProductDetailModalProps) {
  const [imgError, setImgError] = useState(false)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    if (!product) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [product, onClose])

  if (!product) return null

  const inStock = product.availableStock > 0
  const maxQty = inStock ? Math.max(1, Math.floor(product.availableStock)) : 1

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết sản phẩm ${product.name}`}
      onClick={onClose}
    >
      <div
        className="animate-aqua-modal-in relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-sky-200/80 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ribbon Gradient trên đỉnh Modal */}
        <div
          aria-hidden="true"
          className="h-1 w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-indigo-500"
        />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 via-sky-50/40 to-white">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-500/25">
              {product.isCombo ? (
                <Layers className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Package className="w-4 h-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold text-sky-700 tracking-wider block">
                Thông tin kỹ thuật &amp; Giá bán
              </span>
              <h3 className="text-xs font-bold text-slate-900 font-mono">
                SKU: {product.sku}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết sản phẩm"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            <div className="sm:col-span-5 aspect-4/3 rounded-2xl border border-slate-200 bg-slate-100 overflow-hidden relative flex items-center justify-center shadow-sm">
              {product.imageUrl && !imgError ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-slate-900 via-sky-950 to-cyan-950 flex flex-col items-center justify-center text-cyan-200 p-4 text-center relative">
                  <div aria-hidden="true" className="absolute inset-0 aqua-hero-grid opacity-45" />
                  <Droplets className="relative z-10 w-10 h-10 mb-1.5 text-cyan-300" aria-hidden="true" />
                  <span className="relative z-10 text-xs font-bold text-white">{product.brand}</span>
                </div>
              )}
            </div>

            <div className="sm:col-span-7 space-y-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  {product.brand}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  {product.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                  ĐVT: {product.unit}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                {product.name}
              </h2>

              <div className="p-3.5 rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50/60 via-white to-cyan-50/40 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 font-medium">Giá bán niêm yết:</span>
                  <span className="text-lg font-black bg-gradient-to-r from-sky-700 to-cyan-600 bg-clip-text text-transparent tabular-nums">
                    {formatVnd(product.sellingPrice)} / {product.unit}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/70">
                  <span className="text-xs text-slate-500 font-medium">Tình trạng kho:</span>
                  {inStock ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 tabular-nums">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                      Còn hàng ({product.availableStock} {product.unit})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700">
                      <span className="w-2 h-2 rounded-full bg-rose-500" aria-hidden="true" />
                      Tạm hết hàng
                    </span>
                  )}
                </div>
              </div>

              {product.description && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {product.description}
                </p>
              )}
            </div>
          </div>

          {product.components && product.components.length > 0 && (
            <div className="rounded-2xl border border-amber-200 p-4 bg-gradient-to-br from-amber-50/70 to-orange-50/30 space-y-2.5">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-700" aria-hidden="true" />
                <span>Danh mục thiết bị trong gói Combo ({product.components.length} món):</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {product.components.map((comp, idx) => (
                  <div
                    key={comp}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-amber-200/70 text-xs text-slate-700 shadow-2xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center font-bold text-[10px] text-white shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate font-medium">{comp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-sky-600" aria-hidden="true" />
                <span>Thông số kỹ thuật &amp; Bảo hành</span>
              </h4>
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(product.specifications).map(([key, val], idx) => (
                      <tr
                        key={key}
                        className={idx % 2 === 0 ? 'bg-white' : 'bg-sky-50/30'}
                      >
                        <td className="py-2.5 px-3.5 w-1/3 font-semibold text-slate-500 border-r border-slate-100">
                          {key}
                        </td>
                        <td className="py-2.5 px-3.5 font-semibold text-slate-800 break-all">
                          {Array.isArray(val) ? val.join(', ') : String(val)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50/90 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            Đóng
          </button>

          {!product.isCombo && (
            <div className="flex items-center gap-2.5">
              <div className="inline-flex items-center rounded-xl border border-slate-300 bg-white h-9">
                <button
                  type="button"
                  disabled={!inStock || qty <= 1 || isAdding}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-2.5 h-full text-slate-600 hover:text-sky-700 disabled:opacity-40 cursor-pointer"
                >
                  <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <span className="w-8 text-center text-xs font-bold text-slate-900 tabular-nums">
                  {qty}
                </span>
                <button
                  type="button"
                  disabled={!inStock || qty >= maxQty || isAdding}
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  className="px-2.5 h-full text-slate-600 hover:text-sky-700 disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                disabled={!inStock || isAdding}
                onClick={() => {
                  void onAddToCart(product.variantId, qty).then((ok) => {
                    if (ok) onClose()
                  })
                }}
                className="aqua-shine-btn inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 via-cyan-600 to-blue-600 px-4 py-2 text-xs font-bold text-white hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 transition cursor-pointer shadow-md shadow-sky-500/25"
              >
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                <span>
                  {quantityInCart > 0
                    ? `Thêm vào giỏ (Đang có ${quantityInCart})`
                    : 'Thêm vào giỏ hàng'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
