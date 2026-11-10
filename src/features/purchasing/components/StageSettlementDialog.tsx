import { useState, useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react'
import type { PurchaseOrderStageResponse, SettleStageRequest } from '../types/purchaseOrder.types'

interface StageSettlementDialogProps {
  isOpen: boolean
  stage: PurchaseOrderStageResponse | null
  poCode: string
  isLoading?: boolean
  onClose: () => void
  onConfirm: (data: SettleStageRequest) => Promise<void>
}

export function StageSettlementDialog({
  isOpen,
  stage,
  poCode,
  isLoading = false,
  onClose,
  onConfirm,
}: StageSettlementDialogProps) {
  const [actualAmount, setActualAmount] = useState<number | string>('')
  const [paidAt, setPaidAt] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER')
  const [paymentReference, setPaymentReference] = useState<string>('')
  const [note, setNote] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (stage) {
      setActualAmount(stage.amount)
      setPaidAt(new Date().toISOString().split('T')[0])
      setPaymentMethod('BANK_TRANSFER')
      setPaymentReference('')
      setNote('')
      setError(null)
    }
  }, [stage])

  if (!isOpen || !stage) return null

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  const isAmountDifferent = Number(actualAmount) !== Number(stage.amount)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const numAmount = Number(actualAmount)
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Số tiền thực chi không hợp lệ')
      return
    }

    if (isAmountDifferent && !note.trim()) {
      setError('Bắt buộc phải nhập ghi chú/lý do khi số tiền thực chi khác số tiền đợt dự kiến')
      return
    }

    try {
      await onConfirm({
        actualAmount: numAmount,
        paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        note: note.trim() || undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Có lỗi xảy ra khi xác nhận đợt')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span>Xác nhận nhận hàng & thanh toán {stage.stageName}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Mã đơn mua (PO):</span>
              <span className="font-mono font-bold text-slate-800">{poCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Đợt giao hàng:</span>
              <span className="font-semibold text-slate-800">{stage.stageName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Số tiền dự kiến:</span>
              <span className="font-bold text-sky-600">{formatCurrency(stage.amount)}</span>
            </div>
            {stage.description && (
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500">Hàng giao dự kiến:</span>
                <span className="text-slate-700 italic">{stage.description}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actual Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số tiền thực chi cho NCC (đ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
            {isAmountDifferent && (
              <p className="text-[11px] text-amber-600 mt-1">
                Số thực chi khác số tiền đợt dự kiến ({formatCurrency(Number(actualAmount) - stage.amount)}).
                Bắt buộc phải ghi rõ lý do vào ô ghi chú bên dưới.
              </p>
            )}
          </div>

          {/* Paid At */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày chi tiền <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phương thức thanh toán <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
                <option value="CASH">Tiền mặt</option>
              </select>
            </div>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã giao dịch / Số hóa đơn NCC
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Ví dụ: VCB-12938192 hoặc HĐ-002931"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú kiểm hàng & thanh toán {isAmountDifferent && <span className="text-rose-500">* (Bắt buộc)</span>}
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isAmountDifferent
                  ? 'Ghi rõ lý do số thực chi khác đợt (chiết khấu, trừ hàng vỡ, trả trước...)'
                  : 'Kiểm hàng đủ số lượng và quy cách, thanh toán hoàn tất...'
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required={isAmountDifferent}
            />
          </div>

          {/* Buttons */}
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
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isLoading ? 'Đang xử lý...' : 'Xác nhận nhận hàng & chi tiền'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

