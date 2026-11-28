import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import {
  CustomerEditorialModal,
  editorialFieldClass,
} from './CustomerEditorialModal'
import { normalizeApiError } from '../../../shared/api/apiError'
import { useCancelWarrantyTicketMutation } from '../api/warrantyTicketApi'

interface CancelTicketModalProps {
  ticketId: string
  ticketCode: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CancelTicketModal({
  ticketId,
  ticketCode,
  isOpen,
  onClose,
  onSuccess,
}: CancelTicketModalProps) {
  const [reason, setReason] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [cancelTicket, { isLoading }] = useCancelWarrantyTicketMutation()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError(null)

    try {
      await cancelTicket({
        id: ticketId,
        body: { reason: reason.trim() || undefined },
      }).unwrap()

      toast.success(`Đã hủy yêu cầu bảo hành ${ticketCode} thành công.`)
      onSuccess?.()
      onClose()
    } catch (err: unknown) {
      const parsed = normalizeApiError(err)
      setServerError(parsed.message || 'Hủy yêu cầu bảo hành thất bại.')
    }
  }

  return (
    <CustomerEditorialModal
      eyebrow="Quản lý yêu cầu"
      title={`Hủy yêu cầu bảo hành ${ticketCode}`}
      onClose={onClose}
      closeDisabled={isLoading}
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="flex items-start gap-2.5 border border-[#E6D3B3] bg-[#FAF5EB] p-4 text-xs text-[#854D0E]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Lưu ý: Chỉ có thể hủy khi yêu cầu đang ở trạng thái <strong>Đã gửi (NEW)</strong>. Khi Showroom đã tiếp nhận xử lý, bạn không thể tự hủy trên hệ thống.
          </span>
        </div>

        {serverError && (
          <div className="border border-[#E5B8B8] bg-[#FEF2F2] p-3.5 text-xs text-[#991B1B]">
            {serverError}
          </div>
        )}

        <div>
          <label
            htmlFor="cancel-reason-input"
            className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E]"
          >
            Lý do hủy yêu cầu (Tùy chọn)
          </label>
          <textarea
            id="cancel-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            rows={3}
            maxLength={500}
            placeholder="Ví dụ: Thiết bị đã hoạt động lại sau khi khởi động lại nguồn; Tôi muốn thay đổi ngày hẹn..."
            className={editorialFieldClass}
          />
          <p className="mt-1 text-[11px] text-[#78736A]">
            Hủy nếu bạn muốn gửi lại yêu cầu khác hoặc thiết bị đã tự hoạt động bình thường.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#E6E2DA]">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="h-10 border border-[#D6D1C7] bg-white px-5 text-[11px] uppercase tracking-[0.14em] font-medium text-[#57534E] hover:border-[#171614] cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="h-10 border border-[#991B1B] bg-[#991B1B] px-5 text-[11px] uppercase tracking-[0.14em] font-semibold text-white hover:bg-[#7F1D1D] disabled:opacity-45 cursor-pointer"
          >
            {isLoading ? 'Đang hủy...' : 'Xác nhận hủy yêu cầu'}
          </button>
        </div>
      </form>
    </CustomerEditorialModal>
  )
}
