import { useMemo, useState, type ReactNode } from 'react'
import { Ban, CheckCircle2, Eye, LockKeyhole, Plus, UsersRound } from 'lucide-react'
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
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable.tsx'
import { IamAccessGate } from './IamAccessGate.tsx'
import { ActivityLogPanel } from '../../features/audit'

const pageSize = 10
const primaryButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-sky-700 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-45'
const secondaryButton =
  'inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-45'
const rowGhostButton =
  'inline-flex h-7 items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-45'
const rowDangerGhostButton =
  'inline-flex h-7 items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 text-xs font-medium text-red-700 transition-colors hover:border-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-45'
const rowPrimaryButton =
  'inline-flex h-7 items-center justify-center rounded-md bg-sky-700 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-45'

const AVATAR_COLORS = ['#0369a1', '#256d85', '#8a5a12', '#7a4a8c', '#a03b32', '#3c6e47', '#5b5f97', '#14666e']

const ROLE_LABELS: Record<string, string> = {
  SHOP_OWNER: 'Chủ cửa hàng',
  STORE_OWNER: 'Chủ cửa hàng',
  SALES_STAFF: 'Nhân viên bán hàng',
  SHIPPER: 'Shipper',
  ACCOUNTANT: 'Kế toán',
  CUSTOMER: 'Khách hàng',
}

type DialogState =
  | { type: 'create' }
  | { type: 'detail'; accountId: string }
  | { type: 'edit'; account: UserAccount }
  | { type: 'status'; account: UserAccount; targetStatus: UserAccountStatus }

function roleLabel(code: string) {
  return ROLE_LABELS[code] ?? code
}

