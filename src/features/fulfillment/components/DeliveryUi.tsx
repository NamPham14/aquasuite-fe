import type { ReactNode } from 'react'
import { StatusBadge } from '../../../shared/ui/Badge'
import { deliveryStatuses, type DeliveryStatus } from '../types/delivery.types'
import { deliveryButton } from './deliveryPresentation'

export function DeliveryBadge({ status }: { status: DeliveryStatus }) {
  const tone =
    status === 'DELIVERED'
      ? ('positive' as const)
      : status === 'RESCHEDULED'
        ? ('warning' as const)
        : status === 'FAILED' || status === 'CANCELLED'
          ? ('danger' as const)
          : status === 'IN_TRANSIT'
            ? ('accent' as const)
            : ('neutral' as const)
  return <StatusBadge tone={tone}>{deliveryStatuses[status] ?? status}</StatusBadge>
}

export function DeliveryPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-card border border-aqs-border bg-aqs-surface p-5">
      <h2 className="mb-3 border-b border-aqs-border pb-3 text-sm font-bold text-aqs-ink">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function DeliveryPagination({
  page,
  totalPages,
  totalElements,
  onChange,
  busy,
}: {
  page: number
  totalPages: number
  totalElements: number
  onChange: (p: number) => void
  busy: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-aqs-border bg-aqs-surface-subtle/60 px-5 py-3 text-xs text-aqs-ink-muted">
      <span className="tabular-nums">
        {totalElements} đợt giao · Trang {page + 1}/{Math.max(1, totalPages)}
      </span>
      <div className="flex gap-2">
        <button className={deliveryButton} disabled={busy || page === 0} onClick={() => onChange(page - 1)}>
          Trước
        </button>
        <button
          className={deliveryButton}
          disabled={busy || page + 1 >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Sau
        </button>
      </div>
    </div>
  )
}
