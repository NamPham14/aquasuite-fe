import type { WarrantyTicketStatus } from '../types/warrantyTicket.types'

const MANAGEMENT_META: Record<WarrantyTicketStatus, { label: string; className: string }> = {
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

const EDITORIAL_META: Record<WarrantyTicketStatus, { label: string; className: string }> = {
  NEW: {
    label: 'Đã gửi',
    className: 'bg-[#FAF9F6] text-[#171614] border-[#D6D1C7]',
  },
  IN_PROGRESS: {
    label: 'Đang xử lý',
    className: 'bg-[#FAF5EB] text-[#854D0E] border-[#E6D3B3]',
  },
  DONE: {
    label: 'Hoàn tất',
    className: 'bg-[#EEF5F1] text-[#245C42] border-[#C6DDD0]',
  },
  REJECTED: {
    label: 'Từ chối',
    className: 'bg-[#FEF2F2] text-[#991B1B] border-[#E5B8B8]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    className: 'bg-[#F2EFE9] text-[#6B6760] border-[#D6D1C7]',
  },
}

export function TicketStatusBadge({
  status,
  tone = 'management',
}: {
  status: WarrantyTicketStatus
  tone?: 'management' | 'editorial'
}) {
  const isEditorial = tone === 'editorial'
  const meta = (isEditorial ? EDITORIAL_META : MANAGEMENT_META)[status] ??
    (isEditorial ? EDITORIAL_META : MANAGEMENT_META).NEW

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
