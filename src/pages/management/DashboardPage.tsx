import { Link } from 'react-router-dom'
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
} from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'

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
    colorClass: 'bg-emerald-500',
    textColor: 'text-emerald-700',
    icon: CheckCircle2,
    description: 'Số lượng tồn an toàn, sẵn sàng xuất kho',
  },
  {
    status: 'Sắp hết hàng',
    count: 12,
    percentage: 3.4,
    colorClass: 'bg-amber-500',
    textColor: 'text-amber-700',
    icon: AlertTriangle,
    description: 'Dưới mức định mức tối thiểu, cần đặt thêm',
  },
  {
    status: 'Hết hàng',
    count: 38,
    percentage: 10.9,
    colorClass: 'bg-rose-500',
    textColor: 'text-rose-700',
    icon: XCircle,
    description: 'Kho đã hết sản phẩm, tạm dừng giao',
  },
  {
    status: 'Ngừng kinh doanh',
    count: 15,
    percentage: 4.3,
    colorClass: 'bg-slate-400',
    textColor: 'text-slate-600',
    icon: Ban,
    description: 'Mẫu cũ đã ngừng nhập mới',
  },
]

export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="space-y-5">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <Link to="/app/dashboard" className="hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-600">Trang chủ</Link>
        <span aria-hidden="true"> / </span><span aria-current="page">Bảng điều khiển</span>
        <Link to="/app/system-info" className="ml-3 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-600">Hồ sơ cá nhân</Link>
      </nav>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bảng điều khiển kinh doanh</h1>
          <p className="mt-1 text-sm text-slate-500">Xin chào, {user?.username || 'Quản trị viên'}! Dưới đây là tổng quan hoạt động kinh doanh của cửa hàng.</p>
        </div>
        <span className="rounded-md bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800">Dữ liệu mẫu / Minh họa</span>
      </div>

      <section aria-label="Chỉ số tổng quan kinh doanh" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_METRICS.map((metric) => (
          <div key={metric.id} className="min-w-0 rounded-md border border-slate-200 bg-white p-4">
            <div className="text-sm text-slate-700">{metric.label}</div>
            <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-slate-950">{metric.value}</div>
            <div className={`mt-2 inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold ${metric.changeType === 'warning' ? 'bg-amber-100 text-amber-800' : metric.changeType === 'positive' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
              {metric.change.split(' so với')[0]}
            </div>
            <div className="mt-1 text-xs text-slate-500">{metric.change.includes('so với') ? 'So với tháng trước' : metric.unit || 'Cần nhập thêm'}</div>
          </div>
        ))}
      </section>

      <section aria-label="Biểu đồ kinh doanh" className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-base font-bold text-slate-900">Biểu đồ doanh thu 6 tháng gần nhất</h2>
          <div className="mt-5 flex h-44 text-xs text-slate-500" role="img" aria-label="Doanh thu từ tháng 5 đến tháng 10, từ 95 đến 128,5 triệu đồng">
            <div className="flex flex-col justify-between pr-2 pb-6 text-right tabular-nums"><span>150M</span><span>100M</span><span>50M</span><span>0</span></div>
            <div className="relative flex-1 min-w-0">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between border-l border-slate-200"><div className="border-t border-slate-100"/><div className="border-t border-slate-100"/><div className="border-t border-slate-100"/><div className="border-t border-slate-200"/></div>
              <div className="relative flex h-full items-end justify-around gap-2 px-2">
                {MOCK_MONTHLY_REVENUE.map((item) => (
                  <div key={item.month} className="flex h-full min-w-0 flex-1 flex-col items-center">
                    <div className="flex w-full flex-1 items-end justify-center">
                      <div className={`relative w-full max-w-10 rounded-t ${item.isCurrent ? 'bg-sky-600' : 'bg-slate-300'}`} style={{ height: `${item.value / 1500000}%` }}>
                        <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-slate-700 tabular-nums">{(item.value / 1000000).toLocaleString('vi-VN')}M</span>
                      </div>
                    </div>
                    <span className="flex h-6 shrink-0 items-end">{item.shortMonth}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Đơn vị: Triệu đồng</p>
          <details className="mt-2 text-xs text-slate-600">
            <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-sky-600">Xem bảng số liệu chi tiết (Hỗ trợ trình đọc màn hình)</summary>
            <table className="mt-2 w-full text-left"><thead><tr><th>Tháng</th><th className="text-right">Doanh thu</th></tr></thead><tbody>{MOCK_MONTHLY_REVENUE.map((item) => <tr key={item.month}><td className="py-1">{item.month}</td><td className="text-right tabular-nums">{item.formatted}</td></tr>)}</tbody></table>
          </details>
        </div>
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-base font-bold text-slate-900">Biểu đồ phân loại trạng thái tồn kho</h2>
          <div className="mt-7 flex h-8 overflow-hidden rounded-md" role="img" aria-label="Tồn kho: Còn hàng 81.4%, Sắp hết hàng 3.4%, Hết hàng 10.9%, Ngừng kinh doanh 4.3%">
            {MOCK_INVENTORY_STATUS.map((item) => <div key={item.status} style={{ width: `${item.percentage}%` }} className={`${item.colorClass} border-r-2 border-white last:border-r-0`} />)}
          </div>
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MOCK_INVENTORY_STATUS.map((item) => (
              <div key={item.status} className="min-w-0 rounded-md border border-slate-200 p-2.5">
                <div className="flex items-center gap-1.5 text-xs text-slate-700"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${item.colorClass}`} />{item.status}</div>
                <div className="mt-2 text-xl font-bold tabular-nums text-slate-950">{item.count}</div>
                <div className="mt-1 text-xs tabular-nums text-slate-500">{item.percentage}%</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
