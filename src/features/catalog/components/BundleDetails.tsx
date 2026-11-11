import { ManagementTable } from '../../../shared/ui/ManagementTable'
import type { Bundle } from '../types/bundle.types'
import { bundleMoney, localDateInput, publicationLabels } from '../lib/bundle'

function date(value?: string | null, exclusiveEnd = false) { return value ? localDateInput(value, exclusiveEnd).split('-').reverse().join('/') : 'Chưa đặt' }
export function BundleDetails({ bundle }: { bundle: Bundle }) {
  return <div className="space-y-6 text-sm text-slate-700">
    <section aria-label="Thông tin combo" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1"><h3 className="break-words text-xl font-semibold text-slate-900">{bundle.name}</h3><p className="mt-1 break-all text-slate-500">Mã combo: <span className="font-medium text-slate-700">{bundle.productCode}</span></p></div>
        <span className="rounded-md bg-slate-100 px-3 py-1 font-medium">{publicationLabels[bundle.publicationStatus]}</span>
      </div>
      <div><h4 className="font-medium text-slate-900">Mô tả</h4><p className="mt-1 whitespace-pre-wrap break-words text-slate-600">{bundle.description || 'Chưa có mô tả.'}</p></div>
    </section>
    <section aria-labelledby="combo-detail-price" className="border-t border-slate-200 pt-5">
      <h3 id="combo-detail-price" className="mb-3 font-semibold text-slate-900">Giá combo</h3>
      <dl className="grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
        <div><dt>Giá bán combo</dt><dd className="mt-1 text-xl font-semibold text-sky-800">{bundleMoney(bundle.packagePrice)}</dd></div>
        <div><dt>Tổng giá mua lẻ</dt><dd className="mt-1 font-medium text-slate-900">{bundleMoney(bundle.originalTotal)}</dd></div>
        <div><dt>Tiết kiệm khi mua combo</dt><dd className="mt-1 font-medium text-slate-900">{bundleMoney(bundle.savingAmount)}{bundle.discountPercent != null ? ` (${bundle.discountPercent}%)` : ''}</dd></div>
      </dl>
      {bundle.priceIssue && <p role="alert" className="mt-3 rounded-md bg-amber-50 p-3 text-amber-900">Giá hiện hành cần kiểm tra ({bundle.priceIssue}). Ngừng công bố và sửa cấu hình giá khi cần.</p>}
    </section>
    <section aria-labelledby="combo-detail-validity" className="border-t border-slate-200 pt-5">
      <h3 id="combo-detail-validity" className="mb-3 font-semibold text-slate-900">Thời gian hiệu lực</h3>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><dt className="text-slate-500">Ngày bắt đầu</dt><dd className="mt-1 font-medium text-slate-900">{date(bundle.validFrom)}</dd></div>
        <div><dt className="text-slate-500">Ngày kết thúc</dt><dd className="mt-1 font-medium text-slate-900">{date(bundle.validUntil, true)}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-slate-500">Thời gian hiệu lực bao gồm cả ngày kết thúc.</p>
    </section>
    <section aria-labelledby="combo-detail-items" className="border-t border-slate-200 pt-5">
      <h3 id="combo-detail-items" className="mb-3 font-semibold text-slate-900">Sản phẩm thành phần <span className="font-normal text-slate-500">({bundle.linkedItemsCount} SKU)</span></h3>
      <ManagementTable labelledBy="combo-detail-items" rows={bundle.items} rowKey={(item) => item.variantId} emptyMessage="Combo chưa có sản phẩm thành phần." columns={[
        { key: 'product', header: 'Sản phẩm / SKU', cell: (item) => <div className="min-w-40 max-w-80 whitespace-normal"><p className="break-words font-medium text-slate-900">{item.name}</p><p className="mt-1 break-all text-slate-500">{item.sku}</p>{!item.sellable && <p className="mt-1 text-rose-800">Không còn kinh doanh</p>}</div> },
        { key: 'quantity', header: 'Số lượng', align: 'right', cell: (item) => item.quantity },
        { key: 'price', header: 'Đơn giá lẻ', align: 'right', cell: (item) => bundleMoney(item.sellingPrice) },
        { key: 'total', header: 'Thành tiền lẻ', align: 'right', cell: (item) => bundleMoney(item.sellingPrice == null ? null : item.sellingPrice * item.quantity) },
      ]} />
      <p className="mt-3 text-xs leading-relaxed text-slate-500">Giá lẻ được cập nhật tại thời điểm mở chi tiết. Tồn kho được quản lý theo từng sản phẩm thành phần.</p>
    </section>
  </div>
}
