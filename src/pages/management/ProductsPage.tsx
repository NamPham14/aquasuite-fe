import { useMemo, useState } from 'react'
import { ExternalLink, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CatalogPagination, type ProductStatus, type ProductSummary, type ProductType, useGetProductsQuery } from '../../features/catalog'
import { ManagementFilterBar, ManagementPageHeader, ManagementSearch, ManagementSelect } from '../../shared/ui/ManagementPage'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'

const pageSize = 20
const secondaryButton = 'inline-flex min-h-9 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600'
function currency(value?: number | null) { return value == null ? '—' : `${new Intl.NumberFormat('vi-VN').format(value)} ₫` }
function statusLabel(status: ProductStatus) { return ({ DRAFT: 'Bản nháp', ACTIVE: 'Đang kinh doanh', INACTIVE: 'Ngừng hoạt động', DISCONTINUED: 'Ngừng kinh doanh', DELETED: 'Đã xóa' } as const)[status] }
function statusClass(status: ProductStatus) { return status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : status === 'DRAFT' ? 'bg-sky-100 text-sky-800' : status === 'DELETED' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-900' }
function apiError(error: unknown) { return typeof error === 'object' && error && 'data' in error && (error as { data?: { message?: string } }).data?.message ? (error as { data: { message: string } }).data.message : 'Không thể tải danh sách sản phẩm.' }

/** Product index uses the actual UC-09 backend endpoint; no demonstration rows are retained. */
export function ProductsPage() {
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<ProductStatus | ''>('')
  const [productType, setProductType] = useState<ProductType | ''>('')
  const [page, setPage] = useState(0)
  const params = useMemo(() => ({ keyword: keyword.trim() || undefined, status: status || undefined, productType: productType || undefined, page, size: pageSize }), [keyword, page, productType, status])
  const products = useGetProductsQuery(params)
  const columns: ManagementTableColumn<ProductSummary>[] = [
    { key: 'code', header: 'Mã SP', cell: (product) => product.productCode, cellClassName: 'font-medium text-slate-900' },
    { key: 'name', header: 'Sản phẩm', cell: (product) => <div className="flex min-w-52 items-center gap-3">{product.primaryImageUrl ? <img src={product.primaryImageUrl} alt="" className="h-9 w-9 rounded object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded bg-sky-50 text-sky-700"><Package className="h-4 w-4" /></span>}<div><p className="font-medium text-slate-900">{product.productName}</p><p className="text-xs text-slate-500">{product.categoryName ?? 'Chưa phân loại'} · {product.brandName ?? 'Chưa có thương hiệu'}</p></div></div> },
    { key: 'type', header: 'Loại', cell: (product) => product.productType === 'BUNDLE' ? 'Combo' : 'Hàng thường' },
    { key: 'price', header: 'Giá niêm yết', cell: (product) => product.minSellingPrice == null ? '—' : product.minSellingPrice === product.maxSellingPrice ? currency(product.minSellingPrice) : `${currency(product.minSellingPrice)} – ${currency(product.maxSellingPrice)}`, align: 'right' },
    { key: 'variants', header: 'SKU', cell: (product) => product.totalVariants },
    { key: 'status', header: 'Trạng thái', cell: (product) => <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusClass(product.status)}`}>{statusLabel(product.status)}</span> },
    { key: 'actions', header: 'Thao tác', cell: (product) => <Link className={secondaryButton} to={`/app/products/${product.productId}/variants`} aria-label={`Quản lý SKU của ${product.productName}`}>SKU <ExternalLink className="h-3.5 w-3.5" /></Link> },
  ]
  const reset = () => { setKeyword(''); setStatus(''); setProductType(''); setPage(0) }
  return <div className="space-y-6"><ManagementPageHeader title="Quản lý Sản phẩm" description="Danh mục sản phẩm, bảng giá và phân loại mặt hàng" breadcrumb="Sản phẩm" group="Quản lý danh mục" icon={<Package className="h-6 w-6" />} /><ManagementFilterBar><ManagementSearch id="product-search" label="Tìm kiếm" value={keyword} onChange={(value) => { setKeyword(value); setPage(0) }} placeholder="Tìm theo tên hoặc mã sản phẩm..." /><ManagementSelect id="product-type" label="Loại sản phẩm" value={productType} onChange={(value) => { setProductType(value as ProductType | ''); setPage(0) }}><option value="">Tất cả</option><option value="NORMAL">Hàng thường</option><option value="BUNDLE">Combo</option></ManagementSelect><ManagementSelect id="product-status" label="Trạng thái" value={status} onChange={(value) => { setStatus(value as ProductStatus | ''); setPage(0) }}><option value="">Tất cả</option><option value="DRAFT">Bản nháp</option><option value="ACTIVE">Đang kinh doanh</option><option value="INACTIVE">Ngừng hoạt động</option><option value="DISCONTINUED">Ngừng kinh doanh</option></ManagementSelect><button type="button" onClick={reset} className={secondaryButton}>Đặt lại</button></ManagementFilterBar><section aria-labelledby="products-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"><div className="flex flex-col gap-1 border-b border-slate-100 p-4 sm:p-6"><h2 id="products-heading" className="text-base font-semibold text-slate-900">Danh sách sản phẩm</h2><p className="text-xs text-slate-500">Chọn SKU để mở màn Biến thể & giá bán của sản phẩm.</p></div>{products.isError ? <p role="alert" className="m-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{apiError(products.error)}</p> : <ManagementTable columns={columns} rows={products.data?.content ?? []} rowKey={(product) => product.productId} labelledBy="products-heading" emptyMessage={products.isLoading ? 'Đang tải sản phẩm...' : 'Chưa có sản phẩm. Hãy tạo hoặc import sản phẩm trước.'} />}<CatalogPagination page={products.data?.number ?? page} totalPages={products.data?.totalPages ?? 0} totalElements={products.data?.totalElements ?? 0} noun="sản phẩm" disabled={products.isFetching} onPageChange={setPage} /></section></div>
}
