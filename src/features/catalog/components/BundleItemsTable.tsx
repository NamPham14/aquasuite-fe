import { X } from 'lucide-react'
import { ManagementTable, type ManagementTableColumn } from '../../../shared/ui/ManagementTable'
import { managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { bundleMoney } from '../lib/bundle'
import type { BundleSelectedItem } from '../types/bundle.types'

export function BundleItemsTable({ items, error, onQuantityChange, onRemove }: {
  items: BundleSelectedItem[]
  error?: string
  onQuantityChange: (variantId: string, quantity: number) => void
  onRemove: (variantId: string) => void
}) {
  const columns: ManagementTableColumn<BundleSelectedItem>[] = [
    { key: 'sku', header: 'SKU', cellClassName: 'font-medium text-slate-900', cell: (item) => <div className="w-28 whitespace-normal break-all">{item.sku}</div> },
    { key: 'name', header: 'Tên sản phẩm / Biến thể', cell: (item) => <div className="w-56 whitespace-normal break-words"><p>{item.name}</p>{!item.sellable && <p className="mt-1 text-xs text-rose-800">SKU không còn kinh doanh</p>}</div> },
    { key: 'quantity', header: 'Số lượng', cell: (item) => <div className="w-20"><input id={`combo-qty-${item.variantId}`} aria-label={`Số lượng ${item.sku}`} aria-invalid={Boolean(error)} aria-describedby={error ? 'combo-items-error' : undefined} type="number" min={1} max={10000} step={1} value={Number.isNaN(item.quantity) ? '' : item.quantity} className={`${managementFieldClass} tabular-nums`} onChange={(event) => onQuantityChange(item.variantId, event.target.valueAsNumber)} /></div> },
    { key: 'price', header: 'Đơn giá lẻ', align: 'right', cell: (item) => bundleMoney(item.sellingPrice) },
    { key: 'total', header: 'Thành tiền*', align: 'right', cell: (item) => bundleMoney(item.sellingPrice != null && Number.isFinite(item.quantity) ? item.sellingPrice * item.quantity : null) },
    { key: 'remove', header: 'Bỏ', align: 'center', cell: (item) => <button type="button" className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-sky-600" aria-label={`Bỏ SKU ${item.sku}`} onClick={() => onRemove(item.variantId)}><X className="h-4 w-4" aria-hidden="true" /></button> },
  ]
  return <section aria-labelledby="combo-selected-heading" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="combo-selected-heading" className="text-sm font-semibold text-slate-900">Sản phẩm thành phần</h3><span className="rounded bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800">Đã chọn {items.length}/100 SKU</span></div>
    {error && <p id="combo-items-error" role="alert" className="mb-2 text-xs text-rose-800">{error}</p>}
    <div className="overflow-hidden rounded-lg border border-slate-200 tabular-nums"><ManagementTable columns={columns} rows={items} rowKey={(item) => item.variantId} labelledBy="combo-selected-heading" emptyMessage="Chưa có thành phần. Bấm Chọn SKU thành phần để thêm sản phẩm." /></div>
    <p className="text-xs text-slate-500">* Thành tiền minh họa từ số lượng × đơn giá.</p>
  </section>
}
