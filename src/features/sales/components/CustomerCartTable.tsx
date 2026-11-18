import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Trash2,
  ShoppingCart,
  AlertCircle,
  Plus,
  Minus,
  Package,
  RefreshCw,
  ArrowUpRight,
  Droplets,
} from 'lucide-react'
import { formatVnd } from '../../../shared/lib/money.ts'
import type { CartItemResponse } from '../types/cart.types.ts'

interface CustomerCartTableProps {
  items: CartItemResponse[]
  pendingItemIds: Record<string, boolean>
  isClearing: boolean
  onUpdateQuantity: (cartItemId: string, quantity: number) => Promise<boolean> | void
  onRemoveItem: (cartItemId: string) => Promise<boolean> | void
  onClearCart: () => Promise<boolean> | void
  onOpenProductPicker: () => void
}

function QuantityControl({
  item,
  isPending,
  onUpdateQuantity,
}: {
  item: CartItemResponse
  isPending: boolean
  onUpdateQuantity: (cartItemId: string, quantity: number) => Promise<boolean> | void
}) {
  const [editingValue, setEditingValue] = useState<string | null>(null)

  const maxAvailable = Math.max(0, Math.floor(item.availableQty))
  const isInactive = item.variantStatus.toUpperCase() !== 'ACTIVE'

  const commitQuantity = (raw: string) => {
    setEditingValue(null)
    const parsed = Number.parseInt(raw, 10)
    if (Number.isNaN(parsed) || parsed < 1) {
      return
    }
    const clamped = maxAvailable > 0 ? Math.min(parsed, maxAvailable) : parsed
    if (clamped !== item.quantity) {
      void onUpdateQuantity(item.cartItemId, clamped)
    }
  }

  return (
    <div className="inline-flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
      <button
        type="button"
        aria-label={`Giảm số lượng ${item.productName}`}
        disabled={isPending || item.quantity <= 1 || isInactive}
        onClick={() => void onUpdateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))}
        className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="number"
        min={1}
        max={maxAvailable > 0 ? maxAvailable : undefined}
        aria-label={`Số lượng ${item.productName}`}
        disabled={isPending || isInactive}
        value={editingValue ?? String(item.quantity)}
        onFocus={() => setEditingValue(String(item.quantity))}
        onChange={(e) => setEditingValue(e.target.value)}
        onBlur={(e) => commitQuantity(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur()
          }
          if (e.key === 'Escape') {
            setEditingValue(null)
            e.currentTarget.blur()
          }
        }}
        className="w-12 h-8 text-center text-xs font-bold text-slate-800 border-x border-slate-200 focus:outline-none focus:bg-sky-50/40 disabled:bg-slate-50 tabular-nums"
      />
      <button
        type="button"
        aria-label={`Tăng số lượng ${item.productName}`}
        disabled={
          isPending ||
          isInactive ||
          (maxAvailable > 0 && item.quantity >= maxAvailable)
        }
        onClick={() => void onUpdateQuantity(item.cartItemId, item.quantity + 1)}
        className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function CartItemThumbnail({ item }: { item: CartItemResponse }) {
  const [imgError, setImgError] = useState(false)
  const detailPath = `/products/${encodeURIComponent(item.variantId)}`

  return (
    <Link
      to={detailPath}
      className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-slate-100 overflow-hidden flex items-center justify-center hover:border-sky-300 transition"
    >
      {item.imageUrl && !imgError ? (
        <img
          src={item.imageUrl}
          alt={item.productName}
          loading="lazy"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-slate-900 via-sky-950 to-cyan-950 flex items-center justify-center text-cyan-300">
          <Droplets className="h-5 w-5" aria-hidden="true" />
        </div>
      )}
    </Link>
  )
}

