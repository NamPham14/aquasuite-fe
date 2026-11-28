import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ExternalLink, Plus, RotateCcw, Truck, Warehouse } from 'lucide-react'
import {
  ManagementFilterCard,
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
  ManagementSearch,
  ManagementSelect,
  ManagementStatCard,
} from '../../shared/ui/ManagementPage'
import {
  ManagementTable,
  ManagementTableSkeleton,
  type ManagementTableColumn,
} from '../../shared/ui/ManagementTable'
import { ManagementActionButton } from '../../shared/ui/ManagementRowActions'
import { Button } from '../../shared/ui/Button'
import { CodeChip, Notice } from '../../shared/ui/Badge'
import { useAuth } from '../../features/iam/hooks/useAuth'
import { useInventoryFilters } from '../../features/inventory/hooks/useInventoryFilters'
import { useSearchInventoryQuery } from '../../features/inventory/api/inventoryApi'
import {
  useGetInventoryInboundKpiQuery,
  useGetInventoryInboundSummariesQuery,
} from '../../features/inventory/api/inboundTrackingApi'
import { InventoryStatusBadge } from '../../features/inventory/components/InventoryStatusBadge'
import { InventoryThresholdDialog } from '../../features/inventory/components/InventoryThresholdDialog'
import {
  InventoryDetailDialog,
  type InventoryDetailTab,
} from '../../features/inventory/components/InventoryDetailDialog'
import { GoodsReceiptDialog } from '../../features/inventory/components/GoodsReceiptDialog'
import type { InventoryListItem, InventoryStockStatus } from '../../features/inventory/types/inventory.types'

type QuickKpiMode = 'ALL' | 'NEED_ORDER' | 'INCOMING' | 'RESERVED'

