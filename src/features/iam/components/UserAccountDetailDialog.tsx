import { useState, type ReactNode } from 'react'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog.tsx'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { useGetUserAccountQuery } from '../api/userAccountApi.ts'
import type { UserAccount } from '../types/userAccount.types.ts'

const AVATAR_COLORS = ['#0369a1', '#256d85', '#8a5a12', '#7a4a8c', '#a03b32', '#3c6e47', '#5b5f97', '#14666e']

const ROLE_LABELS: Record<string, string> = {
  SHOP_OWNER: 'Chủ cửa hàng',
  STORE_OWNER: 'Chủ cửa hàng',
  SALES_STAFF: 'Nhân viên bán hàng',
  SHIPPER: 'Shipper',
  ACCOUNTANT: 'Kế toán',
  CUSTOMER: 'Khách hàng',
}

function roleLabel(code: string) {
  return ROLE_LABELS[code] ?? code
}

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatPhone(phone: string) {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits.length === 10 ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}` : phone
}

function statusLabel(status: UserAccount['status']) {
  return status === 'ACTIVE' ? 'Đang hoạt động' : status === 'INACTIVE' ? 'Ngừng hoạt động' : 'Đã khóa'
}

function StatusBadge({ status }: { status: UserAccount['status'] }) {
  const style =
    status === 'ACTIVE'
      ? 'bg-green-50 text-green-700'
      : status === 'INACTIVE'
        ? 'bg-slate-100 text-slate-600'
        : 'bg-red-50 text-red-700'
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${style}`}>
      <span className="h-[7px] w-[7px] rounded-full bg-current" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  )
}

export function UserAccountDetailDialog({
  accountId,
  onClose,
  onEdit,
}: {
  accountId: string
  onClose: () => void
  onEdit: (account: UserAccount) => void
}) {
  const detail = useGetUserAccountQuery(accountId)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const account = detail.data
  const error = detail.isError ? normalizeApiError(detail.error).message : ''

  return (
    <ManagementDialog title="Chi tiết tài khoản" onClose={onClose}>
      <div className="space-y-4 p-5 sm:p-6">
        {detail.isLoading && <p className="text-sm text-slate-600">Đang tải thông tin tài khoản...</p>}
        {error && (
          <div role="alert" className="space-y-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void detail.refetch()}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium"
            >
              Thử lại
            </button>
          </div>
        )}
        {account && (
          <>
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3.5">
              <div
                style={!account.avatarUrl || avatarFailed ? { backgroundColor: avatarColor(account.username || '?') } : undefined}
                className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-700 text-base font-bold text-white"
              >
                {account.avatarUrl && !avatarFailed ? (
                  <img
                    src={account.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  (account.username || '?').slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900">{account.username}</p>
                <p className="truncate text-[13px] text-slate-600">{account.email}</p>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-x-3.5 gap-y-2 text-[13.5px] sm:grid-cols-[150px_1fr]">
              <DetailRow label="ID">
                <span className="font-mono text-[12.5px] font-medium text-slate-800">{account.id}</span>
              </DetailRow>
              <DetailRow label="Tên người dùng">{account.username}</DetailRow>
              <DetailRow label="Email">{account.email}</DetailRow>
              <DetailRow label="Số điện thoại">{formatPhone(account.phone)}</DetailRow>
              <DetailRow label="Vai trò">
                {account.roles.map((role) => roleLabel(role.code)).join(', ') || '—'}
              </DetailRow>
              <DetailRow label="Trạng thái">
                <StatusBadge status={account.status} />
              </DetailRow>
              <DetailRow label="Provider">{account.provider || 'LOCAL'}</DetailRow>
              <DetailRow label="Xác thực email">{account.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}</DetailRow>
              <DetailRow label="Ngày tạo">{formatDateTime(account.createdAt)}</DetailRow>
            </dl>
          </>
        )}
        <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-700"
          >
            Đóng
          </button>
          {account && (
            <button
              type="button"
              onClick={() => onEdit(account)}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-sky-700 px-3.5 text-[13px] font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-sky-700"
            >
              Sửa tài khoản
            </button>
          )}
        </div>
      </div>
    </ManagementDialog>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="pt-0.5 text-[12.5px] font-semibold text-slate-500">{label}</dt>
      <dd className="break-words font-semibold text-slate-900">{children}</dd>
    </>
  )
}