import { Link, useSearchParams } from 'react-router-dom'
import {
  ClipboardList,
  FileCheck2,
  KeyRound,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { useGetMyProfileQuery } from '../../features/customer/api/profileApi.ts'
import { ProfileInfoSection } from '../../features/customer/components/ProfileInfoSection.tsx'
import { ProfilePasswordSection } from '../../features/customer/components/ProfilePasswordSection.tsx'
import { ProfileAddressesSection } from '../../features/customer/components/ProfileAddressesSection.tsx'
import { ProfileOrdersSection } from '../../features/customer/components/ProfileOrdersSection.tsx'
import { ProfileDeliveriesSection } from '../../features/customer/components/ProfileDeliveriesSection.tsx'
import { ProfileDebtSection } from '../../features/customer/components/ProfileDebtSection.tsx'
import { ProfileQuotationsSection } from '../../features/customer/components/ProfileQuotationsSection.tsx'
import { ProfileWarrantySection } from '../../features/customer/components/ProfileWarrantySection.tsx'

type ProfileTabKey =
  | 'info'
  | 'orders'
  | 'deliveries'
  | 'debt'
  | 'quotations'
  | 'warranty'
  | 'addresses'
  | 'password'

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
    key: 'orders',
    label: 'Đơn hàng của tôi',
    desc: 'Đơn Online, Tại quầy & Dự án công trình',
    icon: ShoppingBag,
  },
  {
    key: 'deliveries',
    label: 'Quá trình giao hàng',
    desc: 'Tiến độ vận chuyển & ảnh xác nhận bàn giao',
    icon: Truck,
  },
  {
    key: 'debt',
    label: 'Công nợ & Hóa đơn',
    desc: 'Hạn mức, dư nợ & biên lai thanh toán',
    icon: Wallet,
  },
  {
    key: 'quotations',
    label: 'Báo giá dự án',
    desc: 'Hồ sơ chào giá & tiến độ chuyển đổi đơn',
    icon: FileCheck2,
  },
  {
    key: 'warranty',
    label: 'Bảo hành & Hỗ trợ',
    desc: 'Bảo hành điện tử & yêu cầu kỹ thuật',
    icon: ShieldCheck,
  },
  {
    key: 'addresses',
    label: 'Sổ địa chỉ',
    desc: 'Thêm, sửa, xóa địa chỉ nhận hàng',
    icon: MapPin,
  },
  {
    key: 'password',
    label: 'Đổi mật khẩu',
    desc: 'Bảo mật tài khoản đăng nhập',
    icon: KeyRound,
  },
]

export function CustomerProfilePage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const isCustomer = user?.roles?.includes('CUSTOMER') ?? false

  const rawTab = searchParams.get('tab') as ProfileTabKey | null
  const orderCodeParam = searchParams.get('order') ?? ''
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
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header Tài khoản Kiến trúc Obsidian */}
      <section className="border border-[#171614] bg-[#171614] px-6 py-7 sm:px-9 sm:py-8 text-[#FAF9F6]">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-white/20 bg-[#24221F] text-[#C5B091] overflow-hidden">
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
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#C5B091]">
                Hồ sơ khách hàng &middot; Thám Vân
              </p>
              <h1 className="font-editorial text-2xl sm:text-3xl font-normal text-white truncate">
                {profile?.fullName || user?.username || 'Khách hàng AquaSuite'}
              </h1>
              <p className="text-xs text-[#A8A39A] truncate">
                {profile?.email || user?.email}
                {profile?.phone ? ` · ${profile.phone}` : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/profile/warranties"
              className="inline-flex items-center gap-2 border border-white/25 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] font-medium text-[#FAF9F6] hover:bg-white hover:text-[#171614] transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-[#C5B091]" aria-hidden="true" />
              <span>Bảo hành của tôi</span>
            </Link>
            <Link
              to="/profile/warranty-tickets"
              className="inline-flex items-center gap-2 border border-white/25 bg-transparent px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] font-medium text-[#FAF9F6] hover:bg-white hover:text-[#171614] transition-colors"
            >
              <ClipboardList className="h-3.5 w-3.5 text-[#C5B091]" aria-hidden="true" />
              <span>Yêu cầu bảo hành của tôi</span>
            </Link>
          </div>
        </div>
      </section>

      {!isCustomer ? (
        <section className="border border-[#E6D3B3] bg-[#FAF5EB] p-6 text-sm text-[#854D0E]">
          Trang này dành cho tài khoản khách hàng. Vui lòng sử dụng hệ thống quản lý cửa hàng cho nghiệp vụ nội bộ.
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Danh mục Hồ sơ */}
          <aside
            aria-label="Danh mục quản lý tài khoản"
            className="lg:col-span-4 border border-[#E6E2DA] bg-white divide-y divide-[#E6E2DA]"
          >
            {PROFILE_TABS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectTab(tab.key)}
                  className={`w-full flex items-center gap-3.5 px-5 py-4 text-left transition-colors cursor-pointer border-l-2 ${
                    active
                      ? 'border-l-[#171614] bg-[#FAF9F6] text-[#171614]'
                      : 'border-l-transparent bg-white text-[#57534E] hover:bg-[#FAF9F6] hover:text-[#171614]'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center border ${
                      active
                        ? 'border-[#171614] bg-[#171614] text-[#C5B091]'
                        : 'border-[#E6E2DA] bg-[#FAF9F6] text-[#78736A]'
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <span className={`block text-xs ${active ? 'font-semibold text-[#171614]' : 'font-medium'}`}>
                      {tab.label}
                    </span>
                    <span className="block text-[11px] text-[#78736A] truncate mt-0.5">
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
                  <div className="border border-[#E6E2DA] bg-white p-12 text-center text-xs text-[#78736A]">
                    Đang tải hồ sơ cá nhân...
                  </div>
                ) : isProfileError || !profile ? (
                  <div className="border border-[#E5B8B8] bg-[#FEF2F2] p-8 text-center space-y-3">
                    <p className="text-xs font-medium text-[#991B1B]">
                      Không thể tải thông tin hồ sơ từ máy chủ.
                    </p>
                    <button
                      type="button"
                      onClick={() => void refetchProfile()}
                      className="border border-[#991B1B] bg-[#991B1B] px-5 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-white cursor-pointer"
                    >
                      Thử lại
                    </button>
                  </div>
                ) : (
                  <ProfileInfoSection profile={profile} />
                )}
              </>
            )}

            {activeTab === 'orders' && (
              <ProfileOrdersSection
                onTrackDelivery={(orderCode) =>
                  setSearchParams(
                    { tab: 'deliveries', ...(orderCode ? { order: orderCode } : {}) },
                    { replace: true },
                  )
                }
              />
            )}
            {activeTab === 'deliveries' && (
              <ProfileDeliveriesSection
                key={orderCodeParam || 'all'}
                initialOrderCode={orderCodeParam}
              />
            )}
            {activeTab === 'debt' && <ProfileDebtSection />}
            {activeTab === 'quotations' && <ProfileQuotationsSection />}
            {activeTab === 'warranty' && <ProfileWarrantySection />}
            {activeTab === 'addresses' && <ProfileAddressesSection />}
            {activeTab === 'password' && <ProfilePasswordSection />}
          </div>
        </div>
      )}
    </div>
  )
}
