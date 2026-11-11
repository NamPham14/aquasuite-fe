import { useDeferredValue, useState } from 'react'
import { Check, Plus, Package } from 'lucide-react'
import { useSearchBundleSkusQuery } from '../api/bundleApi'
import { CatalogPagination } from './CatalogPagination'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import { ManagementSearch } from '../../../shared/ui/ManagementPage'
import type { BundleSelectedItem } from '../types/bundle.types'
import { bundleButtonClass, bundleError, bundleMoney, bundlePrimaryClass } from '../lib/bundle'

export function BundleSkuPicker({ selected, onAdd }: { selected: BundleSelectedItem[]; onAdd: (item: BundleSelectedItem) => void }) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const search = useDeferredValue(keyword.trim())
  const result = useSearchBundleSkusQuery({ page, size: 10, ...(search ? { keyword: search } : {}) }, { skip: !open, refetchOnMountOrArgChange: true })
  const data = result.currentData
  return <>
    <button id="combo-sku-search" type="button" className={bundleButtonClass} onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Chọn SKU thành phần</button>
    {open && <ManagementDialog title="Chọn SKU cho combo" placement="right" onClose={() => setOpen(false)}>
      <div className="flex min-h-[calc(100dvh_-_77px)] flex-col" onKeyDownCapture={(event) => { if (event.key === 'Enter' && (event.target as HTMLElement).tagName === 'INPUT') { event.preventDefault(); event.stopPropagation() } }}>
        <div className="space-y-4 border-b border-slate-200 bg-slate-50/60 p-5">
          <p className="text-sm text-slate-600">Chọn biến thể sản phẩm đang kinh doanh để thêm vào combo.</p>
          <ManagementSearch id="combo-drawer-search" label="Tìm SKU hoặc sản phẩm" value={keyword} onChange={(value) => { setKeyword(value.slice(0, 255)); setPage(0) }} placeholder="Mã SKU, tên sản phẩm hoặc biến thể..." />
          <p role="status" className="text-xs font-medium text-sky-800">Đã chọn {selected.length}/100 SKU{selected.length >= 100 && ' · Đã đạt giới hạn'}</p>
        </div>
        <div className="flex-1 p-5" aria-busy={result.isFetching}>
          {result.isError ? <div role="alert" className="space-y-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800"><p>{bundleError(result.error).message}</p><button type="button" className={bundleButtonClass} onClick={() => void result.refetch()}>Thử lại</button></div>
            : result.isFetching ? <p role="status" className="py-8 text-center text-sm text-slate-500">Đang tải SKU...</p>
              : !data?.items.length ? <div className="space-y-2 py-10 text-center text-sm text-slate-500"><Package className="mx-auto h-8 w-8 text-slate-300" aria-hidden="true" /><p>Không tìm thấy SKU phù hợp.</p><p className="text-xs">Thử mã SKU hoặc tên sản phẩm khác.</p></div>
                : <ul className="divide-y divide-slate-200">{data.items.map((sku) => {
                  const added = selected.some((item) => item.variantId === sku.variantId)
                  return <li key={sku.variantId} className="space-y-3 py-4 first:pt-0">
                    <div className="min-w-0"><p className="break-all text-xs font-medium text-sky-700">{sku.sku}</p><h3 className="mt-1 break-words text-sm font-semibold text-slate-900">{sku.productName}</h3><p className="mt-1 break-words text-xs text-slate-500">{sku.variantName}</p></div>
                    <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold tabular-nums text-slate-900">{bundleMoney(sku.sellingPrice)}</span><button type="button" className={added ? bundleButtonClass : bundlePrimaryClass} disabled={added || selected.length >= 100 || result.isFetching} aria-label={added ? `Đã chọn ${sku.sku}` : `Thêm SKU ${sku.sku}`} onClick={() => onAdd({ variantId: sku.variantId, sku: sku.sku, name: `${sku.productName} · ${sku.variantName}`, quantity: 1, sellingPrice: sku.sellingPrice, sellable: true })}>{added ? <Check className="mr-1 h-4 w-4" aria-hidden="true" /> : <Plus className="mr-1 h-4 w-4" aria-hidden="true" />}{added ? 'Đã chọn' : 'Thêm'}</button></div>
                  </li>
                })}</ul>}
        </div>
        <div className="sticky bottom-0 space-y-3 border-t border-slate-200 bg-white p-5">
          <CatalogPagination page={page} totalPages={data?.totalPages ?? 0} totalElements={data?.totalElements ?? 0} noun="SKU" disabled={result.isFetching} onPageChange={setPage} />
          <button type="button" className={`${bundlePrimaryClass} w-full`} onClick={() => setOpen(false)}>Xong · {selected.length} SKU đã chọn</button>
        </div>
      </div>
    </ManagementDialog>}
  </>
}
