import { useState, type ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog.tsx'
import { Button } from '../../../shared/ui/Button'
import { CodeChip, StatusBadge, type StatusTone } from '../../../shared/ui/Badge'
import { ErrorState } from '../../../shared/ui/FeedbackStates'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { useGetUserAccountQuery } from '../api/userAccountApi.ts'
import type { UserAccount } from '../types/userAccount.types.ts'

const AVATAR_COLORS = ['#087f8c', '#256d85', '#8a5a12', '#6a4b7c', '#983d36', '#24724f', '#4e598c', '#14666e']

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

function isOwnerRole(code: string) {
  return code === 'SHOP_OWNER' || code === 'STORE_OWNER'
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

function statusMeta(status: UserAccount['status']): { label: string; tone: StatusTone } {
  if (status === 'ACTIVE') return { label: 'Đang hoạt động', tone: 'positive' }
  if (status === 'INACTIVE') return { label: 'Ngừng hoạt động', tone: 'neutral' }
  return { label: 'Đã khóa', tone: 'danger' }
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
      <div className="space-y-5 p-5 sm:p-6">
        {detail.isLoading && (
          <div className="space-y-3" aria-label="Đang tải thông tin tài khoản">
            <div className="flex items-center gap-3 rounded-card border border-aqs-border bg-aqs-surface-subtle p-4">
              <span className="aqs-animate-skeleton h-12 w-12 shrink-0 rounded-full bg-aqs-skeleton" />
              <div className="space-y-2">
                <span className="aqs-animate-skeleton block h-3 w-36 rounded bg-aqs-skeleton" />
                <span className="aqs-animate-skeleton block h-3 w-48 rounded bg-aqs-skeleton" />
              </div>
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="grid grid-cols-[140px_1fr] gap-4 py-1">
                <span className="aqs-animate-skeleton h-3 w-2/3 rounded bg-aqs-skeleton" />
                <span className="aqs-animate-skeleton h-3 w-3/4 rounded bg-aqs-skeleton" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <ErrorState
            sectionLabel="Hồ sơ tài khoản"
            title="Không thể tải thông tin tài khoản"
            message={error}
            retrying={detail.isFetching}
            onRetry={() => void detail.refetch()}
            compact
          />
        )}

        {account && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-card border border-aqs-border bg-aqs-surface-subtle px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  style={
                    !account.avatarUrl || avatarFailed
                      ? { backgroundColor: avatarColor(account.username || '?') }
                      : undefined
                  }
                  className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full text-base font-bold text-white"
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
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="m-0 truncate text-base font-bold text-aqs-ink">{account.username}</p>
                    {account.currentUser && (
                      <span className="rounded-chip border border-aqs-accent-border bg-aqs-accent-soft px-1.5 py-0.5 text-[11px] font-bold text-aqs-accent-hover">
                        Bạn
                      </span>
                    )}
                  </div>
                  <p className="m-0 truncate text-[13px] text-aqs-ink-muted">{account.email}</p>
                </div>
              </div>
              <StatusBadge tone={statusMeta(account.status).tone}>
                {statusMeta(account.status).label}
              </StatusBadge>
            </div>

            <dl className="grid grid-cols-1 gap-x-4 gap-y-2.5 text-[13.5px] sm:grid-cols-[155px_minmax(0,1fr)]">
              <DetailRow label="Mã định danh (ID)">
                <CodeChip>{account.id}</CodeChip>
              </DetailRow>
              <DetailRow label="Tên người dùng">{account.username}</DetailRow>
              <DetailRow label="Email">{account.email}</DetailRow>
              <DetailRow label="Số điện thoại">{formatPhone(account.phone)}</DetailRow>
              <DetailRow label="Vai trò">
                {account.roles.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {account.roles.map((role) => (
                      <span
                        key={role.id}
                        title={role.code}
                        className={`inline-flex items-center whitespace-nowrap rounded-chip border px-2 py-0.5 text-xs font-semibold ${
                          isOwnerRole(role.code)
                            ? 'border-aqs-accent-border bg-aqs-accent-soft text-aqs-accent-hover'
                            : 'border-aqs-border bg-aqs-surface-subtle text-aqs-ink-muted'
                        }`}
                      >
                        {roleLabel(role.code)}
                      </span>
                    ))}
                  </div>
                ) : (
                  '—'
                )}
              </DetailRow>
              <DetailRow label="Trạng thái">
                <StatusBadge tone={statusMeta(account.status).tone}>
                  {statusMeta(account.status).label}
                </StatusBadge>
              </DetailRow>
              <DetailRow label="Provider">{account.provider || 'LOCAL'}</DetailRow>
              <DetailRow label="Xác thực email">
                <StatusBadge tone={account.isVerified ? 'positive' : 'neutral'}>
                  {account.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                </StatusBadge>
              </DetailRow>
              <DetailRow label="Ngày tạo">
                <span className="tabular-nums">{formatDateTime(account.createdAt)}</span>
              </DetailRow>
            </dl>
          </>
        )}

        <div className="flex justify-end gap-2 border-t border-aqs-border pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Đóng
          </Button>
          {account && (
            <Button
              type="button"
              variant="primary"
              icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
              onClick={() => onEdit(account)}
            >
              Sửa tài khoản
            </Button>
          )}
        </div>
      </div>
    </ManagementDialog>
  )
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[12.5px] font-semibold text-aqs-ink-faint">{label}</dt>
      <dd className="m-0 break-words font-semibold text-aqs-ink">{children}</dd>
    </>
  )
}
