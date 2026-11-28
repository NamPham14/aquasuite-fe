import { ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react'
import { formatVnd } from '../../../shared/lib/money.ts'

interface CustomerCartSummaryProps {
  totalItems: number
  totalQuantity: number
  subtotal: number
  hasInvalidItems: boolean
  isLoading: boolean
  isGuestCart?: boolean
  onProceedCheckout: () => void
}

export function CustomerCartSummary({
  totalItems,
  totalQuantity,
  subtotal,
  hasInvalidItems,
  isLoading,
  isGuestCart = false,
  onProceedCheckout,
}: CustomerCartSummaryProps) {
  const canCheckout = totalItems > 0 && !hasInvalidItems && !isLoading

  return (
    <div className="border border-[#E6E2DA] bg-white p-6 sticky top-24">
      <div className="pb-4 border-b border-[#E6E2DA]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
          Tổng kết Showroom
        </p>
        <h3 className="font-editorial text-xl font-normal text-[#171614] mt-1">
          Tóm tắt giỏ hàng
        </h3>
      </div>

      <div className="py-5 space-y-3 text-xs border-b border-[#E6E2DA]">
        <div className="flex items-center justify-between text-[#57534E]">
          <span>Số dòng mặt hàng (SKU)</span>
          <span className="font-semibold text-[#171614] tabular-nums">{totalItems} mặt hàng</span>
        </div>
        <div className="flex items-center justify-between text-[#57534E]">
          <span>Tổng số lượng sản phẩm</span>
          <span className="font-semibold text-[#171614] tabular-nums">{totalQuantity} sản phẩm</span>
        </div>
        <div className="flex items-center justify-between text-[#57534E]">
          <span>Phí vận chuyển</span>
          <span className="text-[11px] text-[#78736A] italic">Tính ở bước đặt hàng</span>
        </div>
      </div>

      <div className="py-5 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold text-[#171614] uppercase tracking-[0.16em]">
          Tạm tính
        </span>
        <div className="text-right">
          <span className="text-2xl font-semibold text-[#171614] tabular-nums tracking-tight">
            {formatVnd(subtotal)}
          </span>
          <p className="text-[11px] text-[#78736A] mt-0.5">
            Theo giá niêm yết hiện hành
          </p>
        </div>
      </div>

      {hasInvalidItems && (
        <div className="mb-4 p-3.5 border border-[#E6D3B3] bg-[#FAF5EB] flex items-start gap-2.5 text-[#854D0E] text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Giỏ hàng có sản phẩm vượt tồn kho khả dụng hoặc đã ngừng kinh doanh. Vui lòng điều chỉnh trước khi đặt hàng.
          </span>
        </div>
      )}

      <button
        type="button"
        disabled={!canCheckout}
        onClick={onProceedCheckout}
        className="w-full h-12 px-5 border border-[#171614] bg-[#171614] hover:bg-[#2A2825] disabled:border-[#E6E2DA] disabled:bg-[#ECE8E0] disabled:text-[#8C867C] text-[#FAF9F6] text-[11px] uppercase tracking-[0.16em] font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
      >
        <span>
          {isGuestCart ? 'Đăng nhập để đặt hàng & thanh toán' : 'Tiến hành đặt hàng'}
        </span>
        <ArrowRight className="w-4 h-4 text-[#C5B091]" />
      </button>

      <div className="mt-5 pt-4 border-t border-[#E6E2DA] flex items-center gap-2 text-[11px] text-[#6B6760]">
        <ShieldCheck className="w-4 h-4 text-[#245C42] shrink-0" />
        <span>Thiết bị chính hãng &amp; bảo hành điện tử theo Serial</span>
      </div>
    </div>
  )
}
