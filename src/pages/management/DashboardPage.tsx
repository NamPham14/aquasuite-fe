import { Link } from 'react-router-dom'
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
  UserRound,
  ArrowRight,
  Plus,
  Truck,
  BadgeCheck,
  ReceiptText,
  LifeBuoy,
  Warehouse,
} from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import {
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
} from '../../shared/ui/ManagementPage.tsx'
import { StatusBadge } from '../../shared/ui/Badge.tsx'

// Mock KPI metrics data
const MOCK_METRICS = [
  {
    id: 'revenue',
    label: 'Tổng doanh thu',
    value: '128.500.000 ₫',
    change: '+12.5% so với tháng trước',
    changeType: 'positive' as const,
    icon: TrendingUp,
  },
  {
    id: 'orders',
    label: 'Tổng đơn hàng',
    value: '1.240',
    unit: 'đơn hàng',
    change: '+8.2% so với tháng trước',
    changeType: 'positive' as const,
    icon: ShoppingCart,
  },
  {
    id: 'products',
    label: 'Tổng sản phẩm',
    value: '350',
    unit: 'sản phẩm',
    change: '+15 sản phẩm mới trong tháng',
    changeType: 'neutral' as const,
    icon: Package,
  },
  {
    id: 'low-stock',
    label: 'Sản phẩm sắp hết hàng',
    value: '12',
    unit: 'sản phẩm',
    change: 'Cần bổ sung kho dự trữ',
    changeType: 'warning' as const,
    icon: AlertTriangle,
  },
]

// Mock Monthly Revenue data
const MOCK_MONTHLY_REVENUE = [
  { month: 'Tháng 5', shortMonth: 'T5', value: 95000000, formatted: '95.000.000 ₫', heightPercent: 63, isCurrent: false },
  { month: 'Tháng 6', shortMonth: 'T6', value: 105000000, formatted: '105.000.000 ₫', heightPercent: 70, isCurrent: false },
  { month: 'Tháng 7', shortMonth: 'T7', value: 112000000, formatted: '112.000.000 ₫', heightPercent: 75, isCurrent: false },
  { month: 'Tháng 8', shortMonth: 'T8', value: 118000000, formatted: '118.000.000 ₫', heightPercent: 79, isCurrent: false },
  { month: 'Tháng 9', shortMonth: 'T9', value: 122000000, formatted: '122.000.000 ₫', heightPercent: 81, isCurrent: false },
  { month: 'Tháng 10', shortMonth: 'T10', value: 128500000, formatted: '128.500.000 ₫', heightPercent: 86, isCurrent: true },
]

// Mock Inventory Status data
const MOCK_INVENTORY_STATUS = [
  {
    status: 'Còn hàng',
    count: 285,
    percentage: 81.4,
    colorClass: 'bg-aqs-positive',
    textColor: 'text-aqs-positive',
    icon: CheckCircle2,
    description: 'Số lượng tồn an toàn, sẵn sàng xuất kho',
  },
  {
    status: 'Sắp hết hàng',
    count: 12,
    percentage: 3.4,
    colorClass: 'bg-aqs-warning',
    textColor: 'text-aqs-warning',
    icon: AlertTriangle,
    description: 'Dưới mức định mức tối thiểu, cần đặt thêm',
  },
  {
    status: 'Hết hàng',
    count: 38,
    percentage: 10.9,
    colorClass: 'bg-aqs-danger',
    textColor: 'text-aqs-danger',
    icon: XCircle,
    description: 'Kho đã hết sản phẩm, tạm dừng giao',
  },
  {
    status: 'Ngừng kinh doanh',
    count: 15,
    percentage: 4.3,
    colorClass: 'bg-slate-400',
    textColor: 'text-aqs-ink-muted',
    icon: Ban,
    description: 'Mẫu cũ đã ngừng nhập mới',
  },
]

