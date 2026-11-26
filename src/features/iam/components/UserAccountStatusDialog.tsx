import { useState, type FormEvent } from 'react'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { Notice, StatusBadge, type StatusTone } from '../../../shared/ui/Badge'
import type { UserAccount, UserAccountStatus } from '../types/userAccount.types.ts'

function titleFor(status: UserAccountStatus) {
  return status === 'ACTIVE' ? 'Kích hoạt tài khoản' : status === 'INACTIVE' ? 'Vô hiệu hóa tài khoản' : 'Khóa tài khoản'
}

function confirmationFor(status: UserAccountStatus) {
  if (status === 'INACTIVE') {
    return 'Vô hiệu hóa sẽ thu hồi ngay mọi quyền truy cập và phiên đăng nhập đang hoạt động của tài khoản này.'
  }
  if (status === 'LOCKED') {
    return 'Khóa tài khoản sẽ ngăn tài khoản tiếp tục truy cập hệ thống.'
  }
  return 'Kích hoạt sẽ cho phép tài khoản truy cập lại theo các vai trò đang được gán.'
}

function statusMeta(status: UserAccountStatus): { label: string; tone: StatusTone } {
  if (status === 'ACTIVE') return { label: 'Đang hoạt động', tone: 'positive' }
  if (status === 'INACTIVE') return { label: 'Ngừng hoạt động', tone: 'neutral' }
  return { label: 'Đã khóa', tone: 'danger' }
}

export function UserAccountStatusDialog({
  account,
  targetStatus,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  account: UserAccount
  targetStatus: UserAccountStatus
  pending: boolean
  error: string
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState('')
  const currentMeta = statusMeta(account.status)
  const targetMeta = statusMeta(targetStatus)
  const noticeTone = targetStatus === 'LOCKED' ? 'danger' : targetStatus === 'INACTIVE' ? 'warning' : 'info'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onConfirm(reason.trim())
  }

  return (
    <ManagementDialog title={titleFor(targetStatus)} onClose={onClose} closeDisabled={pending}>
      <ManagementForm
        onSubmit={submit}
        onClose={onClose}
        submitLabel={
          pending
            ? 'Đang cập nhật...'
            : targetStatus === 'ACTIVE'
              ? 'Kích hoạt'
              : targetStatus === 'LOCKED'
                ? 'Khóa tài khoản'
                : 'Vô hiệu hóa'
        }
        submitDisabled={pending}
        closeDisabled={pending}
        submitVariant={targetStatus === 'LOCKED' ? 'danger' : 'primary'}
        submitLoading={pending}
      >
        <div className="grid gap-2.5 rounded-card border border-aqs-border bg-aqs-surface-subtle px-4 py-3.5">
          <div className="grid gap-0.5">
            <span className="text-[11.5px] font-semibold text-aqs-ink-faint">Tài khoản mục tiêu</span>
            <span className="text-[13.5px] font-semibold text-aqs-ink">{account.username}</span>
            <span className="text-xs text-aqs-ink-muted">{account.email}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-aqs-ink-muted">
            <StatusBadge tone={currentMeta.tone}>{currentMeta.label}</StatusBadge>
            <span aria-hidden="true">→</span>
            <StatusBadge tone={targetMeta.tone}>{targetMeta.label}</StatusBadge>
          </div>
        </div>

        <Notice tone={noticeTone} title="Lưu ý tác động">
          {confirmationFor(targetStatus)}
        </Notice>

        {error && (
          <Notice tone="danger" role="alert" title="Không thể cập nhật trạng thái">
            {error}
          </Notice>
        )}

        <ManagementFormField id="user-account-status-reason" label="Lý do (tùy chọn)">
          <textarea
            id="user-account-status-reason"
            className={managementFieldClass}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="Nhập lý do thay đổi trạng thái (sẽ được lưu vào nhật ký hoạt động)..."
            disabled={pending}
          />
        </ManagementFormField>
      </ManagementForm>
    </ManagementDialog>
  )
}
