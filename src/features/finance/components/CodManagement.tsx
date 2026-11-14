import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HandCoins } from 'lucide-react'
import { useAuth } from '../../iam'
import { ManagementFilterBar, ManagementPageHeader, ManagementSelect } from '../../../shared/ui/ManagementPage.tsx'
import { ManagementTable, type ManagementTableColumn } from '../../../shared/ui/ManagementTable.tsx'
import { managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { formatVnd } from '../../../shared/lib/money.ts'
import { useGetCodCollectionsQuery } from '../api/codApi.ts'
import { canReceiveCod, codButton, codStatusLabel, isUuid } from '../lib/cod.ts'
import type { CodCollection } from '../types/cod.types.ts'
import { CodClaimDialog } from './CodClaimDialog.tsx'
import { CodCollectionDetailDialog } from './CodCollectionDetailDialog.tsx'


export function CodManagement() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const roles = user?.roles ?? []
  const allowed = roles.some((x) => ['SHIPPER', 'ACCOUNTANT', 'SALES_STAFF', 'SHOP_OWNER'].includes(x))
  const accountant = roles.includes('ACCOUNTANT') || roles.includes('SHOP_OWNER')
  const canSeeBalance = roles.some((x) => ['ACCOUNTANT', 'SALES_STAFF', 'SHOP_OWNER'].includes(x))
  const [status, setStatus] = useState('')
  const [orderId, setOrderId] = useState(params.get('orderId') ?? '')
  const [shipperId, setShipperId] = useState('')
  const [filters, setFilters] = useState({ orderId: isUuid(orderId) ? orderId : undefined, shipperId: undefined as string | undefined })
  const [filterError, setFilterError] = useState('')
  const [page, setPage] = useState(0)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [claiming, setClaiming] = useState(false)
  const list = useGetCodCollectionsQuery({ ...filters, status: status || undefined, page, size: 20 }, { skip: !allowed, refetchOnMountOrArgChange: true })
  const rows = list.currentData?.items ?? []
  const columns: ManagementTableColumn<CodCollection>[] = [
    { key: 'delivery', header: 'Đợt giao', cell: (x) => <p className="w-40 whitespace-normal break-words font-mono text-xs font-bold text-sky-700 [overflow-wrap:anywhere]">{x.deliveryId}</p> },
    { key: 'shipper', header: 'ID shipper', cell: (x) => <p className="w-44 whitespace-normal break-words text-[11px] leading-5 text-slate-500 [overflow-wrap:anywhere]">{x.shipperId}</p> },
    { key: 'amount', header: 'Số tiền khai thu', align: 'right', cellClassName: 'font-bold tabular-nums text-sm text-slate-900', cell: (x) => formatVnd(x.amount) },
    { key: 'status', header: 'Trạng thái bàn giao', cell: (x) => <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-700">{codStatusLabel(x.status)}</span> },
    { key: 'detail', header: 'Thao tác', cell: (x) => <button className={codButton} onClick={() => setDetailId(x.collectionId)}>{accountant && canReceiveCod(x, user!.id) ? 'Nhận tiền' : 'Xem chi tiết'}</button> },
  ]
  if (!allowed) return <p role="alert" className="p-6 text-sm text-slate-600">Bạn không có quyền xem thu và bàn giao COD.</p>
  return <div className="space-y-5 text-sm leading-relaxed text-slate-900">
    <ManagementPageHeader title="Thu & bàn giao COD" description="Theo dõi tiền mặt khách đã giao shipper và số cửa hàng thực nhận." breadcrumb="Thu & bàn giao COD" icon={<HandCoins />} />
    <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Shipper khai tiền đã thu; kế toán/chủ cửa hàng chỉ xác nhận sau khi nhận đủ tiền thực tế của khoản khai. Xác nhận sẽ ghi nhận tiền về cửa hàng, không có bước bàn giao lần hai.</p>
    <div className="flex flex-wrap gap-2">{roles.includes('SHIPPER') && <button className={codButton} onClick={() => setClaiming(true)}>Khai thu COD</button>}<button className={codButton} disabled={list.isFetching} onClick={() => { void list.refetch() }}>Tải lại</button></div>
    <form onSubmit={(e) => { e.preventDefault(); if ((orderId.trim() && !isUuid(orderId.trim())) || (shipperId.trim() && !isUuid(shipperId.trim()))) { setFilterError('ID đơn hàng và shipper phải là UUID hợp lệ.'); return }; setFilterError(''); setFilters({ orderId: orderId.trim() || undefined, shipperId: shipperId.trim() || undefined }); setPage(0) }}>
      <ManagementFilterBar>
        <ManagementSelect id="cod-status" label="Trạng thái bàn giao" value={status} onChange={(value) => { setStatus(value); setPage(0) }}><option value="">Tất cả</option><option value="PENDING">Chờ bàn giao tiền</option><option value="VERIFIED">Đã nhận tiền</option><option value="REJECTED">Đã từ chối</option></ManagementSelect>
        <label htmlFor="cod-order-filter" className="text-sm font-medium text-slate-700">ID đơn hàng<input id="cod-order-filter" value={orderId} onChange={(e) => setOrderId(e.target.value)} className={managementFieldClass} /></label>
        {canSeeBalance && <label htmlFor="cod-shipper-filter" className="text-sm font-medium text-slate-700">ID shipper<input id="cod-shipper-filter" value={shipperId} onChange={(e) => setShipperId(e.target.value)} className={managementFieldClass} /></label>}
        <button className={codButton} type="submit">Áp dụng bộ lọc</button>
      </ManagementFilterBar>
      {filterError && <p role="alert" className="mt-2 text-sm text-rose-700">{filterError}</p>}
    </form>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-busy={list.isFetching}>
      <h2 id="cod-list" className="p-4 text-base font-semibold">Các khoản thu COD {list.currentData ? `(${list.currentData.totalElements})` : ''}</h2>
      {list.isError ? <p role="alert" className="p-4 text-sm text-rose-700">{normalizeApiError(list.error).message} <button className={codButton} onClick={() => void list.refetch()}>Thử lại</button></p> : <div className="[&_thead]:bg-slate-50 [&_thead]:font-semibold [&_thead]:text-slate-600 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:whitespace-normal [&_th]:leading-5 [&_td]:py-3 [&_tbody]:text-slate-700"><ManagementTable columns={columns} rows={rows} rowKey={(x) => x.collectionId} labelledBy="cod-list" emptyMessage={list.isFetching ? 'Đang tải...' : 'Không có khoản thu phù hợp.'} /></div>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-3 text-sm"><button className={codButton} disabled={page === 0 || list.isFetching} onClick={() => { setPage(page - 1) }}>Trước</button><span role="status">{list.isFetching ? 'Đang cập nhật...' : `Trang ${page + 1} / ${Math.max(1, list.currentData?.totalPages ?? 0)}`}</span><button className={codButton} disabled={list.isFetching || page + 1 >= (list.currentData?.totalPages ?? 0)} onClick={() => { setPage(page + 1) }}>Sau</button></div>
    </section>
    {claiming && <CodClaimDialog onClose={() => setClaiming(false)} />}
    {detailId && <CodCollectionDetailDialog key={detailId} id={detailId} actorId={user!.id} accountant={accountant} canSeeBalance={canSeeBalance} onClose={() => { setDetailId(null) }} />}
  </div>
}
