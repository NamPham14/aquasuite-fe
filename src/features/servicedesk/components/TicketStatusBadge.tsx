import type { WarrantyTicketStatus } from '../types/warrantyTicket.types'

const STATUS_META: Record<
  WarrantyTicketStatus,
  { label: string; className: string }
> = {
  NEW: {
    label: 'Đã gửi',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  IN_PROGRESS: {
    label: 'Đang xử lý',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  DONE: {
    label: 'Hoàn tất',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Từ chối',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  CANCELLED: {
    label: 'Đã hủy',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
}

export function TicketStatusBadge({ status }: { status: WarrantyTicketStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.NEW
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}

