import { Layers, Plus } from 'lucide-react'
import { ManagementFilterBar, ManagementPageHeader, ManagementSearch, ManagementSelect } from '../../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../../shared/ui/ManagementTable'
import { ManagementRowActions } from '../../../shared/ui/ManagementRowActions'
import { useBundleManagement } from '../hooks/useBundleManagement'
import type { Bundle, BundleProductStatus, BundlePublication } from '../types/bundle.types'
import { bundleButtonClass, bundleError, bundleMoney, bundlePrimaryClass, publicationLabels } from '../lib/bundle'
import { CatalogPagination } from './CatalogPagination'
import { CatalogMobileList } from './CatalogMobileList'
import { BundleDialog } from './BundleDialog'
import { CatalogStatusBadge } from './CatalogStatusBadge'

export function BundleManagement() {
  const m = useBundleManagement()
  const data = m.list.currentData
  const error = m.error || (m.list.isError ? bundleError(m.list.error).message : '')
  function actions(bundle: Bundle) {
    return <div className="space-y-2"><ManagementRowActions actions={[
      { variant: 'view', label: 'Xem', ariaLabel: `Xem ${bundle.name}`, onClick: () => void m.open('view', bundle), disabled: m.loadingDetail },
      { variant: 'edit', label: bundle.publicationStatus === 'PUBLISHED' ? 'Sửa (khóa)' : 'Sửa', ariaLabel: bundle.publicationStatus === 'PUBLISHED' ? `Sửa ${bundle.name} bị khóa; cần ngừng công bố trước` : `Sửa ${bundle.name}`, onClick: () => void m.open('edit', bundle), disabled: m.loadingDetail || bundle.publicationStatus === 'PUBLISHED' },
      { variant: 'delete', label: 'Xóa', ariaLabel: `Xóa ${bundle.name}`, onClick: () => void m.open('delete', bundle), disabled: m.loadingDetail },
    ]} /><div className="flex flex-wrap gap-2">
      <button type="button" className={bundleButtonClass} disabled={m.loadingDetail} onClick={() => void m.open(bundle.publicationStatus === 'PUBLISHED' ? 'unpublish' : 'publish', bundle)}>{bundle.publicationStatus === 'PUBLISHED' ? 'Ngừng công bố' : 'Công bố'}</button>
      <button type="button" className={bundleButtonClass} disabled={m.loadingDetail} onClick={() => void m.open(bundle.productStatus === 'ACTIVE' ? 'deactivate' : 'activate', bundle)}>{bundle.productStatus === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt'}</button>
    </div></div>
  }
  const columns: ManagementTableColumn<Bundle>[] = [
    { key: 'name', header: 'Combo', cell: (bundle) => <div className="max-w-64 whitespace-normal"><p className="break-words font-semibold">{bundle.name}</p><p className="break-all text-xs text-slate-500">{bundle.productCode}</p></div> },
    { key: 'items', header: 'Số SKU', cell: (bundle) => bundle.linkedItemsCount },
    { key: 'retail', header: 'Tổng giá lẻ', cell: (bundle) => bundleMoney(bundle.originalTotal), align: 'right' },
    { key: 'price', header: 'Giá gói', cell: (bundle) => <span className="font-semibold text-sky-800">{bundleMoney(bundle.packagePrice)}</span>, align: 'right' },
    { key: 'discount', header: 'Giảm giá', cell: (bundle) => bundle.priceIssue ? <span className="text-amber-800">Cần kiểm tra giá</span> : bundle.discountPercent != null ? `${bundle.discountPercent}%` : 'Chưa xác định' },
    { key: 'status', header: 'Trạng thái', cell: (bundle) => <div className="space-y-1.5"><p className="text-xs text-slate-600">{publicationLabels[bundle.publicationStatus]}</p><CatalogStatusBadge status={bundle.productStatus} /></div> },
    { key: 'actions', header: 'Thao tác', cell: actions },
  ]
  const rows = m.list.isError || m.forbidden ? [] : data?.items ?? []
  const empty = m.list.isFetching ? 'Đang tải combo...' : m.list.isError ? 'Chưa thể tải dữ liệu.' : 'Không tìm thấy combo phù hợp.'
  return <div className="space-y-5">
    <ManagementPageHeader title="Quản lý Combo" description="Cấu hình bộ SKU, giá gói và lịch công bố" breadcrumb="Combo" group="Quản lý danh mục" icon={<Layers className="h-6 w-6" />} />
    {m.forbidden ? <section role="alert" className="space-y-3 rounded-lg border border-rose-200 bg-white p-6"><h2 className="text-lg font-semibold">Không có quyền quản lý combo</h2><p className="text-sm text-slate-600">Máy chủ không cho phép tài khoản này truy cập chức năng quản lý combo.</p><button type="button" className={bundleButtonClass} disabled={m.list.isFetching} onClick={() => void m.retry()}>Kiểm tra lại quyền</button></section> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-2xl text-sm text-slate-600">Tạo bản nháp, kiểm tra thành phần rồi công bố theo lịch.</p><button type="button" className={bundlePrimaryClass} disabled={m.loadingDetail || m.list.isError} onClick={m.createNew}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Tạo combo</button></div>
      <ManagementFilterBar>
        <ManagementSearch id="combo-search" label="Tìm kiếm" value={m.filters.keyword ?? ''} onChange={(value) => m.changeFilters({ keyword: value.slice(0, 255) || undefined })} placeholder="Tìm theo mã hoặc tên combo..." />
        <ManagementSelect id="combo-publication-filter" label="Công bố" value={m.filters.publicationStatus ?? ''} onChange={(value) => m.changeFilters({ publicationStatus: (value || undefined) as BundlePublication | undefined })}><option value="">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã công bố</option><option value="UNPUBLISHED">Ngừng công bố</option></ManagementSelect>
        <ManagementSelect id="combo-status-filter" label="Hoạt động" value={m.filters.productStatus ?? ''} onChange={(value) => m.changeFilters({ productStatus: (value || undefined) as BundleProductStatus | undefined })}><option value="">Tất cả</option><option value="ACTIVE">Hoạt động</option><option value="INACTIVE">Ngừng hoạt động</option></ManagementSelect>
        <button type="button" className={bundleButtonClass} onClick={() => m.changeFilters({ keyword: undefined, publicationStatus: undefined, productStatus: undefined })}>Đặt lại</button>
      </ManagementFilterBar>
      {error && !m.dialog && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800"><span>{error}</span><button type="button" className={bundleButtonClass} disabled={m.list.isFetching} onClick={() => void m.retry()}>Thử lại</button></div>}
      {m.loadingDetail && <p role="status" className="text-sm text-slate-600">Đang tải chi tiết mới nhất...</p>}
      <section aria-labelledby="combo-list-heading" aria-busy={m.list.isFetching} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 p-4"><h2 id="combo-list-heading" className="font-semibold text-slate-900">Danh sách combo</h2><button type="button" className={bundleButtonClass} disabled={m.list.isFetching} onClick={() => void m.retry()}>Tải lại</button></div>
        <div className="hidden sm:block [&_table]:text-sm"><ManagementTable columns={columns} rows={rows} rowKey={(bundle) => bundle.bundleId} labelledBy="combo-list-heading" emptyMessage={empty} /></div>
        <CatalogMobileList rows={rows} rowKey={(bundle) => bundle.bundleId} emptyMessage={empty} renderRow={(bundle) => <div className="space-y-3"><div><h3 className="break-words font-semibold">{bundle.name}</h3><p className="break-all text-xs text-slate-500">{bundle.productCode}</p></div><p className="text-sm">{publicationLabels[bundle.publicationStatus]} · {bundle.productStatus === 'ACTIVE' ? 'Hoạt động' : 'Ngừng hoạt động'} · {bundle.linkedItemsCount} SKU</p><p className="font-semibold text-sky-800">Giá gói: {bundleMoney(bundle.packagePrice)}</p><p className="text-xs text-slate-600">Giá lẻ: {bundleMoney(bundle.originalTotal)} · {bundle.priceIssue ? 'Cần kiểm tra giá' : bundle.discountPercent != null ? `Giảm ${bundle.discountPercent}%` : 'Chưa xác định giảm giá'}</p>{actions(bundle)}</div>} />
        <CatalogPagination page={m.filters.page} totalPages={data?.totalPages ?? 0} totalElements={data?.totalElements ?? 0} noun="combo" disabled={m.list.isFetching} onPageChange={(page) => m.changeFilters({ page })} />
        {data && m.filters.page > 0 && !rows.length && !m.list.isFetching && <button type="button" className={`${bundleButtonClass} m-4`} onClick={() => m.changeFilters({ page: 0 })}>Về trang đầu</button>}
      </section>
      {m.dialog && <BundleDialog key={`${m.dialog.mode}-${m.revision}`} management={m} />}
    </>}
  </div>
}