function formatExpectedShort(dateStr?: string | null): string {
  if (!dateStr) return 'Chờ giao'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return `Hẹn ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
}

/**
 * Trang Tra cứu & Quản lý Tồn kho (UC-17.1, UC-17.2 + điều phối Đơn mua PO & Nhập kho UC-16.1).
 * Giữ nguyên toàn bộ bộ lọc, cột và nhãn chuẩn UC-17.1; bổ sung 4 thẻ KPI lọc nhanh,
 * cột "Đang về (PO)", gợi ý hành động và mở nhanh hộp thoại Nhập kho ngay tại chỗ.
 */
export function InventoryPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const upperRoles = (user?.roles ?? []).map((r) => r.toUpperCase())
  const isOwner = upperRoles.some((r) => r === 'SHOP_OWNER' || r === 'ROLE_SHOP_OWNER')
  const canReceiveStock =
    isOwner || upperRoles.some((r) => r === 'ACCOUNTANT' || r === 'ROLE_ACCOUNTANT')

  const {
    keyword,
    setKeyword,
    status,
    setStatus,
    lowStockOnly,
    setLowStockOnly,
    page,
    setPage,
    resetFilters,
    queryParams,
  } = useInventoryFilters({ page: 1, size: 10 })

  const [quickMode, setQuickMode] = useState<QuickKpiMode>('ALL')

  const { data, isLoading, isFetching, refetch: refetchInventory } = useSearchInventoryQuery(queryParams)
  const rawRows = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const totalElements = data?.totalElements ?? 0

  const variantIds = useMemo(() => rawRows.map((r) => r.variantId), [rawRows])
  const {
    data: kpi,
    isLoading: isKpiLoading,
    isError: isKpiError,
    refetch: refetchKpi,
  } = useGetInventoryInboundKpiQuery()

  const { data: summariesMap, refetch: refetchSummaries } = useGetInventoryInboundSummariesQuery(
    variantIds,
    { skip: variantIds.length === 0 },
  )

  const rows = useMemo(() => {
    if (quickMode === 'ALL') return rawRows
    return rawRows.filter((r) => {
      const summary = summariesMap?.[r.variantId]
      if (quickMode === 'NEED_ORDER') {
        if (!summary) return r.lowStock || r.availableQty <= 0
        return (
          summary.restockActionHint === 'NEED_ORDER' ||
          summary.restockActionHint === 'INCOMING_PARTIAL'
        )
      }
      if (quickMode === 'INCOMING') {
        return (summary?.incomingQty ?? 0) > 0
      }
      if (quickMode === 'RESERVED') {
        return r.reservedQty > 0
      }
      return true
    })
  }, [rawRows, quickMode, summariesMap])

  const hasFilters = Boolean(keyword.trim() || status || lowStockOnly || quickMode !== 'ALL')

  // Trạng thái hộp thoại Chi tiết, Ngưỡng và Nhập kho nhanh (không mở chồng 2 dialog cùng lúc).
  const [detailState, setDetailState] = useState<{
    item: InventoryListItem
    tab: InventoryDetailTab
  } | null>(null)
  const [thresholdItem, setThresholdItem] = useState<InventoryListItem | null>(null)
  const [receivingPo, setReceivingPo] = useState<{
    purchaseOrderId: string
    poCode: string
  } | null>(null)

  const handleSelectKpi = (mode: QuickKpiMode) => {
    setQuickMode(mode)
    if (mode === 'NEED_ORDER') {
      setLowStockOnly(true)
    } else if (lowStockOnly) {
      setLowStockOnly(false)
    }
  }

  const handleResetAll = () => {
    setQuickMode('ALL')
    resetFilters()
  }

  const columns: readonly ManagementTableColumn<InventoryListItem>[] = [
    {
      key: 'product',
      header: 'Sản phẩm / SKU',
      cell: (r) => (
        <div>
          <p className="font-semibold text-aqs-ink">{r.productName ?? '—'}</p>
          <div className="mt-1">
            <CodeChip>{r.sku ?? r.variantId}</CodeChip>
          </div>
        </div>
      ),
    },
    {
      key: 'onHand',
      header: 'Tồn thực tế',
      align: 'right',
      cellClassName: 'tabular-nums',
      cell: (r) => `${r.onHandQty} ${r.unit ?? ''}`,
    },
    {
      key: 'reserved',
      header: 'Đang giữ',
      align: 'right',
      cellClassName: 'tabular-nums',
      cell: (r) => r.reservedQty,
    },
    {
      key: 'available',
      header: 'Khả dụng',
      align: 'right',
      cellClassName: 'font-bold tabular-nums text-aqs-ink',
      cell: (r) => r.availableQty,
    },
    {
      key: 'incoming',
      header: 'Đang về (PO)',
      align: 'right',
      cellClassName: 'tabular-nums',
      cell: (r) => {
        const s = summariesMap?.[r.variantId]
        if (s && s.incomingQty > 0) {
          return (
            <button
              type="button"
              onClick={() => setDetailState({ item: r, tab: 'po' })}
              className="inline-flex cursor-pointer flex-col items-end rounded-control border border-dashed border-aqs-accent-border bg-aqs-accent-soft/70 px-2.5 py-1 text-right transition-colors hover:bg-aqs-accent-soft"
              title="Bấm để xem tiến độ đơn mua hàng đang về"
            >
              <span className="inline-flex items-center gap-1 text-xs font-bold text-aqs-accent-hover">
                +{s.incomingQty} {r.unit ?? ''}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </span>
              <span
                className={`text-[11px] font-medium ${
                  s.hasOverduePo ? 'text-aqs-danger' : 'text-aqs-ink-muted'
                }`}
              >
                {s.openPoCount} PO · {s.hasOverduePo ? 'Trễ hẹn' : formatExpectedShort(s.nearestExpectedDate)}
              </span>
            </button>
          )
        }
        if (s?.restockActionHint === 'NEED_ORDER') {
          return (
            <div className="text-right">
              <span className="block text-xs font-semibold text-aqs-danger">Chưa đặt PO</span>
              {s.suggestedOrderQty > 0 && (
                <span className="block text-[11px] text-aqs-ink-faint">
                  Thiếu {s.suggestedOrderQty} {r.unit ?? ''}
                </span>
              )}
            </div>
          )
        }
        return <span className="text-aqs-ink-faint">—</span>
      },
    },
    {
      key: 'minimum',
      header: 'Ngưỡng min',
      align: 'right',
      cellClassName: 'tabular-nums text-aqs-ink-muted',
      cell: (r) => r.minimumQty,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      cell: (r) => {
        const s = summariesMap?.[r.variantId]
        return (
          <div className="inline-flex flex-col items-center gap-1">
            <InventoryStatusBadge status={r.status} />
            {r.status !== 'IN_STOCK' && s?.restockActionHint === 'INCOMING_COVERED' && (
              <span className="text-[11px] font-semibold text-aqs-accent-hover">
                Đang về +{s.incomingQty}
              </span>
            )}
            {r.status !== 'IN_STOCK' && s?.restockActionHint === 'INCOMING_PARTIAL' && (
              <span className="text-[11px] font-semibold text-aqs-warning">
                Về +{s.incomingQty} · Vẫn thiếu
              </span>
            )}
            {r.status !== 'IN_STOCK' && s?.restockActionHint === 'NEED_ORDER' && (
              <span className="text-[11px] font-semibold text-aqs-danger">Cần đặt hàng</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      cell: (r) => {
        const s = summariesMap?.[r.variantId]
        return (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {s && s.openPoCount > 0 ? (
              <Button
                variant="secondary"
                size="sm"
                icon={<Truck />}
                onClick={() => setDetailState({ item: r, tab: 'po' })}
              >
                Theo dõi PO
              </Button>
            ) : s?.restockActionHint === 'NEED_ORDER' ? (
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus />}
                onClick={() => navigate('/app/purchase-orders/new')}
              >
                Đặt mua
              </Button>
            ) : null}
            <ManagementActionButton
              variant="view"
              label="Chi tiết"
              ariaLabel={`Xem chi tiết ${r.sku ?? r.productName}`}
              onClick={() => setDetailState({ item: r, tab: 'history' })}
            />
            {isOwner && (
              <ManagementActionButton
                variant="edit"
                label="Ngưỡng"
                ariaLabel={`Cấu hình ngưỡng ${r.sku ?? r.productName}`}
                onClick={() => setThresholdItem(r)}
              />
            )}
          </div>
        )
      },
    },
  ]

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title="Quản lý Tồn kho"
        description="Tra cứu tồn kho thời gian thực, theo dõi ngưỡng an toàn, tiến độ đơn nhập hàng và cảnh báo sắp hết hàng."
        group="Kho & Mua hàng"
        breadcrumb="Tồn kho"
        icon={<Warehouse className="h-5 w-5" aria-hidden="true" />}
        actions={
          <Button
            variant="secondary"
            icon={<Truck />}
            onClick={() => navigate('/app/purchase-orders')}
          >
            Đơn mua hàng (PO)
          </Button>
        }
      />

      {isKpiError && (
        <Notice tone="info" title="Đang chờ làm mới dịch vụ theo dõi đơn nhập trên Backend">
          Hãy khởi động lại <code>aquasuite-be</code> (cổng 8080) để hiển thị số liệu <strong>Đang về (PO)</strong> và{' '}
          <strong>4 thẻ KPI điều phối</strong>. Các chức năng tra cứu tồn kho hiện tại vẫn hoạt động bình thường.
        </Notice>
      )}

      {/* 4 Thẻ KPI lọc nhanh cho Chủ cửa hàng & Kế toán */}
      {!isKpiError && (
        <section
          aria-label="Tổng quan điều phối tồn kho và nhập hàng"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <ManagementStatCard
            label="Tất cả SKU theo dõi"
            value={kpi?.totalSkus ?? totalElements}
            loading={isKpiLoading}
            tone="accent"
            active={quickMode === 'ALL' && !lowStockOnly}
            onClick={() => handleSelectKpi('ALL')}
          />
          <ManagementStatCard
            label="Sắp hết · Cần đặt mua"
            value={kpi?.needOrderCount ?? 0}
            loading={isKpiLoading}
            tone="danger"
            active={quickMode === 'NEED_ORDER'}
            onClick={() => handleSelectKpi('NEED_ORDER')}
          />
          <ManagementStatCard
            label={
              kpi && kpi.overduePoCount > 0
                ? `Đang chờ hàng về (${kpi.overduePoCount} PO trễ)`
                : kpi && kpi.openPoCount > 0
                  ? `Đang chờ hàng về (${kpi.openPoCount} PO)`
                  : 'Đang chờ hàng về'
            }
            value={kpi?.incomingSkuCount ?? 0}
            loading={isKpiLoading}
            tone="positive"
            active={quickMode === 'INCOMING'}
            onClick={() => handleSelectKpi('INCOMING')}
          />
          <ManagementStatCard
            label={
              kpi && kpi.totalReservedQty > 0
                ? `Đang giữ cho khách (${kpi.totalReservedQty} SP)`
                : 'Đang giữ cho khách'
            }
            value={kpi?.reservedSkuCount ?? 0}
            loading={isKpiLoading}
            tone="warning"
            active={quickMode === 'RESERVED'}
            onClick={() => handleSelectKpi('RESERVED')}
          />
        </section>
      )}

      {/* Bộ lọc tra cứu (Giữ nguyên 100% nhãn & cấu trúc UC-17.1) */}
      <ManagementFilterCard
        headingId="inventory-filters"
        title="Tìm và lọc tồn kho"
        description="Lọc theo tên sản phẩm, mã SKU, trạng thái hoặc ngưỡng tồn an toàn."
        resultCount={`Hiển thị ${rows.length} / ${totalElements} SKU`}
        hasActiveFilters={hasFilters}
        onReset={handleResetAll}
      >
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto]">
          <ManagementSearch
            id="inv-keyword"
            label="Tìm kiếm"
            value={keyword}
            onChange={setKeyword}
            placeholder="Tên sản phẩm hoặc mã SKU…"
          />
          <ManagementSelect
            id="inv-status"
            label="Trạng thái"
            value={status}
            onChange={(v) => setStatus(v as InventoryStockStatus | '')}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="IN_STOCK">Còn hàng</option>
            <option value="LOW_STOCK">Sắp hết</option>
            <option value="OUT_OF_STOCK">Hết hàng</option>
          </ManagementSelect>
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-control border border-aqs-border bg-aqs-surface-subtle/60 px-3 text-sm font-medium text-aqs-ink">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-aqs-border-strong accent-aqs-accent"
            />
            Chỉ hàng tồn thấp
          </label>
          <Button variant="secondary" onClick={handleResetAll}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Đặt lại
          </Button>
        </div>
      </ManagementFilterCard>

      {/* Bảng tồn kho */}
      <ManagementPanel
        headingId="inventory-table-title"
        title="Danh sách tồn kho"
        description={`Tổng số ${totalElements} SKU đang theo dõi tại kho chính.`}
        refreshing={isFetching && rows.length > 0}
        busy={isFetching}
      >
        {isLoading && !rows.length ? (
          <ManagementTableSkeleton columns={8} rows={5} />
        ) : (
          <ManagementTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.variantId}
            labelledBy="inventory-table-title"
            emptyMessage={
              isFetching ? 'Đang tải dữ liệu tồn kho…' : 'Không tìm thấy SKU phù hợp.'
            }
          />
        )}

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-aqs-border bg-aqs-surface-subtle/60 px-5 py-3 text-xs text-aqs-ink-muted">
            <p className="tabular-nums">
              Trang <strong className="text-aqs-ink">{page}</strong> / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
              >
                Trang trước
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
              >
                Trang sau
              </Button>
            </div>
          </div>
        )}
      </ManagementPanel>

      {detailState && (
        <InventoryDetailDialog
          item={detailState.item}
          initialTab={detailState.tab}
          canReceiveStock={canReceiveStock}
          onClose={() => setDetailState(null)}
          onOpenReceivePo={(po) => setReceivingPo(po)}
        />
      )}

      {thresholdItem && (
        <InventoryThresholdDialog
          item={thresholdItem}
          onClose={() => setThresholdItem(null)}
        />
      )}

      {receivingPo && (
        <GoodsReceiptDialog
          isOpen
          purchaseOrderId={receivingPo.purchaseOrderId}
          poCode={receivingPo.poCode}
          onClose={() => setReceivingPo(null)}
          onSuccess={() => {
            refetchInventory()
            refetchKpi()
            if (variantIds.length > 0) refetchSummaries()
          }}
        />
      )}
    </ManagementPageShell>
  )
}
