import { useMemo, useState } from 'react'
import { Eye, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  IamAccessGate,
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
import { ManagementDialog } from '../../shared/ui/ManagementDialog'
import {
  ManagementMobileList,
  ManagementPagination,
  ManagementTable,
  ManagementTableSkeleton,
  type ManagementTableColumn,
} from '../../shared/ui/ManagementTable'
import {
  ManagementFilterCard,
  ManagementFilterChip,
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
  ManagementSearch,
  ManagementSelect,
  ManagementStatCard,
} from '../../shared/ui/ManagementPage'
import { Button, IconButton, SakugaActionButton, Tooltip } from '../../shared/ui/Button'
import { Notice, StatusBadge, type StatusTone } from '../../shared/ui/Badge'
import { EmptyState, ErrorState, OPERATIONAL_TOAST_CLASS } from '../../shared/ui/FeedbackStates'
import { ActivityLogPanel } from '../../features/audit'

const pageSize = 10

const AVATAR_COLORS = ['#087f8c', '#256d85', '#8a5a12', '#6a4b7c', '#983d36', '#24724f', '#4e598c', '#14666e']

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

function statusTone(status: UserAccountStatus): StatusTone {
  return status === 'ACTIVE' ? 'positive' : status === 'INACTIVE' ? 'neutral' : 'danger'
}

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function AccountAvatar({ account }: { account: UserAccount }) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const bg = avatarColor(account.username || '?')
  return (
    <div
      style={!account.avatarUrl || avatarFailed ? { backgroundColor: bg } : undefined}
      className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full text-xs font-bold tracking-wide text-white"
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
  const hasActiveFilters = Boolean(keyword || roleId || status)
  const selectedRoleLabel = useMemo(() => {
    if (!roleId) return ''
    const found = (roles.data ?? []).find((r) => r.id === roleId)
    return found ? roleLabel(found.code) : 'Vai trò đã chọn'
  }, [roleId, roles.data])

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
      toast.error('Không thể đổi trạng thái tài khoản của chính mình.', { className: OPERATIONAL_TOAST_CLASS })
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
        toast.success('Đã tạo tài khoản nhân viên và gửi thông tin đăng nhập qua email.', {
          className: OPERATIONAL_TOAST_CLASS,
        })
      } else if (dialog?.type === 'edit') {
        const request: UpdateUserAccountRequest = {
          username: values.username,
          email: values.email,
          phone: values.phone,
          roleIds: values.roleIds,
          avatarUrl: values.avatarUrl || undefined,
        }
        await updateAccount({ id: dialog.account.id, data: request }).unwrap()
        toast.success('Đã cập nhật thông tin tài khoản.', { className: OPERATIONAL_TOAST_CLASS })
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
      toast.success(`Đã cập nhật trạng thái tài khoản thành ${statusLabel(dialog.targetStatus).toLowerCase()}.`, {
        className: OPERATIONAL_TOAST_CLASS,
      })
      setDialog(null)
    } catch (error) {
      setStatusError(getUserAccountErrorState(error).message)
    }
  }

  const columns: ManagementTableColumn<UserAccount>[] = [
    {
      key: 'user',
      header: 'Người dùng',
      cellClassName: '!whitespace-normal',
      cell: (account) => (
        <div className="flex min-w-[160px] items-center gap-2.5">
          <AccountAvatar account={account} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-semibold text-aqs-ink">
              <span className="truncate">{account.username}</span>
              {account.currentUser && (
                <span className="rounded-chip border border-aqs-accent-border bg-aqs-accent-soft px-1.5 py-0.5 text-[11px] font-bold text-aqs-accent-hover">
                  Bạn
                </span>
              )}
            </div>
            <p className="mt-0.5 max-w-[145px] truncate text-[11.5px] tabular-nums text-aqs-ink-faint" title={account.id}>
              {account.id}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Liên hệ',
      cellClassName: '!whitespace-normal',
      cell: (account) => (
        <div className="space-y-0.5">
          <div className="font-medium text-aqs-ink">{account.email}</div>
          <div className="text-xs tabular-nums text-aqs-ink-faint">{formatPhone(account.phone)}</div>
        </div>
      ),
    },
    {
      key: 'roles',
      header: 'Vai trò',
      cellClassName: '!whitespace-normal',
      cell: (account) => (
        <div className="flex max-w-[190px] flex-wrap gap-1">
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
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      cell: (account) => (
        <StatusBadge tone={statusTone(account.status)}>{statusLabel(account.status)}</StatusBadge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Ngày tạo',
      align: 'center',
      cell: (account) => (
        <span className="whitespace-nowrap text-[13px] tabular-nums text-aqs-ink-muted">
          {formatDateTime(account.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      cell: (account) => (
        <div className="flex flex-nowrap items-center justify-center gap-1.5">
          <IconButton
            size="sm"
            label={`Xem chi tiết ${account.username}`}
            icon={<Eye />}
            onClick={() => openDialog({ type: 'detail', accountId: account.id })}
          />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="min-h-8 px-2.5 text-xs"
            onClick={() => openDialog({ type: 'edit', account })}
          >
            Sửa
          </Button>
          {account.status === 'ACTIVE' ? (
            <>
              {account.currentUser ? (
                <Tooltip label="Không thể vô hiệu hóa chính tài khoản của bạn.">
                  <Button type="button" size="sm" variant="secondary" className="min-h-8 px-2.5 text-xs" disabled>
                    Vô hiệu hóa
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="min-h-8 px-2.5 text-xs"
                  onClick={() => openDialog({ type: 'status', account, targetStatus: 'INACTIVE' })}
                >
                  Vô hiệu hóa
                </Button>
              )}
              {account.currentUser ? (
                <Tooltip label="Không thể khóa chính tài khoản của bạn.">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger-outline"
                    className="min-h-8 px-2.5 text-xs"
                    disabled
                  >
                    Khóa
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="danger-outline"
                  className="min-h-8 px-2.5 text-xs"
                  onClick={() => openDialog({ type: 'status', account, targetStatus: 'LOCKED' })}
                >
                  Khóa
                </Button>
              )}
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="primary"
              className="min-h-8 px-2.5 text-xs"
              onClick={() => openDialog({ type: 'status', account, targetStatus: 'ACTIVE' })}
            >
              Kích hoạt
            </Button>
          )}
        </div>
      ),
    },
  ]

  const listError = list.isError ? getUserAccountErrorState(list.error).message : ''
  const statsError = stats.isError ? getUserAccountErrorState(stats.error).message : ''
  const totalMatched = list.data?.totalElements ?? rows.length
  const totalPages = list.data?.totalPages ?? 0

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title="Quản lý tài khoản người dùng"
        description="Quản lý tài khoản nội bộ, vai trò và trạng thái truy cập. Chỉ Chủ cửa hàng có thể thay đổi tài khoản nội bộ."
        group="Quản lý truy cập"
        breadcrumb="Tài khoản người dùng"
        actions={
          <SakugaActionButton icon={<Plus />} onClick={() => openDialog({ type: 'create' })}>
            Tạo tài khoản
          </SakugaActionButton>
        }
      />

      {statsError && (
        <Notice tone="danger" role="alert" title="Không thể tải thống kê tài khoản">
          <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
            <span>{statsError}</span>
            <Button type="button" size="sm" variant="secondary" onClick={() => void stats.refetch()}>
              Thử lại
            </Button>
          </div>
        </Notice>
      )}

      <section
        aria-label="Thống kê tài khoản"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-busy={stats.isLoading}
      >
        <ManagementStatCard
          label="Tổng tài khoản"
          value={stats.data?.total}
          loading={stats.isLoading}
          tone="accent"
          active={status === ''}
          onClick={() => changeStatusFilter('')}
        />
        <ManagementStatCard
          label="Đang hoạt động"
          value={stats.data?.active}
          loading={stats.isLoading}
          tone="positive"
          active={status === 'ACTIVE'}
          onClick={() => changeStatusFilter('ACTIVE')}
        />
        <ManagementStatCard
          label="Ngừng hoạt động"
          value={stats.data?.inactive}
          loading={stats.isLoading}
          tone="warning"
          active={status === 'INACTIVE'}
          onClick={() => changeStatusFilter('INACTIVE')}
        />
        <ManagementStatCard
          label="Đã khóa"
          value={stats.data?.locked}
          loading={stats.isLoading}
          tone="danger"
          active={status === 'LOCKED'}
          onClick={() => changeStatusFilter('LOCKED')}
        />
      </section>

      <ManagementFilterCard
        headingId="user-filters-heading"
        title="Tìm và lọc tài khoản"
        description="Kết quả tự cập nhật theo từ khóa, vai trò hoặc trạng thái hoạt động."
        hasActiveFilters={hasActiveFilters}
        resetLabel="Đặt lại"
        resetDisabled={list.isLoading}
        onReset={resetFilters}
        summaryChips={
          <>
            {keyword && <ManagementFilterChip>Từ khóa: {keyword}</ManagementFilterChip>}
            {roleId && <ManagementFilterChip>Vai trò: {selectedRoleLabel}</ManagementFilterChip>}
            {status && <ManagementFilterChip>Trạng thái: {statusLabel(status)}</ManagementFilterChip>}
          </>
        }
        resultCount={`${totalMatched.toLocaleString('vi-VN')} kết quả`}
      >
        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 lg:grid-cols-[minmax(260px,2fr)_minmax(180px,1fr)_minmax(180px,1fr)]">
          <ManagementSearch
            id="user-account-search"
            label="Tìm kiếm"
            value={keyword}
            onChange={changeKeyword}
            placeholder="Tên người dùng, email hoặc số điện thoại…"
            disabled={list.isLoading}
            className="md:col-span-2 lg:col-span-1"
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
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
            <option value="LOCKED">Đã khóa</option>
          </ManagementSelect>
        </div>
      </ManagementFilterCard>

      <ManagementPanel
        headingId="user-account-list"
        title="Danh sách tài khoản hệ thống"
        description={`${totalMatched.toLocaleString('vi-VN')} tài khoản khớp bộ lọc hiện tại.`}
        refreshing={list.isFetching && !list.isLoading}
        refreshLabel="Đang cập nhật dữ liệu..."
        busy={list.isFetching}
      >
        {list.isLoading ? (
          <ManagementTableSkeleton
            rows={5}
            columns={6}
            withLeadingAvatar
            label="Đang tải danh sách tài khoản"
          />
        ) : listError ? (
          <ErrorState
            sectionLabel="Danh sách tài khoản hệ thống"
            title="Không thể tải danh sách tài khoản"
            message={listError}
            retrying={list.isFetching}
            onRetry={() => void list.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Không tìm thấy tài khoản phù hợp"
            description={
              keyword.trim()
                ? `Không tìm thấy tài khoản nào khớp với “${keyword.trim()}”. Hãy thử từ khóa khác hoặc bỏ bớt bộ lọc.`
                : 'Chưa có tài khoản nào khớp với bộ lọc vai trò / trạng thái hiện tại.'
            }
            search={keyword}
            hasFilters={hasActiveFilters}
            onClearSearch={() => changeKeyword('')}
            onResetFilters={resetFilters}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <ManagementTable
                columns={columns}
                rows={rows}
                rowKey={(account) => account.id}
                labelledBy="user-account-list"
                emptyMessage="Không có tài khoản."
                compact
              />
            </div>

            <ManagementMobileList
              rows={rows}
              rowKey={(account) => account.id}
              emptyMessage="Không có tài khoản."
              renderRow={(account) => (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <AccountAvatar account={account} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-aqs-ink">
                          <span className="truncate">{account.username}</span>
                          {account.currentUser && (
                            <span className="rounded-chip border border-aqs-accent-border bg-aqs-accent-soft px-1.5 py-0.5 text-[11px] font-bold text-aqs-accent-hover">
                              Bạn
                            </span>
                          )}
                        </div>
                        <p className="m-0 truncate text-xs text-aqs-ink-muted">{account.email}</p>
                      </div>
                    </div>
                    <StatusBadge tone={statusTone(account.status)}>{statusLabel(account.status)}</StatusBadge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-control bg-aqs-surface-subtle px-3 py-2.5 text-xs">
                    <div>
                      <span className="block text-[11px] text-aqs-ink-faint">Điện thoại</span>
                      <strong className="mt-0.5 block font-semibold tabular-nums text-aqs-ink">
                        {formatPhone(account.phone)}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[11px] text-aqs-ink-faint">Ngày tạo</span>
                      <strong className="mt-0.5 block font-semibold tabular-nums text-aqs-ink">
                        {formatDateTime(account.createdAt)}
                      </strong>
                    </div>
                    <div className="col-span-2">
                      <span className="block text-[11px] text-aqs-ink-faint">Vai trò</span>
                      <strong className="mt-0.5 block font-semibold text-aqs-ink">
                        {account.roles.map((role) => roleLabel(role.code)).join(', ')}
                      </strong>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <IconButton
                      size="sm"
                      label={`Xem chi tiết ${account.username}`}
                      icon={<Eye />}
                      onClick={() => openDialog({ type: 'detail', accountId: account.id })}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => openDialog({ type: 'edit', account })}
                    >
                      Sửa
                    </Button>
                    {account.status === 'ACTIVE' ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={account.currentUser}
                          onClick={() => openDialog({ type: 'status', account, targetStatus: 'INACTIVE' })}
                        >
                          Vô hiệu hóa
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger-outline"
                          disabled={account.currentUser}
                          onClick={() => openDialog({ type: 'status', account, targetStatus: 'LOCKED' })}
                        >
                          Khóa
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => openDialog({ type: 'status', account, targetStatus: 'ACTIVE' })}
                      >
                        Kích hoạt
                      </Button>
                    )}
                  </div>
                </div>
              )}
            />

            <ManagementPagination
              page={list.data?.page ?? page}
              totalPages={totalPages}
              totalElements={totalMatched}
              shownCount={rows.length}
              noun="tài khoản"
              disabled={list.isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </ManagementPanel>

      <ActivityLogPanel
        entityType="USER_ACCOUNT"
        description="Các lần tạo, cập nhật và đổi trạng thái tài khoản nội bộ."
        operational
      />

      {dialog?.type === 'create' && (
        <ManagementDialog
          title="Tạo tài khoản mới"
          onClose={() => setDialog(null)}
          closeDisabled={savingForm}
        >
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
        <ManagementDialog
          title="Sửa thông tin tài khoản"
          onClose={() => setDialog(null)}
          closeDisabled={savingForm}
        >
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
    </ManagementPageShell>
  )
}
