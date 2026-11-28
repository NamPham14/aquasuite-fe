import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Truck } from 'lucide-react'
import { useAuth } from '../../iam'
import { normalizeApiError } from '../../../shared/api/apiError'
import { ManagementFilterBar, ManagementPageHeader, ManagementPageShell, ManagementSelect } from '../../../shared/ui/ManagementPage'
import { managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { ManagementTable, ManagementTableSkeleton, type ManagementTableColumn } from '../../../shared/ui/ManagementTable'
import { ErrorState } from '../../../shared/ui/FeedbackStates'
import { useGetDeliveriesQuery } from '../api/deliveryApi'
import { useGetDeliveryShippersQuery } from '../api/shipperApi'
import { canAssignDelivery, deliveryStatuses, type Delivery } from '../types/delivery.types'
import { DeliveryBadge, DeliveryPagination } from './DeliveryUi'
import { deliveryButton, deliveryDate, deliveryMoney, deliveryPrimary } from './deliveryPresentation'
import { AssignmentDialog } from './AssignmentDialog'
import { CreateDeliveryDialog } from './CreateDeliveryDialog'
import { canManageDeliveries } from './deliveryIssueForm'

export function DeliveryList({ mine = false, orderId, issueNotes = false }: { mine?: boolean; orderId?: string; issueNotes?: boolean }) {
  const { user } = useAuth()
  const allowed = mine ? (user?.roles.includes('SHIPPER') ?? false) : canManageDeliveries(user?.roles ?? [])
  const [filters, setFilters] = useState({ status: '', shipperId: '', scheduledFrom: '', scheduledTo: '' })
  const [applied, setApplied] = useState(filters)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [assigning, setAssigning] = useState(false)
  const [creating, setCreating] = useState(false)
  const invalidDates = !!(filters.scheduledFrom && filters.scheduledTo && filters.scheduledFrom > filters.scheduledTo)
  const { currentData: data, isFetching, error, refetch } = useGetDeliveriesQuery({ mine, orderId, page, size: 20,
    ...Object.fromEntries(Object.entries(applied).filter(([, v]) => v)),
  }, { skip: !allowed, refetchOnFocus: true, refetchOnReconnect: true })
  const { data: shippersPage } = useGetDeliveryShippersQuery(
    { keyword: '', page: 0, size: 100 },
    { skip: mine || !allowed },
  )
  const shippers = useMemo(() => shippersPage?.content ?? [], [shippersPage])
  const shipperNameMap = useMemo(
    () => new Map(shippers.map((s) => [s.id, s.username])),
    [shippers],
  )
  if (!allowed) return <p role="alert" className="p-6 text-sm text-aqs-ink-muted">Bạn không có quyền xem danh sách giao hàng này.</p>
  const eligible = (data?.content ?? []).filter(canAssignDelivery)
  const columns: ManagementTableColumn<Delivery>[] = [
    ...(!mine && !orderId && !issueNotes ? [{ key: 'select', header: <input type="checkbox" aria-label="Chọn tất cả phiếu có thể phân công trong trang" disabled={isFetching || !eligible.length} checked={!!eligible.length && eligible.every((r) => selected.includes(r.deliveryId))} onChange={(e) => setSelected(e.target.checked ? eligible.map((r) => r.deliveryId) : [])} />, cell: (r: Delivery) => <input type="checkbox" aria-label={`Chọn ${r.deliveryCode}`} disabled={isFetching || !canAssignDelivery(r)} checked={selected.includes(r.deliveryId)} onChange={(e) => setSelected(e.target.checked ? [...selected, r.deliveryId] : selected.filter((id) => id !== r.deliveryId))} /> }] : []),
    { key: 'code', header: 'Phiếu / Đợt giao', cell: (r) => <><Link className="font-mono font-bold text-aqs-accent hover:text-aqs-accent-hover hover:underline" to={`/app/deliveries/${r.deliveryId}`}>{r.deliveryCode}</Link><p className="mt-1 text-aqs-ink-faint">Đợt {r.batchNo ?? '—'}</p></> },
    { key: 'order', header: 'Đơn hàng', cell: (r) => <Link to={`/app/orders/${r.orderId}`} title={r.orderId} className="inline-block max-w-36 truncate align-middle font-mono text-xs text-aqs-accent hover:underline">{r.orderId}</Link> },
    { key: 'recipient', header: 'Người nhận', cell: (r) => <><strong className="text-aqs-ink">{r.recipientName || '—'}</strong><p className="mt-1 text-aqs-ink-muted">{r.recipientPhone || '—'}</p></> },
    { key: 'address', header: 'Địa chỉ', cellClassName: '!whitespace-normal min-w-48 max-w-72', cell: (r) => r.deliveryAddress || '—' },
    { key: 'date', header: 'Ngày hẹn giao', cell: (r) => deliveryDate(r.scheduledDate) },
    ...(issueNotes ? [{ key: 'confirmed', header: 'Xác nhận xuất kho', cell: (r: Delivery) => r.confirmedAt ? deliveryDate(r.confirmedAt) : 'Chưa xuất kho' }] : []),
    { key: 'status', header: 'Trạng thái', cell: (r) => <DeliveryBadge status={r.deliveryStatus} /> },
    ...(!mine ? [{ key: 'shipper', header: 'Shipper', cell: (r: Delivery) => <span title={r.shipperId ?? undefined} className="inline-block max-w-36 truncate align-middle text-aqs-ink">{r.shipperId ? (shipperNameMap.get(r.shipperId) ?? r.shipperId) : 'Chưa phân công'}</span> }] : []),
    { key: 'cod', header: 'COD', align: 'right', cell: (r) => r.codRequired ? deliveryMoney(r.codAmount) : 'Không thu COD' },
  ]
  const title = issueNotes ? 'Phiếu xuất kho' : orderId ? 'Các đợt giao của đơn' : mine ? 'Đơn giao của tôi' : 'Quản lý giao hàng'
  return <ManagementPageShell>
    {!orderId && <ManagementPageHeader title={title} breadcrumb={title} group="Kho vận & Cung ứng" description={issueNotes ? 'Danh sách phiếu nháp và đã xác nhận xuất kho. Mở chi tiết phiếu đã xuất để tải PDF.' : mine ? 'Nhận hàng và cập nhật kết quả từng đợt giao.' : 'Phân công và theo dõi các phiếu đã xuất kho.'} icon={<Truck className="h-5 w-5" />} />}
    {orderId && !mine && <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-aqs-border bg-aqs-surface p-4"><p className="text-sm text-aqs-ink-muted">Chọn hóa đơn đã phát hành của đơn để tạo đợt giao, sau đó xác nhận xuất kho trong chi tiết phiếu.</p><button className={deliveryPrimary} onClick={() => setCreating(true)}>Tạo đợt giao</button></div>}
    {!orderId && !mine && <p className="text-xs text-aqs-ink-muted">Để tạo đợt giao mới, mở chi tiết đơn hàng → tab Giao hàng → Tạo đợt giao.</p>}
    {!orderId && <form onSubmit={(e) => { e.preventDefault(); if (invalidDates) return; setApplied(filters); setPage(0); setSelected([]) }}><ManagementFilterBar>
      <ManagementSelect id="delivery-status" label="Trạng thái" value={filters.status} onChange={(status) => setFilters({ ...filters, status })}><option value="">Tất cả</option>{Object.entries(deliveryStatuses).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</ManagementSelect>
      {!mine && (
        <ManagementSelect
          id="delivery-shipper"
          label="Nhân viên giao nhận"
          value={filters.shipperId}
          onChange={(shipperId) => setFilters({ ...filters, shipperId })}
          className="min-w-[200px]"
        >
          <option value="">Tất cả shipper</option>
          {shippers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.username} ({s.email})
            </option>
          ))}
        </ManagementSelect>
      )}
      <label className="text-xs font-semibold text-aqs-ink-muted">Hẹn giao từ<input type="date" className={`${managementFieldClass} mt-1.5`} value={filters.scheduledFrom} onChange={(e) => setFilters({ ...filters, scheduledFrom: e.target.value })} /></label>
      <label className="text-xs font-semibold text-aqs-ink-muted">Đến ngày<input type="date" className={`${managementFieldClass} mt-1.5`} value={filters.scheduledTo} min={filters.scheduledFrom} onChange={(e) => setFilters({ ...filters, scheduledTo: e.target.value })} /></label>
      <button className={deliveryButton} disabled={invalidDates}>Áp dụng</button>
      {invalidDates && <p role="alert" className="text-xs text-aqs-danger">Ngày kết thúc phải từ ngày bắt đầu trở đi.</p>}
    </ManagementFilterBar></form>}
    <section className="overflow-hidden rounded-card border border-aqs-border bg-aqs-surface" aria-busy={isFetching}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-aqs-border px-5 py-4"><h2 id="delivery-list-title" className="text-base font-bold text-aqs-ink">{title}</h2>{!mine && !orderId && !issueNotes && <button className={deliveryPrimary} disabled={!selected.length || isFetching || !!error} onClick={() => setAssigning(true)}>Phân công / Đổi shipper ({selected.length})</button>}</div>
      {isFetching ? <ManagementTableSkeleton columns={columns.length} rows={5} label="Đang tải danh sách giao hàng" /> : error ? <ErrorState compact sectionLabel={title} title="Không thể tải danh sách giao hàng" message={normalizeApiError(error).message} retrying={isFetching} onRetry={() => void refetch()} /> : <>
        <div className="hidden sm:block"><ManagementTable columns={columns} rows={data?.content ?? []} rowKey={(r) => r.deliveryId} labelledBy="delivery-list-title" emptyMessage="Không có đợt giao phù hợp." /></div>
        <div className="divide-y divide-aqs-divider sm:hidden">{data?.content.length ? data.content.map((r) => <article key={r.deliveryId} className="space-y-3 p-4 text-sm"><div className="flex flex-wrap items-center justify-between gap-2"><Link className="font-mono font-bold text-aqs-accent hover:underline" to={`/app/deliveries/${r.deliveryId}`}>{r.deliveryCode} · Đợt {r.batchNo ?? '—'}</Link><DeliveryBadge status={r.deliveryStatus} /></div><p className="break-all text-xs text-aqs-ink-faint">Đơn hàng (ID): {r.orderId}</p><p><strong className="text-aqs-ink">{r.recipientName || '—'}</strong> · {r.recipientPhone || '—'}</p><p className="break-words text-aqs-ink-muted">{r.deliveryAddress || 'Chưa có địa chỉ'}</p><div className="flex flex-wrap justify-between gap-2 text-xs text-aqs-ink-muted"><span>Hẹn giao: {deliveryDate(r.scheduledDate)}</span><strong className="text-aqs-ink">{r.codRequired ? `COD: ${deliveryMoney(r.codAmount)}` : 'Không thu COD'}</strong></div>{!mine && !orderId && !issueNotes && <label className="flex min-h-10 items-center gap-2 text-xs"><input type="checkbox" checked={selected.includes(r.deliveryId)} disabled={!canAssignDelivery(r)} onChange={(e) => setSelected(e.target.checked ? [...selected, r.deliveryId] : selected.filter((v) => v !== r.deliveryId))} />Chọn phân công{!canAssignDelivery(r) && ' (đã nhận hàng hoặc kết thúc)'}</label>}</article>) : <p className="p-8 text-center text-sm text-aqs-ink-muted">Không có đợt giao phù hợp.</p>}</div>
      </>}
      {data && !error && <DeliveryPagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} busy={isFetching} onChange={(p) => { setPage(p); setSelected([]) }} />}
    </section>
    {assigning && <AssignmentDialog deliveryIds={selected} onClose={() => setAssigning(false)} onDone={() => { setAssigning(false); setSelected([]) }} />}
    {creating && orderId && <CreateDeliveryDialog key={orderId} orderId={orderId} onClose={() => setCreating(false)} />}
  </ManagementPageShell>
}
