import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, X, XCircle, ArrowRight, RotateCcw } from 'lucide-react'

export type POActionType = 'confirm' | 'cancel' | 'close' | 'reopen'

interface PurchaseOrderActionDialogProps {
  isOpen: boolean
  action: POActionType | null
  poId?: string
  poCode: string
  totalAmount?: number
  itemCount?: number
  expectedDate?: string | null
  isLoading?: boolean
  onClose: () => void
  onConfirm: (reason?: string) => Promise<void>
}

export function PurchaseOrderActionDialog({
  isOpen,
  action,
  poId,
  poCode,
  totalAmount = 0,
  itemCount = 0,
  expectedDate,
  isLoading = false,
  onClose,
  onConfirm,
}: PurchaseOrderActionDialogProps) {
  const navigate = useNavigate()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setReason('')
      setError('')
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !action) return null

  const isConfirmMissingPrice = action === 'confirm' && totalAmount === 0
  const isConfirmMissingExpectedDate = action === 'confirm' && !isConfirmMissingPrice && !expectedDate

  const titles: Record<POActionType, string> = {
    confirm: 'Xác nhận đơn mua hàng',
    cancel: 'Hủy đơn mua hàng',
    close: 'Đóng PO nhận thiếu',
    reopen: 'Mở lại đơn mua hàng để chỉnh sửa',
  }

  const descriptions: Record<POActionType, string> = {
    confirm: isConfirmMissingPrice
      ? `Đơn mua hàng ${poCode} hiện chưa có đơn giá thỏa thuận (tổng tiền 0đ). Theo quy trình, bạn cần nhập đơn giá nhà cung cấp báo trước khi có thể xác nhận.`
      : isConfirmMissingExpectedDate
        ? `Đơn mua hàng ${poCode} chưa có ngày giao hàng dự kiến. Vui lòng cập nhật ngày giao hàng dự kiến trước khi xác nhận đơn.`
        : `Bạn có chắc muốn xác nhận đơn mua hàng ${poCode} (${itemCount} mặt hàng, tổng ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)})? Sau khi xác nhận, danh sách hàng hóa và đơn giá sẽ được khóa cứng để tiến hành giao nhận và thanh toán theo đợt.`,
    cancel: `Hủy đơn mua hàng ${poCode}. Vui lòng nhập lý do hủy. Thao tác này chỉ thực hiện được khi chưa có đợt nào được thanh toán.`,
    close: `Đóng đơn mua hàng ${poCode} khi nhà cung cấp không tiếp tục giao các đợt còn lại. Các đợt chưa giao sẽ bị hủy. Đơn mua hàng sẽ chuyển thành Hoàn thành (Đóng nhận thiếu).`,
    reopen: `Mở lại đơn mua hàng ${poCode} về trạng thái QUOTED để điều chỉnh số lượng, đơn giá hoặc các đợt giao nhận. Thao tác này chỉ cho phép khi chưa có đợt nào được thanh toán.`,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isConfirmMissingPrice || isConfirmMissingExpectedDate) return

    if ((action === 'cancel' || action === 'close' || action === 'reopen') && !reason.trim()) {
      setError('Vui lòng nhập lý do')
      return
    }

    try {
      await onConfirm(reason.trim())
      onClose()
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Có lỗi xảy ra')
    }
  }

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-up border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {action === 'confirm' && <CheckCircle2 className="w-5 h-5 text-sky-600" />}
            {action === 'cancel' && <XCircle className="w-5 h-5 text-rose-600" />}
            {action === 'close' && <AlertCircle className="w-5 h-5 text-amber-600" />}
            {action === 'reopen' && <RotateCcw className="w-5 h-5 text-indigo-600" />}
            <h3 className="text-base font-bold text-slate-800">{titles[action]}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">{descriptions[action]}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cảnh báo khi DRAFT chưa có giá */}
          {isConfirmMissingPrice && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Đơn mua chưa có đơn giá
              </div>
              <p>
                Để xác nhận PO, bạn cần cập nhật đơn giá nhà cung cấp đã báo. Hãy bấm vào nút bên dưới để chuyển sang màn hình cập nhật giá.
              </p>
              {poId && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate(`/app/purchase-orders/${poId}/edit`)
                  }}
                  className="w-full mt-1 px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Đi tới màn hình Cập nhật PO</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Cảnh báo khi DRAFT chưa có ngày giao hàng dự kiến */}
          {isConfirmMissingExpectedDate && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Chưa có ngày giao hàng dự kiến
              </div>
              <p>
                Để xác nhận PO, đơn mua hàng bắt buộc phải có ngày giao hàng dự kiến từ nhà cung cấp. Hãy bấm vào nút bên dưới để cập nhật.
              </p>
              {poId && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate(`/app/purchase-orders/${poId}/edit`)
                  }}
                  className="w-full mt-1 px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Đi tới màn hình Cập nhật PO</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {(action === 'cancel' || action === 'close' || action === 'reopen') && (
            <div>
              <label htmlFor="action-reason" className="block text-xs font-medium text-slate-700 mb-1">
                Lý do thực hiện <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="action-reason"
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  setError('')
                }}
                placeholder={
                  action === 'cancel'
                    ? 'Nhập lý do hủy đơn mua hàng...'
                    : action === 'close'
                      ? 'Nhập lý do đóng nhận thiếu (NCC hết hàng, thay đổi kế hoạch)...'
                      : 'Nhập lý do mở lại đơn (sửa số lượng, đổi giá, thêm mặt hàng)...'
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
          )}

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading || isConfirmMissingPrice || isConfirmMissingExpectedDate}
              className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 ${action === 'confirm'
                  ? 'bg-sky-600 hover:bg-sky-700'
                  : action === 'cancel'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : action === 'close'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
              {isLoading
                ? 'Đang xử lý...'
                : action === 'confirm'
                  ? 'Xác nhận PO'
                  : action === 'cancel'
                    ? 'Xác nhận hủy'
                    : action === 'close'
                      ? 'Đóng PO nhận thiếu'
                      : 'Mở lại đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
