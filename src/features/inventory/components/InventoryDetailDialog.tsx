import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import { ManagementTable, type ManagementTableColumn } from '../../../shared/ui/ManagementTable'
import { useGetStockMovementsQuery } from '../api/inventoryApi'
import type { InventoryListItem, StockMovement } from '../types/inventory.types'

/** Nhãn tiếng Việt cho các loại biến động thẻ kho (khớp enum MovementType ở BE). */
const MOVEMENT_LABEL: Record<string, string> = {
  INITIAL_IMPORT: 'Nhập đầu kỳ',
  GOODS_RECEIPT: 'Nhập mua hàng',
  STOCK_DISPATCH: 'Xuất kho',
  RETURN_IN: 'Nhập trả hàng',
  SUPPLIER_RETURN: 'Trả nhà cung cấp',
  ADJUSTMENT_IN: 'Điều chỉnh tăng',
  ADJUSTMENT_OUT: 'Điều chỉnh giảm',
}

const movementColumns: readonly ManagementTableColumn<StockMovement>[] = [
  { key: 'createdAt', header: 'Thời gian', cell: (m) => new Date(m.createdAt).toLocaleString('vi-VN') },
  { key: 'type', header: 'Loại', cell: (m) => MOVEMENT_LABEL[m.movementType] ?? m.movementType },
  { key: 'quantity', header: 'Số lượng', align: 'right',
    cell: (m) => <span className={m.quantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}>{m.quantity >= 0 ? `+${m.quantity}` : m.quantity}</span> },
  { key: 'balanceAfter', header: 'Tồn sau', align: 'right', cell: (m) => m.balanceAfter },
  { key: 'reference', header: 'Chứng từ', cell: (m) => m.referenceType },
  { key: 'note', header: 'Ghi chú', cell: (m) => m.note ?? '—' },
]

/**
 * Hộp thoại xem chi tiết tồn kho một SKU (UC-31, luồng B).
 * Hiển thị số liệu tồn (thực tế / đang giữ / khả dụng / ngưỡng) và danh sách biến động thẻ kho gần nhất.
 * Chỉ đọc — mọi thay đổi tồn đến từ nghiệp vụ khác (nhập/xuất/điều chỉnh).
 */
export function InventoryDetailDialog({ item, onClose }: { item: InventoryListItem; onClose: () => void }) {
  const { data, isLoading } = useGetStockMovementsQuery({ variantId: item.variantId, page: 1, size: 20 })
  const movements = data?.items ?? []

  return (
    <ManagementDialog title={`Chi tiết tồn kho — ${item.sku ?? item.productName ?? 'SKU'}`} onClose={onClose} size="wide">
      <div className="space-y-5 p-5 sm:p-6">
        {/* Khối số liệu tồn */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Tồn thực tế" value={item.onHandQty} unit={item.unit} />
          <Metric label="Đang giữ" value={item.reservedQty} unit={item.unit} />
          <Metric label="Khả dụng" value={item.availableQty} unit={item.unit} highlight />
          <Metric label="Ngưỡng tối thiểu" value={item.minimumQty} unit={item.unit} />
        </div>

        <div>
          <h3 id="movements-title" className="mb-2 text-sm font-semibold text-slate-900">Lịch sử thẻ kho gần nhất</h3>
          <ManagementTable
            columns={movementColumns}
            rows={movements}
            rowKey={(m) => m.movementId}
            labelledBy="movements-title"
            emptyMessage={isLoading ? 'Đang tải lịch sử…' : 'Chưa có biến động tồn kho nào.'}
          />
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">Đóng</button>
        </div>
      </div>
    </ManagementDialog>
  )
}

/** Ô hiển thị một chỉ số tồn kho; đánh dấu nổi bật ô "khả dụng" vì đây là con số dùng để bán. */
function Metric({ label, value, unit, highlight = false }: { label: string; value: number; unit?: string | null; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? 'border-sky-200 bg-sky-50' : 'border-slate-200 bg-white'}`}>
      <p className="text-2xs text-slate-500">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-sky-800' : 'text-slate-900'}`}>{value} <span className="text-xs font-normal text-slate-500">{unit ?? ''}</span></p>
    </div>
  )
}
