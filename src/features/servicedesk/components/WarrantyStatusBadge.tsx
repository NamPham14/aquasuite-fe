import type { WarrantyDisplayStatus } from '../types/warranty.types'

const MANAGEMENT_META: Record<WarrantyDisplayStatus, { label: string; className: string }> = {
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

const EDITORIAL_META: Record<WarrantyDisplayStatus, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Còn hiệu lực',
    className: 'bg-[#EEF5F1] text-[#245C42] border-[#C6DDD0]',
  },
  CLAIMED: {
    label: 'Đang bảo hành',
    className: 'bg-[#F2EFE9] text-[#8C6D46] border-[#D6D1C7]',
  },
  EXPIRED: {
    label: 'Hết hạn',
    className: 'bg-[#FAF9F6] text-[#6B6760] border-[#D6D1C7]',
  },
  VOIDED: {
    label: 'Đã hủy',
    className: 'bg-[#FEF2F2] text-[#991B1B] border-[#E5B8B8]',
  },
}

export function WarrantyStatusBadge({
  status,
  tone = 'management',
}: {
  status: WarrantyDisplayStatus
  tone?: 'management' | 'editorial'
}) {
  const isEditorial = tone === 'editorial'
  const meta = (isEditorial ? EDITORIAL_META : MANAGEMENT_META)[status] ??
    (isEditorial ? EDITORIAL_META : MANAGEMENT_META).ACTIVE

  return (
    <span
      className={`inline-flex items-center border px-2.5 py-0.5 text-[11px] font-semibold ${
        isEditorial ? 'uppercase tracking-[0.08em] text-[10px]' : 'rounded-full'
      } ${meta.className}`}
    >
      {meta.label}
    </span>
  )
}
