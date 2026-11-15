import { ShieldCheck, AlertTriangle, ArrowRight, ShoppingBag } from 'lucide-react'
import { formatVnd } from '../../../shared/lib/money.ts'

interface CustomerCartSummaryProps {
  totalItems: number
  totalQuantity: number
  subtotal: number
  hasInvalidItems: boolean
  isLoading: boolean
  onProceedCheckout: () => void
}

export function CustomerCartSummary({
  totalItems,
  totalQuantity,
  subtotal,
  hasInvalidItems,
  isLoading,
  onProceedCheckout,
}: CustomerCartSummaryProps) {
  const canCheckout = totalItems > 0 && !hasInvalidItems && !isLoading

  return (
    <div className="border border-slate-200 rounded-xl bg-white p-5 shadow-2xs sticky top-6">
      <div className="flex items-center gap-2 pb-3.5 border-b border-slate-200">
        <ShoppingBag className="w-4 h-4 text-sky-600" />
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Tóm tắt giỏ hàng
        </h3>
      </div>

      <div className="py-4 space-y-3 text-xs border-b border-slate-100">
        <div className="flex items-center justify-between text-slate-600">
          <span>Số dòng mặt hàng (SKU)</span>
          <span className="font-semibold text-slate-900">{totalItems} mặt hàng</span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Tổng số lượng sản phẩm</span>
          <span className="font-semibold text-slate-900">{totalQuantity} sản phẩm</span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Phí vận chuyển</span>
          <span className="text-[11px] text-slate-500 italic">Tính ở bước đặt hàng</span>
        </div>
      </div>

      <div className="py-4 flex items-baseline justify-between">
        <span className="text-xs font-bold text-slate-800 uppercase">Tạm tính</span>
        <div className="text-right">
          <span className="text-lg font-extrabold text-sky-700">
            {formatVnd(subtotal)}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Đã bao gồm giá niêm yết hiện hành
          </p>
        </div>
      </div>

      {hasInvalidItems && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-amber-800 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Giỏ hàng có sản phẩm vượt quá tồn kho khả dụng hoặc đã ngừng kinh doanh. Vui lòng điều chỉnh số lượng hoặc xóa sản phẩm lỗi trước khi đặt hàng.
          </span>
        </div>
      )}

      <button
        type="button"
        disabled={!canCheckout}
        onClick={onProceedCheckout}
        className="w-full py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
      >
        <span>Tiến hành đặt hàng</span>
        <ArrowRight className="w-4 h-4" />
      </button>

      <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Cam kết thiết bị chính hãng & bảo hành điện tử AquaSuite</span>
      </div>
    </div>
  )
}

