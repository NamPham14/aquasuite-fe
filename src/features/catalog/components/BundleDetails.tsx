import type { Bundle } from '../types/bundle.types'
import { bundleMoney, localDateInput, publicationLabels } from '../lib/bundle'

function date(value?: string | null, exclusiveEnd = false) { return value ? localDateInput(value, exclusiveEnd).split('-').reverse().join('/') : 'Chưa đặt' }
export function BundleDetails({ bundle }: { bundle: Bundle }) {
  return <div className="space-y-4 text-sm text-slate-700">
    <div><p className="break-words text-lg font-semibold text-slate-900">{bundle.name}</p><p className="break-all">{bundle.productCode} · Phiên bản {bundle.version}</p></div>
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div><dt className="text-xs text-slate-500">Công bố</dt><dd>{publicationLabels[bundle.publicationStatus]}</dd></div>
      <div><dt className="text-xs text-slate-500">Tổng giá lẻ hiện hành</dt><dd>{bundleMoney(bundle.originalTotal)}</dd></div>
      <div><dt className="text-xs text-slate-500">Giá gói</dt><dd className="font-semibold text-sky-800">{bundleMoney(bundle.packagePrice)}</dd></div>
      <div><dt className="text-xs text-slate-500">Tiết kiệm</dt><dd>{bundleMoney(bundle.savingAmount)}{bundle.discountPercent != null ? ` (${bundle.discountPercent}%)` : ''}</dd></div>
      <div><dt className="text-xs text-slate-500">SKU thành phần</dt><dd>{bundle.linkedItemsCount}</dd></div>
      <div><dt className="text-xs text-slate-500">Ngày bắt đầu</dt><dd>{date(bundle.validFrom)}</dd></div>
      <div><dt className="text-xs text-slate-500">Ngày kết thúc</dt><dd>{date(bundle.validUntil, true)}</dd></div>
    </dl>
    {bundle.priceIssue && <p role="alert" className="rounded-md bg-amber-50 p-3 text-amber-900">Giá hiện hành cần kiểm tra ({bundle.priceIssue}). Ngừng công bố và sửa cấu hình giá khi cần.</p>}
    {bundle.description && <p className="whitespace-pre-wrap break-words">{bundle.description}</p>}
    <section aria-labelledby="combo-detail-items"><h3 id="combo-detail-items" className="font-semibold">Thành phần</h3><ul className="divide-y divide-slate-100">{bundle.items.map((item) => <li key={item.variantId} className="space-y-1 py-3"><p className="break-words font-medium">{item.quantity} × {item.name}</p><p className="break-all text-xs">{item.sku} · {bundleMoney(item.sellingPrice)} / SKU</p>{!item.sellable && <p className="text-rose-800">SKU không còn kinh doanh</p>}</li>)}</ul></section>
    <p className="text-xs text-slate-500">Giá và thành phần theo dữ liệu máy chủ khi tải. Combo không có tồn kho riêng; màn hình này không giữ hàng.</p>
  </div>
}
