import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { HandCoins } from 'lucide-react'
import { useAuth } from '../../iam'
import { ManagementFilterCard, ManagementPageHeader, ManagementPageShell, ManagementPanel, ManagementSelect, filterControlClass } from '../../../shared/ui/ManagementPage.tsx'
import { ManagementPagination, ManagementTable, ManagementTableSkeleton, type ManagementTableColumn } from '../../../shared/ui/ManagementTable.tsx'
import { Button } from '../../../shared/ui/Button.tsx'
import { CodeChip, Notice, StatusBadge } from '../../../shared/ui/Badge.tsx'
import { ErrorState } from '../../../shared/ui/FeedbackStates.tsx'
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
    { key: 'delivery', header: 'Đợt giao', cell: (x) => <CodeChip>{x.deliveryId}</CodeChip> },
    { key: 'shipper', header: 'ID shipper', cell: (x) => <p className="w-44 whitespace-normal break-words font-mono text-xs leading-5 text-aqs-ink-muted [overflow-wrap:anywhere]">{x.shipperId}</p> },
    { key: 'amount', header: 'Số tiền khai thu', align: 'right', cellClassName: 'font-bold tabular-nums text-sm text-aqs-ink', cell: (x) => formatVnd(x.amount) },
    {
      key: 'status',
      header: 'Trạng thái bàn giao',
      align: 'center',
      cell: (x) => (
        <StatusBadge tone={x.status === 'VERIFIED' ? 'positive' : x.status === 'REJECTED' ? 'danger' : 'warning'}>
          {codStatusLabel(x.status)}
        </StatusBadge>
      ),
    },
    { key: 'detail', header: 'Thao tác', align: 'center', cell: (x) => <Button variant="secondary" size="sm" onClick={() => setDetailId(x.collectionId)}>{accountant && canReceiveCod(x, user!.id) ? 'Nhận tiền' : 'Xem chi tiết'}</Button> },
  ]
  if (!allowed) return <p role="alert" className="p-6 text-sm text-aqs-ink-muted">Bạn không có quyền xem thu và bàn giao COD.</p>
  return <ManagementPageShell>
    <ManagementPageHeader
      group="Tài chính & Công nợ"
      title="Thu & bàn giao COD"
      description="Theo dõi tiền mặt khách đã giao shipper và số cửa hàng thực nhận."
      breadcrumb="Thu & bàn giao COD"
      icon={<HandCoins className="h-5 w-5" />}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {roles.includes('SHIPPER') && (
            <Button variant="primary" onClick={() => setClaiming(true)}>Khai thu COD</Button>
          )}
          <Button variant="secondary" disabled={list.isFetching} onClick={() => { void list.refetch() }}>
            Tải lại
          </Button>
        </div>
      }
    />
    <Notice tone="warning">
      Shipper khai tiền đã thu; kế toán/chủ cửa hàng chỉ xác nhận sau khi nhận đủ tiền thực tế của khoản khai. Xác nhận sẽ ghi nhận tiền về cửa hàng, không có bước bàn giao lần hai.
    </Notice>
    <ManagementFilterCard
      headingId="cod-filters"
      title="Tìm và lọc khoản thu COD"
      resultCount={list.currentData ? `${list.currentData.totalElements} khoản thu` : undefined}
    >
      <form onSubmit={(e) => { e.preventDefault(); if ((orderId.trim() && !isUuid(orderId.trim())) || (shipperId.trim() && !isUuid(shipperId.trim()))) { setFilterError('ID đơn hàng và shipper phải là UUID hợp lệ.'); return }; setFilterError(''); setFilters({ orderId: orderId.trim() || undefined, shipperId: shipperId.trim() || undefined }); setPage(0) }}>
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ManagementSelect id="cod-status" label="Trạng thái bàn giao" value={status} onChange={(value) => { setStatus(value); setPage(0) }}><option value="">Tất cả</option><option value="PENDING">Chờ bàn giao tiền</option><option value="VERIFIED">Đã nhận tiền</option><option value="REJECTED">Đã từ chối</option></ManagementSelect>
          <div className="min-w-0">
            <label htmlFor="cod-order-filter" className="mb-1.5 block text-xs font-semibold leading-none text-aqs-ink-muted">ID đơn hàng</label>
            <input id="cod-order-filter" value={orderId} onChange={(e) => setOrderId(e.target.value)} className={filterControlClass} placeholder="Nhập UUID đơn hàng..." />
          </div>
          {canSeeBalance && (
            <div className="min-w-0">
              <label htmlFor="cod-shipper-filter" className="mb-1.5 block text-xs font-semibold leading-none text-aqs-ink-muted">ID shipper</label>
              <input id="cod-shipper-filter" value={shipperId} onChange={(e) => setShipperId(e.target.value)} className={filterControlClass} placeholder="Nhập UUID shipper..." />
            </div>
          )}
          <div>
            <button className={codButton} type="submit">Áp dụng bộ lọc</button>
          </div>
        </div>
        {filterError && <p role="alert" className="mt-2 text-xs font-medium text-aqs-danger">{filterError}</p>}
      </form>
    </ManagementFilterCard>
    <ManagementPanel
      headingId="cod-list"
      title={`Các khoản thu COD ${list.currentData ? `(${list.currentData.totalElements})` : ''}`}
      refreshing={list.isFetching && rows.length > 0}
      busy={list.isFetching}
    >
      {list.isError ? (
        <div className="p-5">
          <ErrorState
            sectionLabel="Các khoản thu COD"
            title="Không thể tải danh sách COD"
            message={normalizeApiError(list.error).message}
            onRetry={() => void list.refetch()}
            retrying={list.isFetching}
          />
        </div>
      ) : list.isFetching && !rows.length ? (
        <ManagementTableSkeleton columns={5} rows={5} />
      ) : (
        <ManagementTable columns={columns} rows={rows} rowKey={(x) => x.collectionId} labelledBy="cod-list" emptyMessage="Không có khoản thu phù hợp." />
      )}
      <ManagementPagination
        page={page}
        totalPages={list.currentData?.totalPages ?? 0}
        totalElements={list.currentData?.totalElements ?? 0}
        noun="khoản thu"
        disabled={list.isFetching}
        onPageChange={setPage}
      />
    </ManagementPanel>
    {claiming && <CodClaimDialog onClose={() => setClaiming(false)} />}
    {detailId && <CodCollectionDetailDialog key={detailId} id={detailId} actorId={user!.id} accountant={accountant} canSeeBalance={canSeeBalance} onClose={() => { setDetailId(null) }} />}
  </ManagementPageShell>
}