const QUICK_ACTIONS = [
  {
    title: 'Tạo đơn tại quầy (POS)',
    description: 'Lập đơn bán lẻ trực tiếp và kiểm tra hạn mức công nợ.',
    to: '/app/orders/pos',
    icon: Plus,
    roles: ['SALES_STAFF', 'SHOP_OWNER'],
  },
  {
    title: 'Quản lý đơn hàng',
    description: 'Xác nhận đơn online, theo dõi thanh toán và xuất hóa đơn.',
    to: '/app/orders',
    icon: ShoppingCart,
    roles: ['SALES_STAFF', 'ACCOUNTANT', 'SHOP_OWNER'],
  },
  {
    title: 'Đơn giao của tôi',
    description: 'Nhận hàng đi giao và cập nhật trạng thái từng đợt giao.',
    to: '/app/my-deliveries',
    icon: Truck,
    roles: ['SHIPPER'],
  },
  {
    title: 'Xác minh thanh toán',
    description: 'Đối chiếu chứng từ chuyển khoản của khách hàng.',
    to: '/app/payment-verifications',
    icon: BadgeCheck,
    roles: ['ACCOUNTANT'],
  },
  {
    title: 'Phân bổ tiền thu',
    description: 'Gán phiếu thu đã xác minh vào hóa đơn điện tử.',
    to: '/app/payment-allocations',
    icon: ReceiptText,
    roles: ['ACCOUNTANT'],
  },
  {
    title: 'Tồn kho & Ngưỡng min',
    description: 'Kiểm tra hàng khả dụng và cảnh báo SKU sắp hết hàng.',
    to: '/app/inventory',
    icon: Warehouse,
    roles: ['SHOP_OWNER', 'ACCOUNTANT'],
  },
  {
    title: 'Yêu cầu bảo hành',
    description: 'Tiếp nhận và xử lý phiếu bảo hành từ khách hàng.',
    to: '/app/warranty-tickets',
    icon: LifeBuoy,
    roles: ['SHOP_OWNER'],
  },
] as const

