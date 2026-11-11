import { useState, useEffect } from 'react'
import { X, MapPin, Calendar, FileText, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useUpdateOrderFulfillmentMutation } from '../api/salesOrderApi'

interface EditOrderFulfillmentModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  orderCode: string
  initialAddress?: string | null
  initialSchedule?: string | null
  initialNote?: string | null
  isProject?: boolean
}

export function EditOrderFulfillmentModal({
  isOpen,
  onClose,
  orderId,
  orderCode,
  initialAddress,
  initialSchedule,
  initialNote,
  isProject = false,
}: EditOrderFulfillmentModalProps) {
  const [deliveryAddress, setDeliveryAddress] = useState(initialAddress || '')
  const [deliverySchedule, setDeliverySchedule] = useState(initialSchedule || '')
  const [note, setNote] = useState(initialNote || '')

  const [updateFulfillment, { isLoading }] = useUpdateOrderFulfillmentMutation()

  useEffect(() => {
    if (isOpen) {
      setDeliveryAddress(initialAddress || '')
      setDeliverySchedule(initialSchedule || '')
      setNote(initialNote || '')
    }
  }, [isOpen, initialAddress, initialSchedule, initialNote])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await updateFulfillment({
        orderId,
        body: {
          deliveryAddress: deliveryAddress.trim() || undefined,
          deliverySchedule: deliverySchedule.trim() || undefined,
          note: note.trim() || undefined,
        },
      }).unwrap()

      toast.success('Cập nhật thông tin giao nhận thành công!')
      onClose()
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || 'Có lỗi xảy ra khi cập nhật'
      toast.error(msg)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-sky-600" />
              <span>Cập nhật Giao nhận & Điều phối</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Đơn hàng: <span className="font-mono font-semibold text-slate-700">{orderCode}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Địa chỉ nhận hàng */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Địa chỉ nhận hàng:</span>
            </label>
            <textarea
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Nhập địa chỉ giao hàng tận nơi..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">
              Để trống nếu khách chọn nhận hàng trực tiếp tại quầy Showroom.
            </p>
          </div>

          {/* Lịch hẹn / Tiến độ giao hàng */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {isProject
                  ? 'Tiến độ giao hàng công trình:'
                  : 'Lịch hẹn giao hàng (Khách hẹn):'}
              </span>
            </label>
            <input
              type="text"
              value={deliverySchedule}
              onChange={(e) => setDeliverySchedule(e.target.value)}
              placeholder={
                isProject
                  ? 'VD: Đợt 1 giao thiết bị thô 20/11, đợt 2 hoàn thiện 05/12'
                  : 'VD: Hẹn giao sáng Chủ Nhật trước 10h'
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          {/* Ghi chú đơn hàng */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Ghi chú điều phối nội bộ:</span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dặn dò cho kho hoặc nhân viên giao hàng (người nhận hộ, kiểm tra vòi sen...)..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>

          {/* Footer Action */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3 py-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-sky-600 text-white hover:bg-sky-700 transition font-semibold shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

