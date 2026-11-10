import { useEffect } from 'react'
import {
  CheckCircle2,
  Receipt,
  Eye,
  Plus,
  AlertCircle,
  Copy,
  ExternalLink,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { SalesOrderDetailResponse } from '../types/salesOrder.types'

interface POSOrderSuccessModalProps {
  order: SalesOrderDetailResponse | null
  isOpen: boolean
  onCloseAndCreateNew: () => void
}

export function POSOrderSuccessModal({
  order,
  isOpen,
  onCloseAndCreateNew,
}: POSOrderSuccessModalProps) {
  const navigate = useNavigate()

  // Đóng modal khi bấm phím Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseAndCreateNew()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCloseAndCreateNew])

  if (!isOpen || !order) return null

  const formatMoney = (val: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(order.orderCode)
    toast.success(`Đã sao chép mã đơn hàng: ${order.orderCode}`)
  }

  const handleGoToDetail = () => {
    navigate(`/app/orders/${order.orderId}`)
  }

  // NÚT 3: GHI NHẬN THANH TOÁN (TÍCH HỢP PHÂN HỆ TÀI CHÍNH CỦA NAM)
  const handleGoToPayment = () => {
    // Lưu ý kiến trúc: Hiện tại Nam chưa đăng ký route /app/finance/orders/:id/payments trên Frontend.
    // Tạm thời điều hướng về Chi tiết đơn hàng với thông báo, và sẵn sàng gắn route của Nam khi Nam tích hợp.
    toast.info(
      'Chuyển sang chi tiết đơn hàng để theo dõi trạng thái thanh toán từ phân hệ Tài chính (Nam).',
    )
    navigate(`/app/orders/${order.orderId}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
      onClick={onCloseAndCreateNew}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng modal ở góc trên phải */}
        <button
          type="button"
          onClick={onCloseAndCreateNew}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition z-10"
          title="Đóng thông báo"
          aria-label="Đóng thông báo"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header với icon xanh thành công */}
        <div className="bg-emerald-500/10 p-6 text-center border-b border-emerald-100">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Tạo đơn hàng POS thành công!
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            Đơn hàng bán lẻ đã được khởi tạo và giữ tồn kho thành công trên hệ thống.
          </p>
        </div>

        {/* Nội dung tóm tắt đơn hàng */}
        <div className="p-6 space-y-4 text-xs">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Mã đơn hàng:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-sm text-sky-700">
                  {order.orderCode}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition"
                  title="Sao chép mã đơn"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Khách hàng:</span>
              <div className="text-right">
                <span className="font-semibold text-slate-800">
                  {order.customerName && order.customerName !== 'Walk-in Retail Customer'
                    ? order.customerName
                    : 'Khách lẻ tại quầy'}
                </span>
                {order.customerPhone && order.customerPhone !== '0000000000' && (
                  <div className="text-xs text-slate-500 mt-0.5">SĐT: {order.customerPhone}</div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Kênh bán & Hình thức:</span>
              <span className="text-slate-700 font-medium">Bán lẻ tại quầy (COUNTER)</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Số lượng mặt hàng:</span>
              <span className="text-slate-700 font-medium">{order.items.length} dòng sản phẩm</span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="font-medium text-slate-700">Tổng tiền thanh toán:</span>
              <span className="text-base font-bold text-emerald-700">
                {formatMoney(order.totalAmount)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Trạng thái thanh toán:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Chưa thanh toán (UNPAID)
              </span>
            </div>
          </div>

          {/* Ghi chú thanh toán */}
          <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Đơn hàng đã được lưu trên hệ thống. Nhân viên có thể bấm "Ghi nhận thanh toán" để thực hiện thu tiền mặt hoặc xác nhận chuyển khoản cho khách hàng.
            </span>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            type="button"
            onClick={onCloseAndCreateNew}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tạo đơn mới</span>
          </button>

          <button
            type="button"
            onClick={handleGoToDetail}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem chi tiết</span>
          </button>

          {/* NÚT 3: GHI NHẬN THANH TOÁN (LINK SANG NAM) */}
          <button
            type="button"
            onClick={handleGoToPayment}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-xs"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Ghi nhận thanh toán (Nam)</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </button>
        </div>
      </div>
    </div>
  )
}
