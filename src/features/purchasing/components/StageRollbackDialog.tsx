import { useState } from 'react'
import { X, RotateCcw, AlertTriangle, Check, Ban } from 'lucide-react'
import type { PurchaseOrderStageResponse, StageRollbackRequestResponse } from '../types/purchaseOrder.types'

interface StageRollbackDialogProps {
  isOpen: boolean
  mode: 'request' | 'direct' | 'review'
  stage: PurchaseOrderStageResponse | null
  rollbackRequest?: StageRollbackRequestResponse | null
  poCode: string
  isLoading?: boolean
  onClose: () => void
  onRequestRollback?: (reason: string) => Promise<void>
  onDirectRollback?: (reason: string) => Promise<void>
  onReviewRollback?: (approved: boolean, note: string) => Promise<void>
}

export function StageRollbackDialog({
  isOpen,
  mode,
  stage,
  rollbackRequest,
  poCode,
  isLoading = false,
  onClose,
  onRequestRollback,
  onDirectRollback,
  onReviewRollback,
}: StageRollbackDialogProps) {
  const [reason, setReason] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !stage) return null

  const formatCurrency = (val?: number | null) => {
    if (val === undefined || val === null) return '—'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'request' || mode === 'direct') {
      if (!reason.trim()) {
        setError('Bắt buộc phải nhập lý do hoàn tác')
        return
      }
      try {
        if (mode === 'request' && onRequestRollback) {
          await onRequestRollback(reason.trim())
        } else if (mode === 'direct' && onDirectRollback) {
          await onDirectRollback(reason.trim())
        }
        onClose()
      } catch (err: any) {
        setError(err?.data?.message || err?.message || 'Có lỗi xảy ra khi hoàn tác đợt')
      }
    }
  }

  const handleReviewAction = async (approved: boolean) => {
    setError(null)
    try {
      if (onReviewRollback) {
        await onReviewRollback(approved, reviewNote.trim())
      }
      onClose()
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Có lỗi xảy ra khi duyệt hoàn tác')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            <span>
              {mode === 'request'
                ? `Yêu cầu hoàn tác ${stage.stageName}`
                : mode === 'direct'
                ? `Hoàn tác trực tiếp ${stage.stageName}`
                : `Xét duyệt yêu cầu hoàn tác ${stage.stageName}`}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã PO:</span>
              <span className="font-mono font-bold text-slate-800">{poCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Đợt giao hàng:</span>
              <span className="font-semibold text-slate-800">{stage.stageName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số tiền thực chi đã ghi nhận:</span>
              <span className="font-bold text-rose-600">{formatCurrency(stage.actualAmount ?? stage.amount)}</span>
            </div>
            {stage.paidAt && (
              <div className="flex justify-between">
                <span className="text-slate-500">Thời gian chi:</span>
                <span className="text-slate-700">{new Date(stage.paidAt).toLocaleString('vi-VN')}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'review' ? (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs space-y-1 text-amber-900">
                <div className="font-semibold">Chi tiết yêu cầu của Kế toán:</div>
                <div>
                  <span className="text-slate-500">Người yêu cầu: </span>
                  <span className="font-medium text-slate-800">{rollbackRequest?.requestedByName || 'Kế toán'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Thời gian yêu cầu: </span>
                  <span className="text-slate-700">
                    {rollbackRequest?.requestedAt
                      ? new Date(rollbackRequest.requestedAt).toLocaleString('vi-VN')
                      : '—'}
                  </span>
                </div>
                <div className="pt-1 border-t border-amber-200">
                  <span className="text-slate-500">Lý do: </span>
                  <span className="font-medium text-amber-950 italic">"{rollbackRequest?.requestReason}"</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú phản hồi của Chủ cửa hàng (tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Nhập ghi chú phản hồi..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleReviewAction(false)}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  Từ chối yêu cầu
                </button>
                <button
                  type="button"
                  onClick={() => handleReviewAction(true)}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Đồng ý hoàn tác đợt
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do hoàn tác <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ví dụ: Ghi nhận nhầm số tiền, kiểm lại hàng bị lỗi chưa thanh toán..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                {mode === 'request'
                  ? 'Yêu cầu sẽ được gửi tới Chủ cửa hàng phê duyệt. Trong lúc chờ duyệt, đợt vẫn giữ trạng thái Đã nhận & trả tiền.'
                  : 'Sau khi hoàn tác trực tiếp, đợt này sẽ chuyển về Chưa giao (PENDING), số tiền đã trả sẽ được trừ khỏi đơn mua.'}
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isLoading ? 'Đang gửi...' : mode === 'request' ? 'Gửi yêu cầu hoàn tác' : 'Xác nhận hoàn tác ngay'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

