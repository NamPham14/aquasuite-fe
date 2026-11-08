import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  ManagementDialog,
  ManagementForm,
  ManagementFormField,
  managementFieldClass,
} from '../../../shared/ui/ManagementDialog.tsx'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { formatVnd } from '../../../shared/lib/money.ts'
import { useRejectPaymentMutation } from '../api/paymentVerificationApi.ts'
import type { PaymentVerificationItem } from '../types/paymentVerification.types.ts'

interface RejectVerificationDialogProps {
  item: PaymentVerificationItem
  onClose: () => void
  onRejected?: () => void
}

/**
 * Dialog từ chối một khoản chuyển khoản đang chờ (UC-70). Lý do là bắt buộc.
 * Khoản bị từ chối không được tính là đã thu; backend lưu người/thời điểm/lý do.
 */
export function RejectVerificationDialog({ item, onClose, onRejected }: RejectVerificationDialogProps) {
  const [reason, setReason] = useState('')
  const [reject, { isLoading }] = useRejectPaymentMutation()
  const invalid = reason.trim() === ''

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (invalid || isLoading) return
    try {
      await reject({ paymentId: item.transactionId, orderId: item.orderId, reason: reason.trim() }).unwrap()
      toast.success('Đã từ chối khoản chuyển khoản.')
      onRejected?.()
      onClose()
    } catch (err) {
      toast.error(normalizeApiError(err).message)
    }
  }

  return (
    <ManagementDialog title="Từ chối khoản chuyển khoản" onClose={onClose} closeDisabled={isLoading}>
      <ManagementForm
        onSubmit={handleSubmit}
        onClose={onClose}
        submitLabel="Từ chối"
        submitDisabled={invalid || isLoading}
        closeDisabled={isLoading}
      >
        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Giao dịch <span className="font-mono text-slate-800">{item.transactionCode}</span> ·{' '}
          <strong className="text-slate-900">{formatVnd(item.amount)}</strong>
          {item.referenceNo ? <> · Mã tham chiếu: {item.referenceNo}</> : null}
        </div>

        <ManagementFormField
          id="reject-reason"
          label="Lý do từ chối"
          error={invalid && reason !== '' ? 'Lý do không được để trống.' : undefined}
          hint="Bắt buộc — ví dụ: không thấy tiền về tài khoản, sai số tiền, trùng khoản đã nhận."
        >
          <textarea
            id="reject-reason"
            rows={3}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={managementFieldClass}
            placeholder="Nhập lý do từ chối"
            autoFocus
          />
        </ManagementFormField>
      </ManagementForm>
    </ManagementDialog>
  )
}
