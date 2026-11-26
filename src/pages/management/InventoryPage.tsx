import { useState } from 'react'
import { Warehouse, RotateCcw } from 'lucide-react'
import {
  ManagementFilterCard,
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
  ManagementSearch,
  ManagementSelect,
} from '../../shared/ui/ManagementPage'
import {
  ManagementTable,
  ManagementTableSkeleton,
  type ManagementTableColumn,
} from '../../shared/ui/ManagementTable'
import { ManagementActionButton } from '../../shared/ui/ManagementRowActions'
import { Button } from '../../shared/ui/Button'
import { CodeChip } from '../../shared/ui/Badge'
import { useAuth } from '../../features/iam/hooks/useAuth'
import { useInventoryFilters } from '../../features/inventory/hooks/useInventoryFilters'
import { useSearchInventoryQuery } from '../../features/inventory/api/inventoryApi'
import { InventoryStatusBadge } from '../../features/inventory/components/InventoryStatusBadge'
import { InventoryThresholdDialog } from '../../features/inventory/components/InventoryThresholdDialog'
import { InventoryDetailDialog } from '../../features/inventory/components/InventoryDetailDialog'
import type { InventoryListItem, InventoryStockStatus } from '../../features/inventory/types/inventory.types'

/**
 * Trang Tra cứu & Quản lý Tồn kho (UC-31).
 * Gom các luồng nghiệp vụ: A) danh sách/tìm kiếm, B) xem chi tiết + thẻ kho, C) lọc hàng tồn thấp,
 * D) cấu hình ngưỡng tồn an toàn (chỉ Chủ cửa hàng). Tái dùng toàn bộ bộ UI quản lý dùng chung.
 */
export function InventoryPage() {
  const { user } = useAuth()
  // Chỉ Chủ cửa hàng được cấu hình ngưỡng (khớp @PreAuthorize hasRole('SHOP_OWNER') ở backend).
  const isOwner = user?.roles.some((role) => ['SHOP_OWNER', 'ROLE_SHOP_OWNER'].includes(role.toUpperCase())) ?? false

  const { keyword, setKeyword, status, setStatus, lowStockOnly, setLowStockOnly, page, setPage, resetFilters, queryParams } =
    useInventoryFilters({ page: 1, size: 10 })

  const { data, isLoading, isFetching } = useSearchInventoryQuery(queryParams)
  const rows = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const totalElements = data?.totalElements ?? 0
  const hasFilters = Boolean(keyword.trim() || status || lowStockOnly)

  // SKU đang mở hộp thoại chi tiết / cấu hình ngưỡng.
  const [detailItem, setDetailItem] = useState<InventoryListItem | null>(null)
  const [thresholdItem, setThresholdItem] = useState<InventoryListItem | null>(null)

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
    { key: 'onHand', header: 'Tồn thực tế', align: 'right', cellClassName: 'tabular-nums', cell: (r) => `${r.onHandQty} ${r.unit ?? ''}` },
    { key: 'reserved', header: 'Đang giữ', align: 'right', cellClassName: 'tabular-nums', cell: (r) => r.reservedQty },
    { key: 'available', header: 'Khả dụng', align: 'right', cellClassName: 'font-bold tabular-nums text-aqs-ink', cell: (r) => r.availableQty },
    { key: 'minimum', header: 'Ngưỡng min', align: 'right', cellClassName: 'tabular-nums text-aqs-ink-muted', cell: (r) => r.minimumQty },
    { key: 'status', header: 'Trạng thái', align: 'center', cell: (r) => <InventoryStatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      cell: (r) => (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ManagementActionButton variant="view" label="Chi tiết" ariaLabel={`Xem chi tiết ${r.sku ?? r.productName}`} onClick={() => setDetailItem(r)} />
          {isOwner && (
            <ManagementActionButton variant="edit" label="Ngưỡng" ariaLabel={`Cấu hình ngưỡng ${r.sku ?? r.productName}`} onClick={() => setThresholdItem(r)} />
          )}
        </div>
      ),
    },
  ]

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title="Quản lý Tồn kho"
        description="Tra cứu tồn kho thời gian thực, theo dõi ngưỡng an toàn và cảnh báo sắp hết hàng."
        group="Kho & Mua hàng"
        breadcrumb="Tồn kho"
        icon={<Warehouse className="h-5 w-5" aria-hidden="true" />}
      />

      {/* Bộ lọc tra cứu */}
      <ManagementFilterCard
        headingId="inventory-filters"
        title="Tìm và lọc tồn kho"
        description="Lọc theo tên sản phẩm, mã SKU, trạng thái hoặc ngưỡng tồn an toàn."
        resultCount={`Hiển thị ${rows.length} / ${totalElements} SKU`}
        hasActiveFilters={hasFilters}
        onReset={resetFilters}
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
          <Button variant="secondary" onClick={resetFilters}>
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
          <ManagementTableSkeleton columns={7} rows={5} />
        ) : (
          <ManagementTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.variantId}
            labelledBy="inventory-table-title"
            emptyMessage={isFetching ? 'Đang tải dữ liệu tồn kho…' : 'Không tìm thấy SKU phù hợp.'}
          />
        )}

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-aqs-border bg-aqs-surface-subtle/60 px-5 py-3 text-xs text-aqs-ink-muted">
            <p className="tabular-nums">
              Trang <strong className="text-aqs-ink">{page}</strong> / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
                Trang trước
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>
                Trang sau
              </Button>
            </div>
          </div>
        )}
      </ManagementPanel>

      {detailItem && <InventoryDetailDialog item={detailItem} onClose={() => setDetailItem(null)} />}
      {thresholdItem && <InventoryThresholdDialog item={thresholdItem} onClose={() => setThresholdItem(null)} />}
    </ManagementPageShell>
  )
}
