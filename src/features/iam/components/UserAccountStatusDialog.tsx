import { useState, type FormEvent } from 'react'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import type { UserAccount, UserAccountStatus } from '../types/userAccount.types.ts'

function titleFor(status: UserAccountStatus) {
  return status === 'ACTIVE' ? 'Kích hoạt tài khoản' : status === 'INACTIVE' ? 'Vô hiệu hóa tài khoản' : 'Khóa tài khoản'
}

function confirmationFor(status: UserAccountStatus) {
  if (status === 'INACTIVE') return 'Vô hiệu hóa sẽ thu hồi ngay mọi quyền truy cập và phiên đăng nhập đang hoạt động của tài khoản này.'
  if (status === 'LOCKED') return 'Khóa tài khoản sẽ ngăn tài khoản tiếp tục truy cập hệ thống.'
  return 'Kích hoạt sẽ cho phép tài khoản truy cập lại theo các vai trò đang được gán.'
}

export function UserAccountStatusDialog({ account, targetStatus, pending, error, onClose, onConfirm }: {
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
  return <ManagementDialog title={titleFor(targetStatus)} onClose={onClose} closeDisabled={pending}>
    <ManagementForm onSubmit={submit} onClose={onClose} submitLabel={targetStatus === 'ACTIVE' ? 'Kích hoạt' : targetStatus === 'LOCKED' ? 'Khóa tài khoản' : 'Vô hiệu hóa'} submitDisabled={pending} closeDisabled={pending}>
      <p className="text-sm text-slate-700">{confirmationFor(targetStatus)}</p>
      <p className="text-sm text-slate-600">Tài khoản: <span className="font-semibold text-slate-900">{account.username}</span></p>
      {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      <ManagementFormField id="user-account-status-reason" label="Lý do (tùy chọn)">
        <textarea id="user-account-status-reason" className={managementFieldClass} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} disabled={pending} />
      </ManagementFormField>
    </ManagementForm>
  </ManagementDialog>
}
