import { useState } from 'react'
import { RefreshCw, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { authApi } from '../../features/iam/api/authApi.ts'
import { setUserProfile } from '../../features/iam/model/authSlice.ts'
import { useAppDispatch } from '../../app/store.ts'
import { normalizeApiError } from '../../shared/api/apiError.ts'

const roleLabels: Record<string, string> = {
  SHOP_OWNER: 'Chủ cửa hàng',
  SALES_STAFF: 'Nhân viên bán hàng',
  ACCOUNTANT: 'Kế toán',
  TECHNICAL_STAFF: 'Nhân viên kỹ thuật',
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
        toast.success(`Đã cập nhật hồ sơ người dùng (${res.data.username})`)
      }
    } catch (err: unknown) {
      const error = normalizeApiError(err)
      toast.error(`Không thể làm mới hồ sơ: ${error.message}`)
    } finally {
      setIsRefreshingProfile(false)
    }
  }

  const roles = user?.roles ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hồ sơ cá nhân</h1>
          <p className="mt-1 text-sm text-slate-500">Thông tin tài khoản của bạn tại AquaSuite.</p>
        </div>
        <button type="button" onClick={() => void handleRefreshProfile()} disabled={isRefreshingProfile} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-wait disabled:opacity-50 sm:self-auto">
          <RefreshCw className={`h-4 w-4 ${isRefreshingProfile ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />
          {isRefreshingProfile ? 'Đang tải...' : 'Làm mới hồ sơ'}
        </button>
      </div>

      <section aria-labelledby="profile-summary" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xl font-semibold text-sky-800" aria-hidden="true">
            {user?.username ? user.username.slice(0, 2).toUpperCase() : <UserRound className="h-7 w-7" />}
          </div>
          <div className="min-w-0">
            <h2 id="profile-summary" className="break-words text-lg font-semibold text-slate-900">{user?.username || 'Chưa có tên người dùng'}</h2>
            <p className="mt-1 break-all text-sm text-slate-500">{user?.email || 'Chưa có email'}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="profile-details" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
        <h2 id="profile-details" className="text-base font-semibold text-slate-900">Thông tin tài khoản</h2>
        <p className="mt-1 text-sm text-slate-500">Thông tin hiện có của tài khoản đang đăng nhập.</p>
        <dl className="mt-5 grid gap-5 border-t border-slate-100 pt-5 sm:grid-cols-2 sm:gap-6">
          <div><dt className="text-xs font-medium text-slate-500">Tên người dùng</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{user?.username || 'Chưa có thông tin'}</dd></div>
          <div><dt className="text-xs font-medium text-slate-500">Email</dt><dd className="mt-1 break-all text-sm font-medium text-slate-900">{user?.email || 'Chưa có thông tin'}</dd></div>
          <div><dt className="text-xs font-medium text-slate-500">Vai trò</dt><dd className="mt-1 flex flex-wrap gap-2">{roles.length ? roles.map((role) => <span key={role} className="rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">{roleLabels[role] ? `${roleLabels[role]} (${role})` : role}</span>) : <span className="text-sm text-slate-600">Chưa được gán vai trò</span>}</dd></div>
        </dl>
      </section>
      <details className="rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 sm:px-6">Đổi mật khẩu</summary>
        <p className="border-t border-slate-100 px-5 py-4 text-sm text-slate-600 sm:px-6">Chức năng đổi mật khẩu chưa sẵn sàng.</p>
      </details>
    </div>
  )
}
