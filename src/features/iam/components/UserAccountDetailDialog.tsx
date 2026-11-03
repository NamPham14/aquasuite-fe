import { ManagementDialog } from '../../../shared/ui/ManagementDialog.tsx'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { useGetUserAccountQuery } from '../api/userAccountApi.ts'
import type { UserAccount } from '../types/userAccount.types.ts'

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function statusLabel(status: UserAccount['status']) {
  return status === 'ACTIVE' ? 'Đang hoạt động' : status === 'INACTIVE' ? 'Ngừng hoạt động' : 'Đã khóa'
}

export function UserAccountDetailDialog({ accountId, onClose, onEdit }: {
  accountId: string
  onClose: () => void
  onEdit: (account: UserAccount) => void
}) {
  const detail = useGetUserAccountQuery(accountId)
  const account = detail.data
  const error = detail.isError ? normalizeApiError(detail.error).message : ''
  return (
    <ManagementDialog title="Chi tiết tài khoản" onClose={onClose}>
      <div className="space-y-5 p-5 sm:p-6">
        {detail.isLoading && <p className="text-sm text-slate-600">Đang tải thông tin tài khoản...</p>}
        {error && <div role="alert" className="space-y-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800"><p>{error}</p><button type="button" onClick={() => void detail.refetch()} className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium">Thử lại</button></div>}
        {account && <>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-sm font-bold text-sky-800">
              {account.avatarUrl ? <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.remove() }} /> : account.username.slice(0, 2).toUpperCase()}
            </div>
            <div><p className="font-semibold text-slate-900">{account.username}</p><p className="text-sm text-slate-600">{account.email}</p></div>
          </div>
          <dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
            <Detail label="ID" value={account.id} className="break-all" />
            <Detail label="Tên người dùng" value={account.username} />
            <Detail label="Email" value={account.email} />
            <Detail label="Số điện thoại" value={account.phone} />
            <Detail label="Vai trò" value={account.roles.map((role) => role.code).join(', ') || '—'} />
            <Detail label="Trạng thái" value={statusLabel(account.status)} />
            <Detail label="Provider" value={account.provider || 'LOCAL'} />
            <Detail label="Xác thực email" value={account.isVerified ? 'Đã xác thực' : 'Chưa xác thực'} />
            <Detail label="Ngày tạo" value={formatDateTime(account.createdAt)} />
          </dl>
        </>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600">Đóng</button>
          {account && <button type="button" onClick={() => onEdit(account)} className="min-h-10 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-sky-600">Sửa tài khoản</button>}
        </div>
      </div>
    </ManagementDialog>
  )
}

function Detail({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return <div className={className}><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-slate-900">{value}</dd></div>
}
