import type { PurchaseOrderStatus } from '../types/purchaseOrder.types'

interface PurchaseOrderStatusBadgeProps {
  status: PurchaseOrderStatus
  isShortClosed?: boolean
  className?: string
}

interface StatusStyle {
  label: string
  badgeClass: string
  dotClass: string
}

const statusConfig: Record<PurchaseOrderStatus, StatusStyle> = {
  DRAFT: {
    label: 'Bản nháp',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-400',
  },
  QUOTED: {
    label: 'Chờ chốt giá',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
    dotClass: 'bg-blue-500',
  },
  CONFIRMED: {
    label: 'Đang giao hàng',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 font-medium',
    dotClass: 'bg-amber-500',
  },
  PARTIALLY_RECEIVED: {
    label: 'Giao một phần',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium',
    dotClass: 'bg-indigo-500 animate-pulse',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
    dotClass: 'bg-emerald-600',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
}

export function PurchaseOrderStatusBadge({
  status,
  isShortClosed = false,
  className = '',
}: PurchaseOrderStatusBadgeProps) {
  if (status === 'COMPLETED' && isShortClosed) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border bg-purple-50 text-purple-700 border-purple-200 whitespace-nowrap shadow-2xs ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-purple-600" />
        <span>Đóng nhận thiếu</span>
      </span>
    )
  }

  const config = statusConfig[status] ?? {
    label: status,
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-400',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border whitespace-nowrap shadow-2xs ${config.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
      <span>{config.label}</span>
    </span>
  )
}
