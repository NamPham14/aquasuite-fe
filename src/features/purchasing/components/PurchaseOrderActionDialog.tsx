import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, X, XCircle, ArrowRight } from 'lucide-react'

export type POActionType = 'confirm' | 'cancel' | 'close'

interface PurchaseOrderActionDialogProps {
  isOpen: boolean
  action: POActionType | null
  poId?: string
  poCode: string
  totalAmount?: number
  itemCount?: number
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
  isLoading = false,
  onClose,
  onConfirm,
}: PurchaseOrderActionDialogProps) {
  const navigate = useNavigate()
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  // Khóa cuộn trang nền khi mở dialog
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen || !action) return null

  const isConfirmMissingPrice = action === 'confirm' && totalAmount === 0

  const titles: Record<POActionType, string> = {
    confirm: 'Xác nhận đơn mua hàng',
    cancel: 'Hủy đơn mua hàng',
    close: 'Đóng PO nhận thiếu',
  }

  const descriptions: Record<POActionType, string> = {
    confirm: isConfirmMissingPrice
      ? `Đơn mua hàng ${poCode} hiện chưa có đơn giá thỏa thuận (tổng tiền 0đ). Theo quy trình, bạn cần nhập đơn giá nhà cung cấp báo trước khi có thể xác nhận.`
      : `Bạn có chắc muốn xác nhận đơn mua hàng ${poCode} (${itemCount} mặt hàng, tổng ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount)})? Sau khi xác nhận, danh sách hàng hóa và đơn giá sẽ được chốt để tiến hành nhập kho.`,
    cancel: `Hủy đơn mua hàng ${poCode}. Vui lòng nhập lý do hủy. Thao tác này không thể hoàn tác.`,
    close: `Đóng đơn mua hàng ${poCode} khi nhà cung cấp không tiếp tục giao phần còn lại. Vui lòng nhập lý do đóng đơn. Trạng thái sẽ chuyển thành Hoàn thành.`,
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isConfirmMissingPrice) return

    if ((action === 'cancel' || action === 'close') && !reason.trim()) {
      setError('Vui lòng nhập lý do')
      return
    }
    setError('')
    try {
      await onConfirm(reason.trim())
      setReason('')
      onClose()
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Có lỗi xảy ra khi thực hiện thao tác')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            {action === 'confirm' && <CheckCircle2 className="w-5 h-5 text-sky-600" />}
            {action === 'cancel' && <XCircle className="w-5 h-5 text-rose-600" />}
            {action === 'close' && <AlertCircle className="w-5 h-5 text-amber-600" />}
            <h3 className="text-base font-semibold text-slate-800">{titles[action]}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">{descriptions[action]}</p>

          {/* Cảnh báo khi DRAFT chưa có giá */}
          {isConfirmMissingPrice && (
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Chưa có đơn giá thỏa thuận
              </div>
              <p>
                Để xác nhận PO, các dòng sản phẩm phải có đơn giá lớn hơn hoặc bằng 0. Hãy bấm vào nút bên dưới để chuyển sang màn hình nhập giá.
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
                  <span>Đi tới màn hình Nhập giá</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {(action === 'cancel' || action === 'close') && (
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
                  if (error) setError('')
                }}
                placeholder={action === 'cancel' ? 'Nhập lý do hủy đơn...' : 'Nhập lý do đóng đơn nhận thiếu...'}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent placeholder:text-slate-400"
                autoFocus
              />
            </div>
          )}

          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading || isConfirmMissingPrice}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm cursor-pointer ${
                action === 'confirm'
                  ? 'bg-sky-600 hover:bg-sky-700'
                  : action === 'cancel'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isLoading ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
