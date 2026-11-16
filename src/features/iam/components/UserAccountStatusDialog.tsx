import { useState, type FormEvent } from 'react'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onConfirm(reason.trim())
  }

  return (
    <ManagementDialog title={titleFor(targetStatus)} onClose={onClose} closeDisabled={pending}>
      <ManagementForm
        onSubmit={submit}
        onClose={onClose}
        submitLabel={targetStatus === 'ACTIVE' ? 'Kích hoạt' : targetStatus === 'LOCKED' ? 'Khóa tài khoản' : 'Vô hiệu hóa'}
        submitDisabled={pending}
        closeDisabled={pending}
      >
        <p className="text-[14.5px] text-slate-600">{confirmationFor(targetStatus)}</p>
        <p className="text-[13.5px] text-slate-600">
          Tài khoản: <strong className="font-bold text-slate-900">{account.username}</strong>
        </p>
        {error && (
          <p role="alert" className="rounded-[11px] bg-red-50 px-3.5 py-2.5 text-[13.5px] font-semibold text-red-700">
            {error}
          </p>
        )}
        <ManagementFormField id="user-account-status-reason" label="Lý do (tùy chọn)">
          <textarea
            id="user-account-status-reason"
            className={managementFieldClass}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            disabled={pending}
          />
        </ManagementFormField>
      </ManagementForm>
    </ManagementDialog>
  )
}