import type { QuotationStatus } from '../types/quotation.types'

interface QuotationStatusBadgeProps {
  status: QuotationStatus
  className?: string
}

interface StatusStyle {
  label: string
  badgeClass: string
  dotClass: string
}

const statusConfig: Record<QuotationStatus, StatusStyle> = {
  DRAFT: {
    label: 'Bản nháp',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-400',
  },
  PENDING_APPROVAL: {
    label: 'Chờ duyệt',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
    dotClass: 'bg-amber-500 animate-pulse',
  },
  APPROVED: {
    label: 'Đã duyệt',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-300',
    dotClass: 'bg-sky-500',
  },
  REJECTED: {
    label: 'Từ chối',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
    dotClass: 'bg-rose-500',
  },
  SENT: {
    label: 'Đã gửi khách',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300',
    dotClass: 'bg-indigo-500',
  },
  SUPERSEDED: {
    label: 'Đã thay thế',
    badgeClass: 'bg-zinc-100 text-zinc-400 border-zinc-300 line-through',
    dotClass: 'bg-zinc-400',
  },
  ACCEPTED: {
    label: 'Đã chốt đơn',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-400 font-semibold',
    dotClass: 'bg-emerald-600',
  },
  LOST: {
    label: 'Mất dự án',
    badgeClass: 'bg-red-50 text-red-800 border-red-300',
    dotClass: 'bg-red-500',
  },
}

export function QuotationStatusBadge({ status, className = '' }: QuotationStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-300',
    dotClass: 'bg-slate-400',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wider whitespace-nowrap shadow-2xs ${config.badgeClass} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${config.dotClass}`} />
      <span>{config.label}</span>
    </span>
  )
}
