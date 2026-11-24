import { useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import {
  ManagementDialog,
  ManagementForm,
  ManagementFormField,
  managementFieldClass,
} from '../../../shared/ui/ManagementDialog'
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
    } catch (err: any) {
      const parsed = normalizeApiError(err)
      setServerError(parsed.message || 'Hủy yêu cầu bảo hành thất bại.')
    }
  }

  return (
    <ManagementDialog
      onClose={onClose}
      title={`Hủy yêu cầu bảo hành ${ticketCode}`}
      closeDisabled={isLoading}
    >
      <ManagementForm
        onSubmit={handleSubmit}
        onClose={onClose}
        submitLabel={isLoading ? 'Đang hủy...' : 'Xác nhận hủy yêu cầu'}
        submitDisabled={isLoading}
        closeDisabled={isLoading}
      >
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Lưu ý: Chỉ có thể hủy khi yêu cầu đang ở trạng thái <strong>Đã gửi (NEW)</strong>. Khi cửa hàng đã tiếp nhận xử lý, bạn không thể tự hủy trên hệ thống.
          </span>
        </div>

        {serverError && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            {serverError}
          </div>
        )}

        <ManagementFormField
          id="cancel-reason-input"
          label="Lý do hủy yêu cầu (Tùy chọn)"
          hint="Hủy nếu bạn muốn gửi lại yêu cầu khác hoặc thiết bị đã tự hoạt động bình thường."
        >
          <textarea
            id="cancel-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            rows={3}
            maxLength={500}
            placeholder="Ví dụ: Thiết bị đã hoạt động lại sau khi khởi động lại nguồn; Tôi muốn thay đổi ngày hẹn..."
            className={managementFieldClass}
          />
        </ManagementFormField>
      </ManagementForm>
    </ManagementDialog>
  )
}