export function DashboardPage() {
  const { user } = useAuth()
  const roles = user?.roles ?? []
  const roleQuickActions = QUICK_ACTIONS.filter((action) =>
    action.roles.some((r) => roles.includes(r)),
  )
  const visibleQuickActions = (roleQuickActions.length > 0 ? roleQuickActions : QUICK_ACTIONS).slice(0, 4)

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        breadcrumb="Bảng điều khiển"
        title="Bảng điều khiển kinh doanh"
        description={`Xin chào, ${user?.username || 'Quản trị viên'}! Dưới đây là tổng quan hoạt động kinh doanh của cửa hàng.`}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <StatusBadge tone="accent">
              Dữ liệu mẫu / Minh họa
            </StatusBadge>
            <Link
              to="/app/system-info"
              className="inline-flex h-10 items-center gap-2 rounded-control border border-aqs-border bg-aqs-surface px-3.5 text-sm font-medium text-aqs-ink transition-colors hover:border-aqs-border-strong hover:bg-aqs-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent"
            >
              <UserRound className="h-4 w-4 text-aqs-ink-muted" aria-hidden="true" />
              Hồ sơ cá nhân
            </Link>
          </div>
        }
      />

      <section aria-label="Lối tắt nghiệp vụ nhanh" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visibleQuickActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.to}
              to={action.to}
              className="group flex flex-col justify-between rounded-card border border-aqs-border bg-aqs-surface p-4 transition-colors hover:border-aqs-accent-border-strong hover:bg-aqs-accent-soft/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-control border border-aqs-accent-border bg-aqs-accent-soft text-aqs-accent">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <ArrowRight
                  className="h-4 w-4 text-aqs-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-aqs-accent"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-3">
                <p className="text-sm font-bold text-aqs-ink group-hover:text-aqs-accent-hover">
                  {action.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-aqs-ink-muted">
                  {action.description}
                </p>
              </div>
            </Link>
          )
        })}
      </section>

      <section
        aria-label="Chỉ số tổng quan kinh doanh"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {MOCK_METRICS.map((metric) => {
          const Icon = metric.icon
          const iconTone =
            metric.changeType === 'warning'
              ? 'bg-aqs-warning-soft text-aqs-warning border-aqs-warning-border'
              : metric.changeType === 'positive'
                ? 'bg-aqs-accent-soft text-aqs-accent border-aqs-accent/15'
                : 'bg-aqs-surface-subtle text-aqs-ink-muted border-aqs-border'
          const badgeTone =
            metric.changeType === 'warning'
              ? ('warning' as const)
              : metric.changeType === 'positive'
                ? ('positive' as const)
                : ('neutral' as const)

          return (
            <div
              key={metric.id}
              className="min-w-0 rounded-card border border-aqs-border bg-aqs-surface p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-colors hover:border-slate-300"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-[13px] font-medium text-aqs-ink-muted">{metric.label}</div>
                <span
                  aria-hidden="true"
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${iconTone}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-aqs-ink">
                {metric.value}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <StatusBadge tone={badgeTone}>
                  {metric.change.split(' so với')[0]}
                </StatusBadge>
              </div>
              <div className="mt-1.5 text-xs text-aqs-ink-muted">
                {metric.change.includes('so với')
                  ? 'So với tháng trước'
                  : metric.unit || 'Cần nhập thêm'}
              </div>
            </div>
          )
        })}
      </section>

      <section aria-label="Biểu đồ kinh doanh" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ManagementPanel
          headingId="dashboard-revenue-chart"
          title="Biểu đồ doanh thu 6 tháng gần nhất"
          description="Đơn vị tính: Triệu đồng (VNĐ)"
        >
          <div className="p-5">
          <div
            className="mt-1 flex h-48 text-xs text-aqs-ink-muted"
            role="img"
            aria-label="Doanh thu từ tháng 5 đến tháng 10, từ 95 đến 128,5 triệu đồng"
          >
            <div className="flex flex-col justify-between pr-2.5 pb-6 text-right tabular-nums">
              <span>150M</span>
              <span>100M</span>
              <span>50M</span>
              <span>0</span>
            </div>
            <div className="relative min-w-0 flex-1">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between border-l border-aqs-border"
              >
                <div className="border-t border-aqs-divider" />
                <div className="border-t border-aqs-divider" />
                <div className="border-t border-aqs-divider" />
                <div className="border-t border-aqs-border" />
              </div>
              <div className="relative flex h-full items-end justify-around gap-2 px-2">
                {MOCK_MONTHLY_REVENUE.map((item) => (
                  <div
                    key={item.month}
                    className="flex h-full min-w-0 flex-1 flex-col items-center"
                  >
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div
                        className={`relative w-full max-w-10 rounded-t-md transition-colors ${
                          item.isCurrent ? 'bg-aqs-accent' : 'bg-slate-300/90 hover:bg-slate-400/80'
                        }`}
                        style={{ height: `${item.value / 1500000}%` }}
                      >
                        <span
                          className={`absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap text-xs font-semibold tabular-nums ${
                            item.isCurrent ? 'text-aqs-accent' : 'text-aqs-ink-muted'
                          }`}
                        >
                          {(item.value / 1000000).toLocaleString('vi-VN')}M
                        </span>
                      </div>
                    </div>
                    <span className="flex h-6 shrink-0 items-end font-medium text-aqs-ink-muted">
                      {item.shortMonth}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <details className="mt-4 border-t border-aqs-divider pt-3 text-xs text-aqs-ink-muted">
            <summary className="cursor-pointer font-medium text-aqs-ink-muted transition-colors hover:text-aqs-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-accent">
              Xem bảng số liệu chi tiết (Hỗ trợ trình đọc màn hình)
            </summary>
            <table className="mt-2.5 w-full text-left">
              <thead>
                <tr className="border-b border-aqs-divider text-aqs-ink-muted">
                  <th className="py-1.5 font-semibold">Tháng</th>
                  <th className="py-1.5 text-right font-semibold">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-aqs-divider">
                {MOCK_MONTHLY_REVENUE.map((item) => (
                  <tr key={item.month}>
                    <td className="py-1.5 text-aqs-ink">{item.month}</td>
                    <td className="py-1.5 text-right font-medium tabular-nums text-aqs-ink">
                      {item.formatted}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          </div>
        </ManagementPanel>

        <ManagementPanel
          headingId="dashboard-inventory-chart"
          title="Biểu đồ phân loại trạng thái tồn kho"
          description="Tỷ trọng 350 sản phẩm đang quản lý trong kho"
        >
          <div className="p-5">
          <div
            className="mt-2 flex h-8 overflow-hidden rounded-control bg-aqs-surface-subtle"
            role="img"
            aria-label="Tồn kho: Còn hàng 81.4%, Sắp hết hàng 3.4%, Hết hàng 10.9%, Ngừng kinh doanh 4.3%"
          >
            {MOCK_INVENTORY_STATUS.map((item) => (
              <div
                key={item.status}
                style={{ width: `${item.percentage}%` }}
                className={`${item.colorClass} border-r-2 border-aqs-surface last:border-r-0`}
                title={`${item.status}: ${item.count} (${item.percentage}%)`}
              />
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MOCK_INVENTORY_STATUS.map((item) => (
              <div
                key={item.status}
                className="min-w-0 rounded-control border border-aqs-border bg-aqs-surface-subtle/40 p-3"
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-aqs-ink-muted">
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 shrink-0 rounded-full ${item.colorClass}`}
                  />
                  <span className="truncate">{item.status}</span>
                </div>
                <div className="mt-2 text-xl font-bold tabular-nums text-aqs-ink">
                  {item.count}
                </div>
                <div className={`mt-0.5 text-xs font-medium tabular-nums ${item.textColor}`}>
                  {item.percentage}%
                </div>
              </div>
            ))}
          </div>
          </div>
        </ManagementPanel>
      </section>
    </ManagementPageShell>
  )
}
