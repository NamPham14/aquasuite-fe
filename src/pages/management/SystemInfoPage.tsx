import { useState } from 'react'
import { RefreshCw, UserRound, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { authApi } from '../../features/iam/api/authApi.ts'
import { setUserProfile } from '../../features/iam/model/authSlice.ts'
import { useAppDispatch } from '../../app/store.ts'
import { normalizeApiError } from '../../shared/api/apiError.ts'
import {
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
} from '../../shared/ui/ManagementPage.tsx'
import { Button } from '../../shared/ui/Button.tsx'
import { CodeChip } from '../../shared/ui/Badge.tsx'
import { OPERATIONAL_TOAST_CLASS } from '../../shared/ui/FeedbackStates.tsx'

const roleLabels: Record<string, string> = {
  SHOP_OWNER: 'Chủ cửa hàng',
  SALES_STAFF: 'Nhân viên bán hàng',
  ACCOUNTANT: 'Kế toán',
  SHIPPER: 'Nhân viên giao nhận',
  CUSTOMER: 'Khách hàng',
}

export function SystemInfoPage() {
  const { user, sessionGeneration } = useAuth()
  const dispatch = useAppDispatch()
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false)

  // Lấy /me mới và cập nhật profile chỉ nếu generation của phiên vẫn khớp.
  const handleRefreshProfile = async () => {
    setIsRefreshingProfile(true)
    try {
      const res = await dispatch(
        authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
      ).unwrap()
      if (res.data) {
        dispatch(setUserProfile({ user: res.data, generation: sessionGeneration }))
        toast.success(`Đã cập nhật hồ sơ người dùng (${res.data.username})`, {
          className: OPERATIONAL_TOAST_CLASS,
        })
      }
    } catch (err: unknown) {
      const error = normalizeApiError(err)
      toast.error(`Không thể làm mới hồ sơ: ${error.message}`, {
        className: OPERATIONAL_TOAST_CLASS,
      })
    } finally {
      setIsRefreshingProfile(false)
    }
  }

  const roles = user?.roles ?? []

  return (
    <ManagementPageShell className="mx-auto max-w-4xl">
      <ManagementPageHeader
        group="Hệ thống"
        breadcrumb="Hồ sơ cá nhân"
        title="Hồ sơ cá nhân"
        description="Thông tin tài khoản đang đăng nhập tại AquaSuite."
        actions={
          <Button
            variant="secondary"
            onClick={() => void handleRefreshProfile()}
            loading={isRefreshingProfile}
          >
            {!isRefreshingProfile && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            {isRefreshingProfile ? 'Đang tải...' : 'Làm mới hồ sơ'}
          </Button>
        }
      />

      <section
        aria-labelledby="profile-summary"
        className="rounded-card border border-aqs-border bg-aqs-surface p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] sm:p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-aqs-accent/15 bg-aqs-accent-soft text-xl font-bold text-aqs-accent"
            aria-hidden="true"
          >
            {user?.username ? (
              user.username.slice(0, 2).toUpperCase()
            ) : (
              <UserRound className="h-7 w-7" />
            )}
          </div>
          <div className="min-w-0">
            <h2 id="profile-summary" className="break-words text-lg font-bold text-aqs-ink">
              {user?.username || 'Chưa có tên người dùng'}
            </h2>
            <p className="mt-0.5 break-all text-sm text-aqs-ink-muted">
              {user?.email || 'Chưa có email'}
            </p>
          </div>
        </div>
      </section>

      <ManagementPanel
        headingId="profile-details"
        title="Thông tin tài khoản"
        description="Thông tin hiện có của tài khoản đang đăng nhập."
      >
        <div className="p-5 sm:p-6">
        <dl className="grid gap-5 sm:grid-cols-2 sm:gap-6">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-aqs-ink-muted">
              Tên người dùng
            </dt>
            <dd className="mt-1.5 break-words text-sm font-medium text-aqs-ink">
              {user?.username || 'Chưa có thông tin'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-aqs-ink-muted">
              Email
            </dt>
            <dd className="mt-1.5 break-all text-sm font-medium text-aqs-ink">
              {user?.email || 'Chưa có thông tin'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-aqs-ink-muted">
              Vai trò
            </dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {roles.length ? (
                roles.map((role) => (
                  <CodeChip key={role}>
                    {roleLabels[role] ? `${roleLabels[role]} (${role})` : role}
                  </CodeChip>
                ))
              ) : (
                <span className="text-sm text-aqs-ink-muted">Chưa được gán vai trò</span>
              )}
            </dd>
          </div>
        </dl>
        </div>
      </ManagementPanel>

      <details className="rounded-card border border-aqs-border bg-aqs-surface shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <summary className="flex cursor-pointer items-center gap-2 px-5 py-4 text-sm font-semibold text-aqs-ink transition-colors hover:bg-aqs-surface-subtle/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent sm:px-6">
          <KeyRound className="h-4 w-4 text-aqs-ink-muted" aria-hidden="true" />
          Đổi mật khẩu
        </summary>
        <p className="border-t border-aqs-divider px-5 py-4 text-sm text-aqs-ink-muted sm:px-6">
          Chức năng đổi mật khẩu chưa sẵn sàng.
        </p>
      </details>
    </ManagementPageShell>
  )
}