export function CustomerCartTable({
  items,
  pendingItemIds,
  isClearing,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenProductPicker,
}: CustomerCartTableProps) {
  const [confirmClear, setConfirmClear] = useState(false)

  if (items.length === 0) {
    return (
      <div className="border border-dashed border-sky-200 rounded-2xl p-12 text-center bg-white/95 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-100 text-sky-600 flex items-center justify-center mx-auto mb-4">
          <ShoppingCart className="w-7 h-7" />
        </div>
        <h3 className="text-base font-extrabold text-slate-900">
          Giỏ hàng của bạn đang trống
        </h3>
        <p className="text-xs text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
          Hãy chọn thiết bị vệ sinh và phụ kiện phòng tắm từ danh mục để thêm vào giỏ hàng trước khi tiến hành đặt hàng.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            to="/storefront#catalog"
            className="aqua-shine-btn inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white hover:from-sky-500 hover:to-cyan-500 transition shadow-md shadow-sky-500/20"
          >
            <span>Khám phá Showroom</span>
          </Link>
          <button
            type="button"
            onClick={onOpenProductPicker}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Chọn nhanh theo SKU</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-sky-200/80 rounded-2xl bg-white/95 overflow-hidden shadow-md shadow-sky-950/5">
      <div className="px-5 py-3.5 bg-gradient-to-r from-slate-50 via-sky-50/40 to-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-sky-600" />
          <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
            Danh sách sản phẩm trong giỏ ({items.length})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenProductPicker}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm sản phẩm</span>
          </button>

          {!confirmClear ? (
            <button
              type="button"
              disabled={isClearing}
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-xl">
              <span className="text-[11px] font-medium text-rose-700">Xác nhận xóa hết?</span>
              <button
                type="button"
                disabled={isClearing}
                onClick={async () => {
                  await onClearCart()
                  setConfirmClear(false)
                }}
                className="px-2 py-0.5 bg-rose-600 text-white text-[11px] font-semibold rounded-lg hover:bg-rose-700 cursor-pointer"
              >
                Đồng ý
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-2 py-0.5 text-slate-600 text-[11px] font-medium hover:text-slate-800 cursor-pointer"
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700">
          <thead className="bg-slate-50/90 text-slate-600 text-[11px] uppercase border-b border-slate-200 font-bold">
            <tr>
              <th className="px-5 py-3">Sản phẩm / Biến thể SKU</th>
              <th className="px-4 py-3 text-right">Đơn giá</th>
              <th className="px-4 py-3 text-center">Số lượng</th>
              <th className="px-4 py-3 text-center">Tồn khả dụng</th>
              <th className="px-4 py-3 text-right">Thành tiền</th>
              <th className="px-4 py-3 text-center w-14">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => {
              const isPending = Boolean(pendingItemIds[item.cartItemId])
              const isInactive = item.variantStatus.toUpperCase() !== 'ACTIVE'
              const isOutOfStock = !item.inStock || item.availableQty < item.quantity
              const detailPath = `/products/${encodeURIComponent(item.variantId)}`

              return (
                <tr
                  key={item.cartItemId}
                  className={`transition-colors ${
                    isInactive || isOutOfStock
                      ? 'bg-amber-50/30 hover:bg-amber-50/50'
                      : 'hover:bg-sky-50/35'
                  }`}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-start gap-3">
                      <CartItemThumbnail item={item} />
                      <div className="min-w-0">
                        <Link
                          to={detailPath}
                          className="font-bold text-slate-900 hover:text-sky-700 text-sm leading-snug transition-colors block"
                        >
                          {item.productName}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 text-slate-700">
                            SKU: {item.sku}
                          </span>
                          {item.variantName && (
                            <span className="text-xs text-slate-500">
                              Phân loại: <strong className="text-slate-700">{item.variantName}</strong>
                            </span>
                          )}
                          {item.unit && (
                            <span className="text-[11px] text-slate-400">
                              ({item.unit})
                            </span>
                          )}
                        </div>

                        {isInactive && (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Sản phẩm đã ngừng kinh doanh, vui lòng xóa khỏi giỏ</span>
                          </div>
                        )}

                        {!isInactive && isOutOfStock && (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>
                              Số lượng vượt tồn kho khả dụng (còn {item.availableQty} {item.unit || 'sản phẩm'})
                            </span>
                          </div>
                        )}

                        {item.priceChanged && (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>
                              Đơn giá đã cập nhật từ {formatVnd(item.unitPrice)} sang {formatVnd(item.currentSellingPrice)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                    <div className="font-bold text-slate-800">
                      {formatVnd(item.currentSellingPrice)}
                    </div>
                    {item.priceChanged && (
                      <div className="text-[11px] text-slate-400 line-through">
                        {formatVnd(item.unitPrice)}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <div className="inline-flex flex-col items-center gap-1">
                      <QuantityControl
                        item={item}
                        isPending={isPending}
                        onUpdateQuantity={onUpdateQuantity}
                      />
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-sky-600">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          Đang lưu...
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-center whitespace-nowrap tabular-nums">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        item.availableQty > 0
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {item.availableQty} {item.unit || 'SP'}
                    </span>
                  </td>

                  <td className="px-4 py-3.5 text-right whitespace-nowrap font-extrabold text-sky-700 text-sm tabular-nums">
                    {formatVnd(item.lineTotal)}
                  </td>

                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      aria-label={`Xóa ${item.productName}`}
                      disabled={isPending}
                      onClick={() => void onRemoveItem(item.cartItemId)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
