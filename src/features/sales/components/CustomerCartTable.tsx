import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Trash2,
  ShoppingCart,
  AlertCircle,
  Plus,
  Minus,
  RefreshCw,
  ArrowUpRight,
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
    <div className="inline-flex items-center border border-[#D6D1C7] bg-[#FAF9F6]">
      <button
        type="button"
        aria-label={`Giảm số lượng ${item.productName}`}
        disabled={isPending || item.quantity <= 1 || isInactive}
        onClick={() => void onUpdateQuantity(item.cartItemId, Math.max(1, item.quantity - 1))}
        className="w-8 h-8 flex items-center justify-center text-[#57534E] hover:text-[#171614] disabled:opacity-35 transition-colors cursor-pointer"
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
        className="w-11 h-8 text-center text-xs font-semibold text-[#171614] bg-white border-x border-[#E6E2DA] focus:outline-none disabled:bg-[#F2EFE9] tabular-nums"
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
        className="w-8 h-8 flex items-center justify-center text-[#57534E] hover:text-[#171614] disabled:opacity-35 transition-colors cursor-pointer"
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
      className="h-16 w-16 shrink-0 border border-[#E6E2DA] bg-[#EFECE6] overflow-hidden flex items-center justify-center hover:border-[#171614] transition-colors"
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
        <div className="h-full w-full bg-[#EFECE6] flex flex-col items-center justify-center px-1 text-center">
          <span className="font-editorial text-xs text-[#57534E] truncate max-w-full">
            {item.variantName || 'AS'}
          </span>
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
      <div className="border border-[#E6E2DA] p-14 text-center bg-white space-y-4">
        <div className="w-14 h-14 border border-[#E6E2DA] bg-[#FAF9F6] text-[#78736A] flex items-center justify-center mx-auto">
          <ShoppingCart className="w-6 h-6" />
        </div>
        <h3 className="font-editorial text-2xl font-normal text-[#171614]">
          Giỏ hàng của bạn đang trống
        </h3>
        <p className="text-xs text-[#6B6760] max-w-md mx-auto leading-relaxed">
          Hãy chọn thiết bị vệ sinh và phụ kiện phòng tắm từ Showroom để thêm vào giỏ hàng trước khi đặt hàng.
        </p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/storefront#catalog"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-[11px] uppercase tracking-[0.16em] font-semibold border border-[#171614] bg-[#171614] text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors"
          >
            <span>Khám phá Showroom</span>
          </Link>
          <button
            type="button"
            onClick={onOpenProductPicker}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold border border-[#D6D1C7] bg-white text-[#171614] hover:border-[#171614] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Chọn nhanh theo SKU</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-[#E6E2DA] bg-white overflow-hidden">
      <div className="px-6 py-4 bg-[#FAF9F6] border-b border-[#E6E2DA] flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-[#171614] uppercase tracking-[0.16em]">
          Danh sách sản phẩm trong giỏ ({items.length})
        </span>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onOpenProductPicker}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] border-b border-[#D6D1C7] pb-0.5 hover:border-[#171614] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm sản phẩm</span>
          </button>

          {!confirmClear ? (
            <button
              type="button"
              disabled={isClearing}
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] font-medium text-[#991B1B] hover:opacity-75 disabled:opacity-45 transition-opacity cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa toàn bộ</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 border border-[#E5B8B8] bg-[#FEF2F2] px-3 py-1">
              <span className="text-[11px] font-medium text-[#991B1B]">Xác nhận xóa hết?</span>
              <button
                type="button"
                disabled={isClearing}
                onClick={async () => {
                  await onClearCart()
                  setConfirmClear(false)
                }}
                className="px-2.5 py-0.5 bg-[#991B1B] text-white text-[10px] uppercase tracking-[0.12em] font-semibold cursor-pointer"
              >
                Đồng ý
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-1.5 py-0.5 text-[#57534E] text-[11px] font-medium hover:text-[#171614] cursor-pointer"
              >
                Hủy
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#171614]">
          <thead className="bg-white text-[#78736A] text-[10px] uppercase tracking-[0.16em] border-b border-[#E6E2DA] font-medium">
            <tr>
              <th className="px-6 py-3.5">Sản phẩm / SKU</th>
              <th className="px-4 py-3.5 text-right">Đơn giá</th>
              <th className="px-4 py-3.5 text-center">Số lượng</th>
              <th className="px-4 py-3.5 text-center">Tồn kho</th>
              <th className="px-4 py-3.5 text-right">Thành tiền</th>
              <th className="px-4 py-3.5 text-center w-14">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E2DA]">
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
                      ? 'bg-[#FAF5EB]/55'
                      : 'hover:bg-[#FAF9F6]'
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-4">
                      <CartItemThumbnail item={item} />
                      <div className="min-w-0">
                        <Link
                          to={detailPath}
                          className="font-editorial text-base font-normal text-[#171614] hover:underline underline-offset-4 decoration-[#8C6D46] leading-snug block"
                        >
                          {item.productName}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#78736A]">
                          <span className="font-mono text-[#57534E]">
                            SKU: {item.sku}
                          </span>
                          {item.variantName && (
                            <>
                              <span aria-hidden="true">&middot;</span>
                              <span>{item.variantName}</span>
                            </>
                          )}
                          {item.unit && (
                            <span className="text-[#8C867C]">
                              ({item.unit})
                            </span>
                          )}
                        </div>

                        {isInactive && (
                          <div className="mt-2 inline-flex items-center gap-1.5 border border-[#E5B8B8] bg-[#FEF2F2] px-2.5 py-1 text-[11px] font-medium text-[#991B1B]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Sản phẩm đã ngừng kinh doanh, vui lòng xóa khỏi giỏ</span>
                          </div>
                        )}

                        {!isInactive && isOutOfStock && (
                          <div className="mt-2 inline-flex items-center gap-1.5 border border-[#E6D3B3] bg-[#FAF5EB] px-2.5 py-1 text-[11px] font-medium text-[#854D0E]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>
                              Vượt tồn kho khả dụng (còn {item.availableQty} {item.unit || 'sản phẩm'})
                            </span>
                          </div>
                        )}

                        {item.priceChanged && (
                          <div className="mt-2 inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-[#FAF9F6] px-2.5 py-1 text-[11px] font-medium text-[#8C6D46]">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>
                              Giá cập nhật từ {formatVnd(item.unitPrice)} sang {formatVnd(item.currentSellingPrice)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-right whitespace-nowrap tabular-nums">
                    <div className="font-medium text-[#171614]">
                      {formatVnd(item.currentSellingPrice)}
                    </div>
                    {item.priceChanged && (
                      <div className="text-[11px] text-[#8C867C] line-through">
                        {formatVnd(item.unitPrice)}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <div className="inline-flex flex-col items-center gap-1">
                      <QuantityControl
                        item={item}
                        isPending={isPending}
                        onUpdateQuantity={onUpdateQuantity}
                      />
                      {isPending && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#8C6D46]">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                          Đang lưu
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-center whitespace-nowrap tabular-nums">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 border text-[11px] font-medium ${
                        item.availableQty > 0
                          ? 'bg-[#EEF5F1] text-[#245C42] border-[#C6DDD0]'
                          : 'bg-[#FEF2F2] text-[#991B1B] border-[#E5B8B8]'
                      }`}
                    >
                      {item.availableQty} {item.unit || 'SP'}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-right whitespace-nowrap font-semibold text-[#171614] text-sm tabular-nums">
                    {formatVnd(item.lineTotal)}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <button
                      type="button"
                      aria-label={`Xóa ${item.productName}`}
                      disabled={isPending}
                      onClick={() => void onRemoveItem(item.cartItemId)}
                      className="p-2 text-[#8C867C] hover:text-[#991B1B] disabled:opacity-40 transition-colors cursor-pointer"
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
