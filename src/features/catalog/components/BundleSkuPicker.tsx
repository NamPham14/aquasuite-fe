import { useDeferredValue, useState } from 'react'
import { Plus } from 'lucide-react'
import { useSearchBundleSkusQuery } from '../api/bundleApi'
import { CatalogPagination } from './CatalogPagination'
import { managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { ManagementSearch } from '../../../shared/ui/ManagementPage'
import type { BundleSelectedItem } from '../types/bundle.types'
import { bundleButtonClass, bundleError, bundleMoney } from '../lib/bundle'

export function BundleSkuPicker({ selected, onAdd }: { selected: BundleSelectedItem[]; onAdd: (item: BundleSelectedItem) => void }) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const search = useDeferredValue(keyword.trim())
  const result = useSearchBundleSkusQuery({ page, size: 10, ...(search ? { keyword: search } : {}) })
  const data = result.currentData
  const available = data?.items.filter((sku) => !selected.some((item) => item.variantId === sku.variantId)) ?? []
  const candidate = available.find((sku) => sku.variantId === selectedId) ?? available[0]
  const disabled = result.isFetching || !candidate || selected.length >= 100

  function add() {
    if (disabled) return
    onAdd({ variantId: candidate.variantId, sku: candidate.sku, name: `${candidate.productName} · ${candidate.variantName}`, quantity: 1, sellingPrice: candidate.sellingPrice, sellable: true })
  }
  return <section aria-labelledby="combo-sku-heading" className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
    <h3 id="combo-sku-heading" className="text-sm font-semibold text-slate-900">Tìm và thêm SKU</h3>
    <ManagementSearch id="combo-sku-search" label="Tìm SKU đang kinh doanh" value={keyword} onChange={(value) => { setKeyword(value.slice(0, 255)); setSelectedId(''); setPage(0) }} placeholder="Nhập mã SKU hoặc tên sản phẩm..." />
    {result.isError ? <div role="alert" className="flex flex-wrap items-center gap-2 py-2 text-xs text-rose-800"><p>{bundleError(result.error).message}</p><button type="button" className={bundleButtonClass} onClick={() => void result.refetch()}>Thử lại</button></div> : <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end" aria-busy={result.isFetching}>
        <div className="min-w-0 flex-1"><label htmlFor="combo-sku-result" className="text-sm font-medium text-slate-700">SKU tìm được</label>
        <select id="combo-sku-result" className={managementFieldClass} value={candidate?.variantId ?? ''} disabled={result.isFetching || !available.length || selected.length >= 100} onChange={(event) => setSelectedId(event.target.value)}>
          {!available.length && <option value="">{result.isFetching ? 'Đang tải SKU...' : data?.items.length ? 'Các SKU trong trang này đã được chọn' : 'Không tìm thấy SKU phù hợp'}</option>}
          {available.map((sku) => <option key={sku.variantId} value={sku.variantId}>{sku.sku} · {sku.productName} / {sku.variantName} · {bundleMoney(sku.sellingPrice)}</option>)}
        </select>
        </div>
        <button type="button" className={bundleButtonClass} disabled={disabled} onClick={add}><Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />Thêm</button>
      </div>
      <span role="status" className="sr-only">{result.isFetching ? 'Đang tải SKU...' : `${available.length} SKU chưa chọn trong trang này`}</span>
      <CatalogPagination page={page} totalPages={data?.totalPages ?? 0} totalElements={data?.totalElements ?? 0} noun="SKU" disabled={result.isFetching} onPageChange={(next) => { setPage(next); setSelectedId('') }} />
    </>}
  </section>
}
