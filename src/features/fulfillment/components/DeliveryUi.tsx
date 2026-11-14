import type { ReactNode } from 'react'
import { deliveryStatuses, type DeliveryStatus } from '../types/delivery.types'
import { deliveryButton } from './deliveryPresentation'
export function DeliveryBadge({ status }: { status: DeliveryStatus }) {
  const color = status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700' : status === 'RESCHEDULED' ? 'bg-amber-50 text-amber-800' : status === 'FAILED' || status === 'CANCELLED' ? 'bg-rose-50 text-rose-700' : status === 'IN_TRANSIT' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-700'
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-1 text-xs font-semibold ${color}`}>{deliveryStatuses[status] ?? status}</span>
}
export function DeliveryPanel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-lg border border-slate-200 bg-white p-4"><h2 className="mb-3 border-b border-slate-100 pb-3 text-sm font-semibold text-slate-900">{title}</h2>{children}</section>
}
export function DeliveryPagination({ page, totalPages, totalElements, onChange, busy }: { page: number; totalPages: number; totalElements: number; onChange: (p: number) => void; busy: boolean }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-xs text-slate-600"><span>{totalElements} đợt giao · Trang {page + 1}/{Math.max(1, totalPages)}</span><div className="flex gap-2"><button className={deliveryButton} disabled={busy || page === 0} onClick={() => onChange(page - 1)}>Trước</button><button className={deliveryButton} disabled={busy || page + 1 >= totalPages} onClick={() => onChange(page + 1)}>Sau</button></div></div>
}
