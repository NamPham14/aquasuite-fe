import type { PurchaseOrderStatus } from '../types/purchaseOrder.types'

interface PurchaseOrderStatusBadgeProps {
  status: PurchaseOrderStatus
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
  CONFIRMED: {
    label: 'Đã xác nhận',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
    dotClass: 'bg-sky-500',
  },
  PARTIALLY_RECEIVED: {
    label: 'Nhận một phần',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  COMPLETED: {
    label: 'Hoàn thành',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-400 font-semibold',
    dotClass: 'bg-emerald-600',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    dotClass: 'bg-rose-500',
  },
}

export function PurchaseOrderStatusBadge({ status, className = '' }: PurchaseOrderStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-400',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dotClass}`} />
      <span>{config.label}</span>
    </span>
  )
}