function isOwnerRole(code: string) {
  return code === 'SHOP_OWNER' || code === 'STORE_OWNER'
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

function statusLabel(status: UserAccountStatus) {
  return status === 'ACTIVE' ? 'Đang hoạt động' : status === 'INACTIVE' ? 'Ngừng hoạt động' : 'Đã khóa'
}

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function StatusBadge({ status }: { status: UserAccountStatus }) {
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

function AccountAvatar({ account }: { account: UserAccount }) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const bg = avatarColor(account.username || '?')
  return (
    <div
      style={!account.avatarUrl || avatarFailed ? { backgroundColor: bg } : undefined}
      className="flex h-[38px] w-[38px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-700 text-[13.5px] font-bold text-white"
    >
      {account.avatarUrl && !avatarFailed ? (
        <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" onError={() => setAvatarFailed(true)} />
      ) : (
        (account.username || '?').slice(0, 2).toUpperCase()
      )}
    </div>
  )
}

/** Trang quản lý tài khoản người dùng. Phân quyền và quy tắc nghiệp vụ do phân hệ IAM tại Backend kiểm soát. */
export function UsersPage() {
  return (
    <IamAccessGate>
      <UsersContent />
    </IamAccessGate>
  )
}

function UsersContent() {
  useRolesQuery()
  const [keyword, setKeyword] = useState('')
  const [roleId, setRoleId] = useState('')
  const [status, setStatus] = useState<UserAccountStatus | ''>('')
  const [page, setPage] = useState(0)
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [formError, setFormError] = useState('')
  const [formFieldErrors, setFormFieldErrors] = useState<Record<string, string>>({})
  const [statusError, setStatusError] = useState('')

  const query = useMemo(
    () => ({
      keyword: keyword.trim() || undefined,
      roleId: roleId || undefined,
      status: status || undefined,
      page,
      size: pageSize,
    }),
    [keyword, roleId, status, page],
  )

  const list = useGetUserAccountsQuery(query)
  const stats = useGetUserAccountStatsQuery()
  const roles = useGetAssignableRolesQuery()
  const [createAccount, createState] = useCreateUserAccountMutation()
  const [updateAccount, updateState] = useUpdateUserAccountMutation()
  const [changeStatus, statusState] = useChangeUserAccountStatusMutation()

  const rows = list.data?.content ?? []
  const savingForm = createState.isLoading || updateState.isLoading

  function resetFilters() {
    setKeyword('')
    setRoleId('')
    setStatus('')
    setPage(0)
  }
  function changeKeyword(value: string) {
    setKeyword(value)
    setPage(0)
  }
  function changeRole(value: string) {
    setRoleId(value)
    setPage(0)
  }
  function changeStatusFilter(value: UserAccountStatus | '') {
    setStatus(value)
    setPage(0)
  }
  function openDialog(next: DialogState) {
    if (next.type === 'status' && next.account.currentUser && next.targetStatus !== 'ACTIVE') {
      toast.error('Không thể đổi trạng thái tài khoản của chính mình.')
      return
    }
    setFormError('')
    setFormFieldErrors({})
    setStatusError('')
    setDialog(next)
  }

  async function saveAccount(values: UserAccountFormValues) {
    setFormError('')
    setFormFieldErrors({})
    try {
      if (dialog?.type === 'create') {
        const request: CreateUserAccountRequest = {
          username: values.username,
          email: values.email,
          phone: values.phone,
          roleIds: values.roleIds,
          avatarUrl: values.avatarUrl || undefined,
          autoGenerateTemporaryPassword: values.autoGenerateTemporaryPassword,
          temporaryPassword: values.autoGenerateTemporaryPassword ? undefined : values.temporaryPassword,
          confirmTemporaryPassword: values.autoGenerateTemporaryPassword ? undefined : values.confirmTemporaryPassword,
        }
        await createAccount(request).unwrap()
        toast.success('Đã tạo tài khoản nhân viên và gửi thông tin đăng nhập qua email.')
      } else if (dialog?.type === 'edit') {
        const request: UpdateUserAccountRequest = {
          username: values.username,
          email: values.email,
          phone: values.phone,
          roleIds: values.roleIds,
          avatarUrl: values.avatarUrl || undefined,
        }
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
      await changeStatus({
        id: dialog.account.id,
        data: { targetStatus: dialog.targetStatus, reason: reason || undefined },
      }).unwrap()
      toast.success(`Đã cập nhật trạng thái tài khoản thành ${statusLabel(dialog.targetStatus).toLowerCase()}.`)
      setDialog(null)
    } catch (error) {
      setStatusError(getUserAccountErrorState(error).message)
    }
  }

  const columns: ManagementTableColumn<UserAccount>[] = [
    {
      key: 'user',
      header: 'Người dùng',
      cell: (account) => (
        <div className="flex min-w-44 items-center gap-2.5">
          <AccountAvatar account={account} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-slate-900">
              <span className="truncate">{account.username}</span>
              {account.currentUser && (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10.5px] font-extrabold tracking-wide text-sky-700">
                  Bạn
                </span>
              )}
            </div>
            <p className="max-w-[190px] truncate font-mono text-xs text-slate-500" title={account.id}>
              {account.id}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Liên hệ',
      cell: (account) => (
        <div className="whitespace-normal text-[13.5px] text-slate-900">
          <p>{account.email}</p>
          <p className="text-[11.5px] text-slate-500">{formatPhone(account.phone)}</p>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Vai trò',
      cell: (account) => (
        <div className="flex max-w-[210px] flex-wrap gap-1">
          {account.roles.map((role) => (
            <span
              key={role.id}
              title={role.code}
              className={`inline-block whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-bold ${
                isOwnerRole(role.code) ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {roleLabel(role.code)}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (account) => <StatusBadge status={account.status} />,
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      cell: (account) => (
        <span className="whitespace-nowrap text-[13px] text-slate-600">{formatDateTime(account.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      cell: (account) => (
        <div className="flex min-w-64 flex-wrap items-center justify-end gap-1.5">
          <button
            type="button"
            title="Xem chi tiết"
            aria-label={`Xem chi tiết ${account.username}`}
            onClick={() => openDialog({ type: 'detail', accountId: account.id })}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-sky-700 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-700"
          >
            <Eye className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => openDialog({ type: 'edit', account })}
            className={rowGhostButton}
          >
            Sửa
          </button>
          {account.status === 'ACTIVE' ? (
            <>
              <button
                type="button"
                disabled={account.currentUser}
                title={account.currentUser ? 'Không thể vô hiệu hóa chính tài khoản của bạn.' : undefined}
                onClick={() => openDialog({ type: 'status', account, targetStatus: 'INACTIVE' })}
                className={rowGhostButton}
              >
                Vô hiệu hóa
              </button>
              <button
                type="button"
                disabled={account.currentUser}
                title={account.currentUser ? 'Không thể khóa chính tài khoản của bạn.' : undefined}
                onClick={() => openDialog({ type: 'status', account, targetStatus: 'LOCKED' })}
                className={rowDangerGhostButton}
              >
                Khóa
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => openDialog({ type: 'status', account, targetStatus: 'ACTIVE' })}
              className={rowPrimaryButton}
            >
              Kích hoạt
            </button>
          )}
        </div>
      ),
    },
  ]

  const listError = list.isError ? getUserAccountErrorState(list.error).message : ''
  const statsError = stats.isError ? getUserAccountErrorState(stats.error).message : ''
  const totalMatched = list.data?.totalElements ?? rows.length

  return (
    <div className="space-y-4">
      <ManagementPageHeader
        title="Quản lý tài khoản người dùng"
        description="Quản lý tài khoản nội bộ, vai trò và trạng thái truy cập"
        breadcrumb="Tài khoản người dùng"
        group="Quản lý truy cập"
        icon={<UsersRound className="h-6 w-6" />}
      />

      {statsError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
          <span>Không thể tải thống kê: {statsError}</span>
          <button type="button" className={secondaryButton} onClick={() => void stats.refetch()}>
            Thử lại
          </button>
        </div>
      )}

      <section aria-label="Thống kê tài khoản" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy={stats.isLoading}>
        <StatisticCard
          label="Tổng tài khoản"
          value={stats.data?.total}
          icon={<UsersRound className="h-5 w-5" />}
          tone="accent"
          active={status === ''}
          onClick={() => changeStatusFilter('')}
        />
        <StatisticCard
          label="Đang hoạt động"
          value={stats.data?.active}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="ok"
          active={status === 'ACTIVE'}
          onClick={() => changeStatusFilter('ACTIVE')}
        />
        <StatisticCard
          label="Ngừng hoạt động"
          value={stats.data?.inactive}
          icon={<Ban className="h-5 w-5" />}
          tone="warn"
          active={status === 'INACTIVE'}
          onClick={() => changeStatusFilter('INACTIVE')}
        />
        <StatisticCard
          label="Đã khóa"
          value={stats.data?.locked}
          icon={<LockKeyhole className="h-5 w-5" />}
          tone="danger"
          active={status === 'LOCKED'}
          onClick={() => changeStatusFilter('LOCKED')}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="text-[13.5px] text-slate-600">Chỉ Chủ cửa hàng có thể thay đổi tài khoản nội bộ.</p>
        <button type="button" className={primaryButton} onClick={() => openDialog({ type: 'create' })}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tạo tài khoản
        </button>
      </div>

      <ManagementFilterBar>
        <ManagementSearch
          id="user-account-search"
          label="Tìm kiếm"
          value={keyword}
          onChange={changeKeyword}
          placeholder="Tên người dùng, email hoặc số điện thoại"
          disabled={list.isLoading}
        />
        <ManagementSelect
          id="user-account-role-filter"
          label="Vai trò"
          value={roleId}
          onChange={changeRole}
          disabled={list.isLoading || roles.isLoading}
        >
          <option value="">Tất cả vai trò</option>
          {(roles.data ?? []).map((role) => (
            <option key={role.id} value={role.id}>
              {roleLabel(role.code)}
            </option>
          ))}
        </ManagementSelect>
        <ManagementSelect
          id="user-account-status-filter"
          label="Trạng thái"
          value={status}
          onChange={(value) => changeStatusFilter(value as UserAccountStatus | '')}
          disabled={list.isLoading}
        >
          <option value="">Tất cả</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
          <option value="LOCKED">Đã khóa</option>
        </ManagementSelect>
        <button type="button" className={secondaryButton} onClick={resetFilters} disabled={list.isLoading}>
          Đặt lại
        </button>
      </ManagementFilterBar>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs" aria-busy={list.isFetching}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3.5 pb-2.5">
          <h2 id="user-account-list" className="text-[15px] font-bold text-slate-900">
            Danh sách tài khoản hệ thống
          </h2>
          <p className="text-xs text-slate-600">
            {list.isFetching && !list.isLoading
              ? 'Đang cập nhật...'
              : `${totalMatched} tài khoản khớp bộ lọc hiện tại`}
          </p>
        </div>

        {listError && (
          <div role="alert" className="mx-4 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
            <span>{listError}</span>
            <button type="button" className={secondaryButton} onClick={() => void list.refetch()}>
              Thử lại
            </button>
          </div>
        )}

        <div className="hidden md:block [&_table]:text-sm">
          <ManagementTable
            columns={columns}
            rows={rows}
            rowKey={(account) => account.id}
            labelledBy="user-account-list"
            emptyMessage={
              list.isLoading
                ? 'Đang tải tài khoản...'
                : listError
                  ? 'Chưa thể tải dữ liệu.'
                  : 'Không tìm thấy tài khoản phù hợp. Thử đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc vai trò / trạng thái.'
            }
          />
        </div>

        <div className="divide-y divide-slate-200 md:hidden">
          {rows.length === 0 ? (
            <div className="px-5 py-11 text-center text-sm text-slate-600">
              <p className="mb-1 text-[15.5px] font-bold text-slate-900">
                {list.isLoading
                  ? 'Đang tải tài khoản...'
                  : listError
                    ? 'Chưa thể tải dữ liệu.'
                    : 'Không tìm thấy tài khoản phù hợp.'}
              </p>
              {!list.isLoading && !listError && (
                <p>Thử đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc vai trò / trạng thái.</p>
              )}
            </div>
          ) : (
            rows.map((account) => (
              <article key={account.id} className="space-y-3 p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <AccountAvatar account={account} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {account.username}{' '}
                        {account.currentUser && (
                          <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10.5px] font-extrabold text-sky-700">
                            Bạn
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500">{account.email}</p>
                    </div>
                  </div>
                  <StatusBadge status={account.status} />
                </div>

                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  <dt className="font-semibold uppercase tracking-wider text-slate-500">Điện thoại</dt>
                  <dd className="text-right text-slate-700">{formatPhone(account.phone)}</dd>
                  <dt className="font-semibold uppercase tracking-wider text-slate-500">Vai trò</dt>
                  <dd className="text-right text-slate-700">
                    {account.roles.map((role) => roleLabel(role.code)).join(', ')}
                  </dd>
                  <dt className="font-semibold uppercase tracking-wider text-slate-500">Ngày tạo</dt>
                  <dd className="text-right text-slate-700">{formatDateTime(account.createdAt)}</dd>
                </dl>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    aria-label={`Xem chi tiết ${account.username}`}
                    onClick={() => openDialog({ type: 'detail', accountId: account.id })}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-sky-700 hover:text-sky-700"
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={rowGhostButton}
                    onClick={() => openDialog({ type: 'edit', account })}
                  >
                    Sửa
                  </button>
                  {account.status === 'ACTIVE' ? (
                    <>
                      <button
                        type="button"
                        className={rowGhostButton}
                        disabled={account.currentUser}
                        onClick={() => openDialog({ type: 'status', account, targetStatus: 'INACTIVE' })}
                      >
                        Vô hiệu hóa
                      </button>
                      <button
                        type="button"
                        className={rowDangerGhostButton}
                        disabled={account.currentUser}
                        onClick={() => openDialog({ type: 'status', account, targetStatus: 'LOCKED' })}
                      >
                        Khóa
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={rowPrimaryButton}
                      onClick={() => openDialog({ type: 'status', account, targetStatus: 'ACTIVE' })}
                    >
                      Kích hoạt
                    </button>
                  )}
                </div>
              </article>
            ))
          )}
        </div>

        <Pagination
          page={list.data?.page ?? page}
          totalPages={list.data?.totalPages ?? 0}
          totalElements={list.data?.totalElements ?? 0}
          disabled={list.isFetching}
          onChange={setPage}
        />
      </section>

      <ActivityLogPanel
        entityType="USER_ACCOUNT"
        description="Các lần tạo, cập nhật và đổi trạng thái tài khoản nội bộ."
      />

      {dialog?.type === 'create' && (
        <ManagementDialog title="Tạo tài khoản mới" onClose={() => setDialog(null)} closeDisabled={savingForm}>
          <UserAccountForm
            roles={roles.data ?? []}
            rolesLoading={roles.isLoading}
            pending={savingForm}
            apiError={formError || (roles.isError ? getUserAccountErrorState(roles.error).message : '')}
            apiFieldErrors={formFieldErrors}
            onClose={() => setDialog(null)}
            onSubmit={saveAccount}
          />
        </ManagementDialog>
      )}
      {dialog?.type === 'edit' && (
        <ManagementDialog title="Sửa thông tin tài khoản" onClose={() => setDialog(null)} closeDisabled={savingForm}>
          <UserAccountForm
            key={dialog.account.id}
            account={dialog.account}
            roles={roles.data ?? []}
            rolesLoading={roles.isLoading}
            pending={savingForm}
            apiError={formError || (roles.isError ? getUserAccountErrorState(roles.error).message : '')}
            apiFieldErrors={formFieldErrors}
            onClose={() => setDialog(null)}
            onSubmit={saveAccount}
            currentUserId={dialog.account.currentUser ? dialog.account.id : undefined}
          />
        </ManagementDialog>
      )}
      {dialog?.type === 'detail' && (
        <UserAccountDetailDialog
          accountId={dialog.accountId}
          onClose={() => setDialog(null)}
          onEdit={(account) => openDialog({ type: 'edit', account })}
        />
      )}
      {dialog?.type === 'status' && (
        <UserAccountStatusDialog
          account={dialog.account}
          targetStatus={dialog.targetStatus}
          pending={statusState.isLoading}
          error={statusError}
          onClose={() => setDialog(null)}
          onConfirm={confirmStatusChange}
        />
      )}
    </div>
  )
}

function StatisticCard({
  label,
  value,
  icon,
  tone,
  active,
  onClick,
}: {
  label: string
  value?: number
  icon: ReactNode
  tone: 'accent' | 'ok' | 'warn' | 'danger'
  active: boolean
  onClick: () => void
}) {
  const iconTone =
    tone === 'ok'
      ? 'bg-green-50 text-green-700'
      : tone === 'warn'
        ? 'bg-amber-50 text-amber-700'
        : tone === 'danger'
          ? 'bg-red-50 text-red-700'
          : 'bg-sky-50 text-sky-700'

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg border bg-white px-3.5 py-3 text-left shadow-2xs transition-colors focus-visible:outline-2 focus-visible:outline-sky-700 ${
        active ? 'border-sky-700 ring-1 ring-inset ring-sky-700' : 'border-slate-200 hover:border-sky-700'
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>{icon}</span>
      <span>
        <strong className="block text-xl font-bold leading-tight text-slate-900">{value ?? '—'}</strong>
        <span className="block text-xs font-medium text-slate-600">{label}</span>
      </span>
    </button>
  )
}

function Pagination({
  page,
  totalPages,
  totalElements,
  disabled,
  onChange,
}: {
  page: number
  totalPages: number
  totalElements: number
  disabled: boolean
  onChange: (page: number) => void
}) {
  if (totalPages <= 1 && totalElements === 0) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-[12.5px] text-slate-600">
      <span>
        Hiển thị trang {totalPages === 0 ? 0 : page + 1}/{totalPages} · {totalElements} tài khoản
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={disabled || page <= 0}
          onClick={() => onChange(page - 1)}
          className="h-8 min-w-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-bold text-slate-700 hover:border-sky-700 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Trước
        </button>
        <button
          type="button"
          disabled={disabled || totalPages === 0 || page >= totalPages - 1}
          onClick={() => onChange(page + 1)}
          className="h-8 min-w-8 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] font-bold text-slate-700 hover:border-sky-700 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Sau
        </button>
      </div>
    </div>
  )
}