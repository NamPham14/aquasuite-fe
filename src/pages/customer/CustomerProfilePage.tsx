import { Link, useSearchParams } from 'react-router-dom'
import {
  ClipboardList,
  KeyRound,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { useGetMyProfileQuery } from '../../features/customer/api/profileApi.ts'
import { ProfileInfoSection } from '../../features/customer/components/ProfileInfoSection.tsx'
import { ProfilePasswordSection } from '../../features/customer/components/ProfilePasswordSection.tsx'
import { ProfileAddressesSection } from '../../features/customer/components/ProfileAddressesSection.tsx'
import { ProfileOrdersSection } from '../../features/customer/components/ProfileOrdersSection.tsx'
import { ProfileWarrantySection } from '../../features/customer/components/ProfileWarrantySection.tsx'

type ProfileTabKey = 'info' | 'password' | 'addresses' | 'orders' | 'warranty'

const PROFILE_TABS: Array<{
  key: ProfileTabKey
  label: string
  desc: string
  icon: typeof UserRound
}> = [
  {
    key: 'info',
    label: 'Thông tin & SĐT',
    desc: 'Họ tên, số điện thoại, ảnh đại diện',
    icon: UserRound,
  },
  {
    key: 'password',
    label: 'Đổi mật khẩu',
    desc: 'Bảo mật tài khoản đăng nhập',
    icon: KeyRound,
  },
  {
    key: 'addresses',
    label: 'Sổ địa chỉ',
    desc: 'Thêm, sửa, xóa địa chỉ nhận hàng',
    icon: MapPin,
  },
  {
    key: 'orders',
    label: 'Lịch sử đơn hàng',
    desc: 'Theo dõi đơn & thanh toán PayOS',
    icon: ShoppingBag,
  },
  {
    key: 'warranty',
    label: 'Bảo hành & Hỗ trợ',
    desc: 'Bảo hành điện tử & yêu cầu kỹ thuật',
    icon: ShieldCheck,
  },
]

export function CustomerProfilePage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const isCustomer = user?.roles?.includes('CUSTOMER') ?? false

  const rawTab = searchParams.get('tab') as ProfileTabKey | null
  const activeTab: ProfileTabKey =
    rawTab && PROFILE_TABS.some((t) => t.key === rawTab) ? rawTab : 'info'

  const {
    data: profile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
    refetch: refetchProfile,
  } = useGetMyProfileQuery(undefined, { skip: !isCustomer })

  const selectTab = (tab: ProfileTabKey) => {
    setSearchParams(tab === 'info' ? {} : { tab }, { replace: true })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header Tài khoản nền tối kính mờ đồng bộ với Showroom */}
      <section className="relative rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-slate-950 via-sky-950 to-indigo-950 p-6 sm:p-7 text-white shadow-xl shadow-slate-950/15 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 aqua-hero-grid opacity-45"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-sky-500 text-slate-950 shadow-lg shadow-cyan-500/30 overflow-hidden">
              {profile?.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.fullName || user?.username || 'Khách hàng'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-7 w-7" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                Trung tâm Tài khoản Khách hàng
              </p>
              <h1 className="text-xl sm:text-2xl font-black text-white truncate">
                {profile?.fullName || user?.username || 'Khách hàng AquaSuite'}
              </h1>
              <p className="mt-0.5 text-xs text-slate-300 truncate">
                {profile?.email || user?.email}
                {profile?.phone ? ` • ${profile.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/profile/warranties"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
              <span>Bảo hành của tôi</span>
            </Link>
            <Link
              to="/profile/warranty-tickets"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20 transition"
            >
              <ClipboardList className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />
              <span>Yêu cầu bảo hành của tôi</span>
            </Link>
          </div>
        </div>
      </section>

      {!isCustomer ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Trang này dành cho tài khoản khách hàng. Vui lòng sử dụng hệ thống quản lý cửa hàng cho nghiệp vụ nội bộ.
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sidebar Danh mục Hồ sơ */}
          <aside
            aria-label="Danh mục quản lý tài khoản"
            className="lg:col-span-4 rounded-3xl border border-sky-200/80 bg-white/95 p-3 shadow-sm space-y-1"
          >
            {PROFILE_TABS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectTab(tab.key)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-500/20'
                      : 'text-slate-700 hover:bg-sky-50/70'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-sky-50 text-sky-700 border border-sky-100'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <span className="block text-xs font-extrabold">{tab.label}</span>
                    <span
                      className={`block text-[11px] truncate ${
                        active ? 'text-cyan-100' : 'text-slate-500'
                      }`}
                    >
                      {tab.desc}
                    </span>
                  </div>
                </button>
              )
            })}
          </aside>

          {/* Nội dung Tab tương ứng */}
          <div className="lg:col-span-8">
            {activeTab === 'info' && (
              <>
                {isLoadingProfile ? (
                  <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
                    Đang tải hồ sơ cá nhân...
                  </div>
                ) : isProfileError || !profile ? (
                  <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
                    <p className="text-xs font-semibold text-rose-800">
                      Không thể tải thông tin hồ sơ từ máy chủ.
                    </p>
                    <button
                      type="button"
                      onClick={() => void refetchProfile()}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : (
                  <ProfileInfoSection profile={profile} />
                )}
              </>
            )}

            {activeTab === 'password' && <ProfilePasswordSection />}
            {activeTab === 'addresses' && <ProfileAddressesSection />}
            {activeTab === 'orders' && <ProfileOrdersSection />}
            {activeTab === 'warranty' && <ProfileWarrantySection />}
          </div>
        </div>
      )}
    </div>
  )
}
