import { useState, type FormEvent } from 'react'
import {
  ManagementDialog,
  ManagementForm,
  ManagementFormField,
  managementFieldClass,
} from '../../../shared/ui/ManagementDialog'

export type QuotationActionType =
  | 'submit_approval'
  | 'approve'
  | 'reject'
  | 'send'
  | 'mark_accepted'
  | 'mark_lost'
  | 'create_revision'
  | 'delete'

interface QuotationActionDialogProps {
  type: QuotationActionType
  quotationCode: string
  onClose: () => void
  onSubmit: (noteOrReason: string) => Promise<void> | void
  submitting?: boolean
}

const configByType: Record<
  QuotationActionType,
  {
    title: string
    label?: string
    placeholder?: string
    required?: boolean
    submitLabel: string
    isDanger?: boolean
    warningMessage?: string
  }
> = {
  submit_approval: {
    title: 'Trình phê duyệt báo giá',
    label: 'Lý do xin phê duyệt vượt khung chiết khấu *',
    placeholder: 'Nhập giải trình lý do (ví dụ: Khách hàng dự án lớn cam kết thanh toán ngay...)',
    required: true,
    submitLabel: 'Gửi trình duyệt',
  },
  approve: {
    title: 'Phê duyệt báo giá',
    label: 'Ghi chú phê duyệt',
    placeholder: 'Nhập ghi chú hoặc điều kiện nếu có (tùy chọn)...',
    required: false,
    submitLabel: 'Xác nhận duyệt',
  },
  reject: {
    title: 'Từ chối phê duyệt báo giá',
    label: 'Lý do từ chối *',
    placeholder: 'Nhập lý do không chấp thuận chiết khấu để Sales nắm được...',
    required: true,
    submitLabel: 'Từ chối báo giá',
    isDanger: true,
  },
  send: {
    title: 'Phát hành / Gửi báo giá cho khách',
    warningMessage:
      'Sau khi phát hành (chuyển sang SENT), nội dung báo giá sẽ được chốt gửi khách hàng. Khách có thể tiến hành chốt đơn hoặc yêu cầu đàm phán sửa đổi (Revision).',
    submitLabel: 'Xác nhận phát hành',
  },
  mark_accepted: {
    title: 'Xác nhận chốt đơn báo giá thành công',
    label: 'Link hợp đồng / file chữ ký đính kèm (nếu có)',
    placeholder: 'https://...',
    required: false,
    warningMessage:
      'Báo giá sẽ được chuyển sang trạng thái Đã chốt đơn (ACCEPTED). Các phiên bản sửa đổi cũ cùng mã sẽ tự động chuyển sang Đã thay thế (SUPERSEDED).',
    submitLabel: 'Xác nhận chốt đơn',
  },
  mark_lost: {
    title: 'Ghi nhận mất dự án / thất bại',
    label: 'Lý do mất đơn *',
    placeholder: 'Nhập nguyên nhân khách hàng không mua (đối thủ giá thấp hơn, dời lịch công trình...)...',
    required: true,
    submitLabel: 'Xác nhận mất dự án',
    isDanger: true,
  },
  create_revision: {
    title: 'Tạo phiên bản sửa đổi mới (Revision)',
    warningMessage:
      'Hệ thống sẽ nhân bản báo giá này thành phiên bản mới (v+1) ở trạng thái Bản nháp (DRAFT) để bạn đàm phán sửa đổi. Bản hiện tại sẽ được đánh dấu đã thay thế.',
    submitLabel: 'Tạo bản sửa đổi',
  },
  delete: {
    title: 'Xóa báo giá nháp',
    warningMessage: 'Hành động này sẽ xóa hoàn toàn báo giá nháp và các dòng sản phẩm liên quan. Không thể hoàn tác!',
    submitLabel: 'Xóa vĩnh viễn',
    isDanger: true,
  },
}

export function QuotationActionDialog({
  type,
  quotationCode,
  onClose,
  onSubmit,
  submitting,
}: QuotationActionDialogProps) {
  const config = configByType[type]
  const [text, setText] = useState('')
  const [error, setError] = useState<string>()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (config.required && !text.trim()) {
      setError('Vui lòng không để trống trường này.')
      return
    }
    setError(undefined)
    await onSubmit(text.trim())
  }

  return (
    <ManagementDialog title={`${config.title} — ${quotationCode}`} onClose={onClose} closeDisabled={submitting}>
      <ManagementForm
        onSubmit={handleSubmit}
        onClose={onClose}
        submitLabel={config.submitLabel}
        submitDisabled={submitting}
        closeDisabled={submitting}
      >
        {config.warningMessage && (
          <div
            className={`p-3.5 rounded-lg text-sm mb-3 ${
              config.isDanger ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-sky-50 text-sky-800 border border-sky-200'
            }`}
          >
            {config.warningMessage}
          </div>
        )}

        {config.label && (
          <ManagementFormField id="action-note" label={config.label} error={error}>
            <textarea
              id="action-note"
              rows={4}
              className={managementFieldClass}
              value={text}
              disabled={submitting}
              placeholder={config.placeholder}
              onChange={(e) => {
                setText(e.target.value)
                if (error) setError(undefined)
              }}
              aria-invalid={!!error}
              aria-describedby={error ? 'action-note-error' : undefined}
            />
          </ManagementFormField>
        )}
      </ManagementForm>
    </ManagementDialog>
  )
}

