import { useMemo, useState, type ReactNode } from 'react'
import { LockKeyhole, Plus, ShieldCheck, UserRound, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import {
  UserAccountDetailDialog,
  UserAccountForm,
  UserAccountStatusDialog,
  getUserAccountErrorState,
  useChangeUserAccountStatusMutation,
  useCreateUserAccountMutation,
  useGetAssignableRolesQuery,
  useGetUserAccountStatsQuery,
  useGetUserAccountsQuery,
  useUpdateUserAccountMutation,
  useRolesQuery,
  type CreateUserAccountRequest,
  type UpdateUserAccountRequest,
  type UserAccount,
  type UserAccountFormValues,
  type UserAccountStatus,
} from '../../features/iam'
import { ManagementDialog } from '../../shared/ui/ManagementDialog.tsx'
import { ManagementFilterBar, ManagementPageHeader, ManagementSearch, ManagementSelect } from '../../shared/ui/ManagementPage.tsx'
import { ManagementRowActions } from '../../shared/ui/ManagementRowActions.tsx'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable.tsx'
import { IamAccessGate } from './IamAccessGate.tsx'

const pageSize = 10
const primaryButton = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton = 'inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50'

type DialogState =
  | { type: 'create' }
  | { type: 'detail'; accountId: string }
  | { type: 'edit'; account: UserAccount }
  | { type: 'status'; account: UserAccount; targetStatus: UserAccountStatus }

function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function statusLabel(status: UserAccountStatus) {
  return status === 'ACTIVE' ? 'Đang hoạt động' : status === 'INACTIVE' ? 'Ngừng hoạt động' : 'Đã khóa'
}

function StatusBadge({ status }: { status: UserAccountStatus }) {
  const color = status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : status === 'INACTIVE' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-rose-50 text-rose-800 ring-rose-200'
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${color}`}>{statusLabel(status)}</span>
}

function AccountAvatar({ account }: { account: UserAccount }) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  return <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-100 text-[11px] font-bold text-sky-800">
    {account.avatarUrl && !avatarFailed ? <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} /> : account.username.slice(0, 2).toUpperCase()}
  </div>
}

/** UC-05 account dashboard. Server-side authorization and final business rules remain in IAM. */
export function UsersPage() {
  return <IamAccessGate><UsersContent /></IamAccessGate>
}

function UsersContent() {
  // Uses the established IAM access probe; the backend still enforces SHOP_OWNER for every request.
  useRolesQuery()
  const [keyword, setKeyword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [status, setStatus] = useState<UserAccountStatus | ''>('')
  const [page, setPage] = useState(0)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [formError, setFormError] = useState('')
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({})
  const [statusError, setStatusError] = useState('')
  const query = useMemo(() => ({ keyword: keyword.trim() || undefined, roleId: roleId || undefined, status: status || undefined, page, size: pageSize }), [keyword, roleId, status, page])
  const list = useGetUserAccountsQuery(query)
  const stats = useGetUserAccountStatsQuery()
  const roles = useGetAssignableRolesQuery()
  const [createAccount, createState] = useCreateUserAccountMutation()
  const [updateAccount, updateState] = useUpdateUserAccountMutation()
  const [changeStatus, statusState] = useChangeUserAccountStatusMutation()
  const rows = list.data?.content ?? []
  const savingForm = createState.isLoading || updateState.isLoading

  function resetFilters() { setKeyword(''); setRoleId(''); setStatus(''); setPage(0) }
  function changeKeyword(value: string) { setKeyword(value); setPage(0) }
  function changeRole(value: string) { setRoleId(value); setPage(0) }
  function changeStatusFilter(value: UserAccountStatus | '') { setStatus(value); setPage(0) }
  function openDialog(next: DialogState) { setFormError(''); setFormFieldErrors({}); setStatusError(''); setDialog(next) }

  async function saveAccount(values: UserAccountFormValues) {
    setFormError(''); setFormFieldErrors({})
    try {
      if (dialog?.type === 'create') {
        const request: CreateUserAccountRequest = {
          username: values.username, email: values.email, phone: values.phone, roleIds: values.roleIds,
          avatarUrl: values.avatarUrl || undefined, autoGenerateTemporaryPassword: values.autoGenerateTemporaryPassword,
          temporaryPassword: values.autoGenerateTemporaryPassword ? undefined : values.temporaryPassword,
          confirmTemporaryPassword: values.autoGenerateTemporaryPassword ? undefined : values.confirmTemporaryPassword,
        }
        await createAccount(request).unwrap()
        toast.success('Đã tạo tài khoản nhân viên và gửi thông tin đăng nhập qua email.')
      } else if (dialog?.type === 'edit') {
        const request: UpdateUserAccountRequest = { username: values.username, email: values.email, phone: values.phone, roleIds: values.roleIds, avatarUrl: values.avatarUrl || undefined }
        await updateAccount({ id: dialog.account.id, data: request }).unwrap()
        toast.success('Đã cập nhật thông tin tài khoản.')
      }
      setDialog(null)
    } catch (error) {
      const state = getUserAccountErrorState(error)
      setFormError(state.message)
      setFormFieldErrors(state.fields)
    }
  }

  async function confirmStatusChange(reason: string) {
    if (dialog?.type !== 'status') return
    setStatusError('')
    try {
      await changeStatus({ id: dialog.account.id, data: { targetStatus: dialog.targetStatus, reason: reason || undefined } }).unwrap()
      toast.success(`Đã cập nhật trạng thái tài khoản thành ${statusLabel(dialog.targetStatus).toLowerCase()}.`)
      setDialog(null)
    } catch (error) {
      setStatusError(getUserAccountErrorState(error).message)
    }
  }

  const columns: ManagementTableColumn<UserAccount>[] = [
    { key: 'user', header: 'Người dùng', cell: (account) => <div className="flex min-w-44 items-center gap-2"><AccountAvatar account={account} /><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{account.username} {account.currentUser && <span className="rounded bg-sky-100 px-1 text-[10px] font-medium text-sky-800">Bạn</span>}</p><p className="truncate text-xs text-slate-500">{account.id}</p></div></div> },
    { key: 'contact', header: 'Liên hệ', cell: (account) => <div className="space-y-0.5 whitespace-normal"><p>{account.email}</p><p className="text-slate-500">{account.phone}</p></div> },
    { key: 'roles', header: 'Vai trò', cell: (account) => <div className="flex max-w-48 flex-wrap gap-1">{account.roles.map((role) => <span key={role.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700">{role.code}</span>)}</div> },
    { key: 'status', header: 'Trạng thái', cell: (account) => <StatusBadge status={account.status} /> },
    { key: 'createdAt', header: 'Ngày tạo', cell: (account) => formatDateTime(account.createdAt) },
    { key: 'actions', header: 'Thao tác', cell: (account) => <div className="flex min-w-72 flex-wrap items-center gap-2"><ManagementRowActions actions={[
      { variant: 'view', label: 'Xem', ariaLabel: `Xem ${account.username}`, onClick: () => openDialog({ type: 'detail', accountId: account.id }) },
      { variant: 'edit', label: 'Sửa', ariaLabel: `Sửa ${account.username}`, onClick: () => openDialog({ type: 'edit', account }) },
    ]} />
      {account.status === 'ACTIVE' && <><button type="button" disabled={account.currentUser} title={account.currentUser ? 'Không thể vô hiệu hóa chính tài khoản của bạn.' : undefined} onClick={() => openDialog({ type: 'status', account, targetStatus: 'INACTIVE' })} className={secondaryButton}>Vô hiệu hóa</button><button type="button" disabled={account.currentUser} title={account.currentUser ? 'Không thể khóa chính tài khoản của bạn.' : undefined} onClick={() => openDialog({ type: 'status', account, targetStatus: 'LOCKED' })} className={secondaryButton}>Khóa</button></>}
      {(account.status === 'INACTIVE' || account.status === 'LOCKED') && <button type="button" onClick={() => openDialog({ type: 'status', account, targetStatus: 'ACTIVE' })} className={primaryButton}>Kích hoạt</button>}
    </div> },
  ]
  const listError = list.isError ? getUserAccountErrorState(list.error).message : ''
  const statsError = stats.isError ? getUserAccountErrorState(stats.error).message : ''

  return <div className="space-y-5">
    <ManagementPageHeader title="Quản lý tài khoản người dùng" description="Quản lý tài khoản nội bộ, vai trò và trạng thái truy cập" breadcrumb="Tài khoản người dùng" group="Quản lý truy cập" icon={<UsersRound className="h-6 w-6" />} />
    {statsError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><span>Không thể tải thống kê: {statsError}</span><button type="button" className={secondaryButton} onClick={() => void stats.refetch()}>Thử lại</button></div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy={stats.isLoading}>
      <StatisticCard label="Tổng tài khoản" value={stats.data?.total} icon={<UsersRound className="h-5 w-5" />} active={status === ''} onClick={() => changeStatusFilter('')} />
      <StatisticCard label="Đang hoạt động" value={stats.data?.active} icon={<ShieldCheck className="h-5 w-5" />} active={status === 'ACTIVE'} onClick={() => changeStatusFilter('ACTIVE')} />
      <StatisticCard label="Ngừng hoạt động" value={stats.data?.inactive} icon={<UserRound className="h-5 w-5" />} active={status === 'INACTIVE'} onClick={() => changeStatusFilter('INACTIVE')} />
      <StatisticCard label="Đã khóa" value={stats.data?.locked} icon={<LockKeyhole className="h-5 w-5" />} active={status === 'LOCKED'} onClick={() => changeStatusFilter('LOCKED')} />
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Chỉ Chủ cửa hàng có thể thay đổi tài khoản nội bộ.</p><button type="button" className={primaryButton} onClick={() => openDialog({ type: 'create' })}><Plus className="h-4 w-4" aria-hidden="true" /> Tạo tài khoản</button></div>
    <ManagementFilterBar>
      <ManagementSearch id="user-account-search" label="Tìm kiếm" value={keyword} onChange={changeKeyword} placeholder="Tên người dùng, email hoặc số điện thoại" disabled={list.isLoading} />
      <ManagementSelect id="user-account-role-filter" label="Vai trò" value={roleId} onChange={changeRole} disabled={list.isLoading || roles.isLoading}><option value="">Tất cả vai trò</option>{(roles.data ?? []).map((role) => <option key={role.id} value={role.id}>{role.code}</option>)}</ManagementSelect>
      <ManagementSelect id="user-account-status-filter" label="Trạng thái" value={status} onChange={(value) => changeStatusFilter(value as UserAccountStatus | '')} disabled={list.isLoading}><option value="">Tất cả</option><option value="ACTIVE">Đang hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option><option value="LOCKED">Đã khóa</option></ManagementSelect>
      <button type="button" className={secondaryButton} onClick={resetFilters} disabled={list.isLoading}>Đặt lại</button>
    </ManagementFilterBar>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-busy={list.isFetching}>
      <div className="flex items-center justify-between gap-3 px-4 py-4"><h2 id="user-account-list" className="text-base font-semibold text-slate-900">Danh sách tài khoản hệ thống</h2>{list.isFetching && !list.isLoading && <span className="text-xs text-slate-500">Đang cập nhật...</span>}</div>
      {listError && <div role="alert" className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800"><span>{listError}</span><button type="button" className={secondaryButton} onClick={() => void list.refetch()}>Thử lại</button></div>}
      <div className="hidden md:block [&_table]:text-sm"><ManagementTable columns={columns} rows={rows} rowKey={(account) => account.id} labelledBy="user-account-list" emptyMessage={list.isLoading ? 'Đang tải tài khoản...' : listError ? 'Chưa thể tải dữ liệu.' : 'Không tìm thấy tài khoản phù hợp.'} /></div>
      <div className="space-y-3 p-4 md:hidden">{rows.length === 0 ? <p className="py-8 text-center text-sm text-slate-600">{list.isLoading ? 'Đang tải tài khoản...' : listError ? 'Chưa thể tải dữ liệu.' : 'Không tìm thấy tài khoản phù hợp.'}</p> : rows.map((account) => <article key={account.id} className="space-y-3 rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><AccountAvatar account={account} /><div className="min-w-0"><p className="truncate font-semibold text-slate-900">{account.username} {account.currentUser && <span className="rounded bg-sky-100 px-1 text-[10px] text-sky-800">Bạn</span>}</p><p className="truncate text-xs text-slate-500">{account.email}</p></div></div><StatusBadge status={account.status} /></div><dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm"><dt className="text-slate-500">Điện thoại</dt><dd className="text-right text-slate-700">{account.phone}</dd><dt className="text-slate-500">Vai trò</dt><dd className="text-right text-slate-700">{account.roles.map((role) => role.code).join(', ')}</dd><dt className="text-slate-500">Ngày tạo</dt><dd className="text-right text-slate-700">{formatDateTime(account.createdAt)}</dd></dl><div className="flex flex-wrap gap-2"><button type="button" className={secondaryButton} onClick={() => openDialog({ type: 'detail', accountId: account.id })}>Xem</button><button type="button" className={secondaryButton} onClick={() => openDialog({ type: 'edit', account })}>Sửa</button>{account.status === 'ACTIVE' && <><button type="button" className={secondaryButton} disabled={account.currentUser} onClick={() => openDialog({ type: 'status', account, targetStatus: 'INACTIVE' })}>Vô hiệu hóa</button><button type="button" className={secondaryButton} disabled={account.currentUser} onClick={() => openDialog({ type: 'status', account, targetStatus: 'LOCKED' })}>Khóa</button></>}{(account.status === 'INACTIVE' || account.status === 'LOCKED') && <button type="button" className={primaryButton} onClick={() => openDialog({ type: 'status', account, targetStatus: 'ACTIVE' })}>Kích hoạt</button>}</div></article>)}</div>
      <Pagination page={list.data?.page ?? page} totalPages={list.data?.totalPages ?? 0} totalElements={list.data?.totalElements ?? 0} disabled={list.isFetching} onChange={setPage} />
    </section>
    {dialog?.type === 'create' && <ManagementDialog title="Tạo tài khoản mới" onClose={() => setDialog(null)} closeDisabled={savingForm}><UserAccountForm roles={roles.data ?? []} rolesLoading={roles.isLoading} pending={savingForm} apiError={formError || (roles.isError ? getUserAccountErrorState(roles.error).message : '')} apiFieldErrors={formFieldErrors} onClose={() => setDialog(null)} onSubmit={saveAccount} /></ManagementDialog>}
    {dialog?.type === 'edit' && <ManagementDialog title="Sửa thông tin tài khoản" onClose={() => setDialog(null)} closeDisabled={savingForm}><UserAccountForm key={dialog.account.id} account={dialog.account} roles={roles.data ?? []} rolesLoading={roles.isLoading} pending={savingForm} apiError={formError || (roles.isError ? getUserAccountErrorState(roles.error).message : '')} apiFieldErrors={formFieldErrors} onClose={() => setDialog(null)} onSubmit={saveAccount} /></ManagementDialog>}
    {dialog?.type === 'detail' && <UserAccountDetailDialog accountId={dialog.accountId} onClose={() => setDialog(null)} onEdit={(account) => openDialog({ type: 'edit', account })} />}
    {dialog?.type === 'status' && <UserAccountStatusDialog account={dialog.account} targetStatus={dialog.targetStatus} pending={statusState.isLoading} error={statusError} onClose={() => setDialog(null)} onConfirm={confirmStatusChange} />}
  </div>
}

function StatisticCard({ label, value, icon, active, onClick }: { label: string; value?: number; icon: ReactNode; active: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-lg border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 ${active ? 'border-sky-500 bg-sky-50' : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40'}`}><span className="flex items-center gap-2 text-sky-700">{icon}<span className="text-sm font-medium text-slate-700">{label}</span></span><strong className="mt-3 block text-2xl text-slate-900">{value ?? '—'}</strong></button>
}

function Pagination({ page, totalPages, totalElements, disabled, onChange }: { page: number; totalPages: number; totalElements: number; disabled: boolean; onChange: (page: number) => void }) {
  if (totalPages <= 1 && totalElements === 0) return null
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600"><span>Hiển thị trang {totalPages === 0 ? 0 : page + 1}/{totalPages} · {totalElements} tài khoản</span><div className="flex gap-2"><button type="button" disabled={disabled || page <= 0} onClick={() => onChange(page - 1)} className={secondaryButton}>Trước</button><button type="button" disabled={disabled || totalPages === 0 || page >= totalPages - 1} onClick={() => onChange(page + 1)} className={secondaryButton}>Sau</button></div></div>
}
