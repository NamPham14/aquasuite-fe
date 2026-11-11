import { useState } from 'react'
import { Warehouse, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { ManagementPageHeader, ManagementFilterBar, ManagementSearch, ManagementSelect } from '../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import { ManagementActionButton } from '../../shared/ui/ManagementRowActions'
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

  // SKU đang mở hộp thoại chi tiết / cấu hình ngưỡng.
  const [detailItem, setDetailItem] = useState<InventoryListItem | null>(null)
  const [thresholdItem, setThresholdItem] = useState<InventoryListItem | null>(null)

  const columns: readonly ManagementTableColumn<InventoryListItem>[] = [
    {
      key: 'product', header: 'Sản phẩm / SKU',
      cell: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.productName ?? '—'}</p>
          <p className="text-2xs text-slate-500">{r.sku ?? r.variantId}</p>
        </div>
      ),
    },
    { key: 'onHand', header: 'Tồn thực tế', align: 'right', cell: (r) => `${r.onHandQty} ${r.unit ?? ''}` },
    { key: 'reserved', header: 'Đang giữ', align: 'right', cell: (r) => r.reservedQty },
    { key: 'available', header: 'Khả dụng', align: 'right', cellClassName: 'font-semibold text-slate-900', cell: (r) => r.availableQty },
    { key: 'minimum', header: 'Ngưỡng min', align: 'right', cell: (r) => r.minimumQty },
    { key: 'status', header: 'Trạng thái', align: 'center', cell: (r) => <InventoryStatusBadge status={r.status} /> },
    {
      key: 'actions', header: 'Thao tác', align: 'right',
      cell: (r) => (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ManagementActionButton variant="view" label="Chi tiết" ariaLabel={`Xem chi tiết ${r.sku ?? r.productName}`} onClick={() => setDetailItem(r)} />
          {isOwner && (
            <ManagementActionButton variant="edit" label="Ngưỡng" ariaLabel={`Cấu hình ngưỡng ${r.sku ?? r.productName}`} onClick={() => setThresholdItem(r)} />
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 pb-12">
      <ManagementPageHeader
        title="Quản lý Tồn kho"
        description="Tra cứu tồn kho thời gian thực, theo dõi ngưỡng an toàn và cảnh báo sắp hết hàng"
        group="Kho & Mua hàng"
        breadcrumb="Tồn kho"
        icon={<Warehouse className="h-6 w-6" aria-hidden="true" />}
      />

      {/* Bộ lọc tra cứu */}
      <ManagementFilterBar>
        <ManagementSearch id="inv-keyword" label="Tìm kiếm" value={keyword} onChange={setKeyword} placeholder="Tên sản phẩm hoặc mã SKU…" />
        <ManagementSelect id="inv-status" label="Trạng thái" value={status} onChange={(v) => setStatus(v as InventoryStockStatus | '')}>
          <option value="">Tất cả trạng thái</option>
          <option value="IN_STOCK">Còn hàng</option>
          <option value="LOW_STOCK">Sắp hết</option>
          <option value="OUT_OF_STOCK">Hết hàng</option>
        </ManagementSelect>
        <div className="flex items-end gap-4">
          <label className="inline-flex items-center gap-2 pb-2.5 text-sm text-slate-700">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
            Chỉ hàng tồn thấp
          </label>
          <button type="button" onClick={resetFilters}
            className="mb-0.5 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100">
            <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
          </button>
        </div>
      </ManagementFilterBar>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Hiển thị {rows.length} / {data?.totalElements ?? 0} SKU
      </div>

      {/* Bảng tồn kho */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <h2 id="inventory-table-title" className="sr-only">Danh sách tồn kho</h2>
        <ManagementTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.variantId}
          labelledBy="inventory-table-title"
          emptyMessage={isLoading || isFetching ? 'Đang tải dữ liệu tồn kho…' : 'Không tìm thấy SKU phù hợp.'}
        />
      </div>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-slate-500">Trang {page} / {totalPages}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Trang trước</button>
            <button type="button" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40">Trang sau</button>
          </div>
        </div>
      )}

      {detailItem && <InventoryDetailDialog item={detailItem} onClose={() => setDetailItem(null)} />}
      {thresholdItem && <InventoryThresholdDialog item={thresholdItem} onClose={() => setThresholdItem(null)} />}
    </div>
  )
}
