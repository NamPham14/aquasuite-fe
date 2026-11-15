import type { WarrantyDisplayStatus } from '../types/warranty.types'

const STATUS_META: Record<
  WarrantyDisplayStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: 'Còn hiệu lực',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CLAIMED: {
    label: 'Đang bảo hành',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  EXPIRED: {
    label: 'Hết hạn',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  VOIDED: {
    label: 'Đã hủy',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
}

export function WarrantyStatusBadge({ status }: { status: WarrantyDisplayStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.ACTIVE
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}

