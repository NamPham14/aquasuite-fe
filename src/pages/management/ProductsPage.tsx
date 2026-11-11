import { useDeferredValue, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import {
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AppDispatch } from '../../app/store'
import {
  CatalogDeleteDialog,
  CatalogMobileList,
  CatalogPagination,
  exportProductsToExcel,
  getCatalogErrorState,
  productApi,
  ProductForm,
  ProductImportDialog,
  ProductStatusBadge,
  ProductStatusDialog,
  useCreateProductMutation,
  useDeleteProductMutation,
  useGetBrandOptionsQuery,
  useGetCategoryOptionsQuery,
  useGetProductQuery,
  useGetProductsQuery,
  useUpdateProductMutation,
  useUpdateProductStatusMutation,
  type CatalogDialogMode,
  type ProductDetail,
  type ProductStatus,
  type ProductSummary,
  type ProductType,
  type ValidProductFormValues,
} from '../../features/catalog'
import { ManagementDialog } from '../../shared/ui/ManagementDialog'
import {
  ManagementFilterBar,
  ManagementPageHeader,
  ManagementSearch,
  ManagementSelect,
} from '../../shared/ui/ManagementPage'
import { ManagementRowActions } from '../../shared/ui/ManagementRowActions'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable'

const secondaryButton =
  'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50'
const primaryButton =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600'

interface ProductDialogState {
  mode: Exclude<CatalogDialogMode, 'delete'>
  productId?: string
  initialSummary?: ProductSummary
}

function formatPriceRange(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return 'Chưa có giá'
  if (min != null && max != null) {
    if (min === max) return `${min.toLocaleString('vi-VN')} ₫`
    return `${min.toLocaleString('vi-VN')} – ${max.toLocaleString('vi-VN')} ₫`
  }
  if (min != null) return `Từ ${min.toLocaleString('vi-VN')} ₫`
  return `Đến ${max!.toLocaleString('vi-VN')} ₫`
}

export function ProductsPage() {
  const dispatch = useDispatch<AppDispatch>()

  // Filters state
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [status, setStatus] = useState<'' | ProductStatus>('')
  const [productType, setProductType] = useState<'' | ProductType>('')
  const [sort, setSort] = useState('createdAt,desc')
  const [page, setPage] = useState(0)

  const deferredSearch = useDeferredValue(search.trim())

  // Queries
  const { data, isLoading, isFetching, isError, error, refetch } = useGetProductsQuery({
    page,
    size: 20,
    keyword: deferredSearch || undefined,
    categoryId: categoryId || undefined,
    brandId: brandId || undefined,
    status: status || undefined,
    productType: productType || undefined,
    sort,
  })

  const categoryOptionsQuery = useGetCategoryOptionsQuery()
  const brandOptionsQuery = useGetBrandOptionsQuery()

  // Mutations
  const [createProduct, createState] = useCreateProductMutation()
  const [updateProduct, updateState] = useUpdateProductMutation()
  const [updateProductStatus, statusState] = useUpdateProductStatusMutation()
  const [deleteProduct, deleteState] = useDeleteProductMutation()

  // Modal dialog states
  const [dialog, setDialog] = useState<ProductDialogState | null>(null)
  const [statusTarget, setStatusTarget] = useState<ProductSummary | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductSummary | null>(null)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Error feedback states
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [statusError, setStatusError] = useState('')
  const [deleteError, setDeleteError] = useState('')

  // Detail query for active modal
  const detailQuery = useGetProductQuery(dialog?.productId ?? '', {
    skip: !dialog?.productId,
  })

  const rows = data?.items ?? []
  const totalElements = data?.totalElements ?? 0
  const totalPages = data?.totalPages ?? 0

  const categoryOptions = categoryOptionsQuery.data ?? []
  const brandOptions = brandOptionsQuery.data ?? []

  function handleFilterChange<T>(setter: (val: T) => void, val: T) {
    setter(val)
    setPage(0)
  }

  function resetFilters() {
    setSearch('')
    setCategoryId('')
    setBrandId('')
    setStatus('')
    setProductType('')
    setSort('createdAt,desc')
    setPage(0)
  }

  function openCreateDialog() {
    setFormError('')
    setFieldErrors({})
    setDialog({ mode: 'create' })
  }

  function openEditDialog(item: ProductSummary) {
    setFormError('')
    setFieldErrors({})
    setDialog({ mode: 'edit', productId: item.productId, initialSummary: item })
  }

  function openViewDialog(item: ProductSummary) {
    setFormError('')
    setFieldErrors({})
    setDialog({ mode: 'view', productId: item.productId, initialSummary: item })
  }

  function openStatusDialog(item: ProductSummary) {
    setStatusError('')
    setStatusTarget(item)
  }

  function openDeleteDialog(item: ProductSummary) {
    setDeleteError('')
    setDeleteTarget(item)
  }

  async function handleExportExcel() {
    setIsExporting(true)
    try {
      const res = await dispatch(
        productApi.endpoints.getProducts.initiate(
          {
            page: 0,
            size: 500,
            keyword: deferredSearch || undefined,
            categoryId: categoryId || undefined,
            brandId: brandId || undefined,
            status: status || undefined,
            productType: productType || undefined,
            sort,
          },
          { forceRefetch: true },
        ),
      ).unwrap()

      const exportRows = res.items.length > 0 ? res.items : rows
      if (exportRows.length === 0) {
        toast.info('Không có sản phẩm nào để xuất file.')
        return
      }
      exportProductsToExcel(
        exportRows,
        `Danh_sach_san_pham_${new Date().toISOString().slice(0, 10)}.csv`,
      )
      toast.success(`Đã xuất ${exportRows.length} sản phẩm ra file thành công.`)
    } catch {
      if (rows.length > 0) {
        exportProductsToExcel(
          rows,
          `Danh_sach_san_pham_${new Date().toISOString().slice(0, 10)}.csv`,
        )
        toast.success(`Đã xuất ${rows.length} sản phẩm trên trang hiện tại.`)
      } else {
        toast.error('Không thể xuất dữ liệu sản phẩm.')
      }
    } finally {
      setIsExporting(false)
    }
  }

  async function handleSaveProduct(values: ValidProductFormValues) {
    setFormError('')
    setFieldErrors({})

    try {
      if (dialog?.mode === 'create') {
        await createProduct({
          productCode: values.productCode,
          productName: values.productName,
          categoryId: values.categoryId,
          brandId: values.brandId || null,
          description: values.description || null,
          specifications: values.specifications,
          productType: values.productType,
          status: values.status,
          imageUrls: values.imageUrls,
        }).unwrap()
        toast.success('Tạo sản phẩm thành công.')
        setDialog(null)
      } else if (dialog?.mode === 'edit' && dialog.productId) {
        await updateProduct({
          id: dialog.productId,
          data: {
            productCode: values.productCode,
            productName: values.productName,
            categoryId: values.categoryId,
            brandId: values.brandId || null,
            description: values.description || null,
            specifications: values.specifications,
            productType: values.productType,
            status: values.status,
            imageUrls: values.imageUrls,
          },
        }).unwrap()
        toast.success('Cập nhật sản phẩm thành công.')
        setDialog(null)
      }
    } catch (err) {
      const errorState = getCatalogErrorState(err)
      setFormError(errorState.message)
      setFieldErrors(errorState.fields)
    }
  }

  async function handleConfirmStatus(nextStatus: ProductStatus) {
    if (!statusTarget) return
    setStatusError('')
    try {
      await updateProductStatus({
        id: statusTarget.productId,
        data: { status: nextStatus },
      }).unwrap()
      toast.success('Cập nhật trạng thái sản phẩm thành công.')
      setStatusTarget(null)
    } catch (err) {
      const errorState = getCatalogErrorState(err)
      setStatusError(errorState.message)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteError('')
    try {
      await deleteProduct(deleteTarget.productId).unwrap()
      toast.success('Xóa sản phẩm thành công.')
      setDeleteTarget(null)
    } catch (err) {
      const errorState = getCatalogErrorState(err)
      setDeleteError(errorState.message)
    }
  }

  // Construct table columns: 5 optimized columns fitting 100% viewport without horizontal scrolling
  const columns: ManagementTableColumn<ProductSummary>[] = [
    {
      key: 'product',
      header: 'Sản phẩm',
      cellClassName: '!whitespace-normal min-w-[220px]',
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
            {item.primaryImageUrl ? (
              <img
                src={item.primaryImageUrl}
                alt={item.productName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src =
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">
                <Package className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-sky-800">
                {item.productCode}
              </span>
              {item.productType === 'BUNDLE' && (
                <span className="rounded border border-purple-200 bg-purple-50 px-1.5 py-0.2 text-[10px] font-medium text-purple-700">
                  Combo
                </span>
              )}
            </div>
            <div
              className="line-clamp-2 text-xs font-medium text-slate-900 leading-snug"
              title={item.productName}
            >
              {item.productName}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'classification',
      header: 'Phân loại',
      cellClassName: '!whitespace-normal',
      cell: (item) => (
        <div className="space-y-0.5">
          <div className="font-medium text-slate-800">{item.categoryName}</div>
          <div className="text-[11px] text-slate-500">
            {item.brandName ? `Hiệu: ${item.brandName}` : 'Không có thương hiệu'}
          </div>
        </div>
      ),
    },
    {
      key: 'priceVariants',
      header: 'Giá & Biến thể',
      align: 'right',
      cell: (item) => (
        <div className="space-y-0.5 text-right">
          <div className="tabular-nums font-medium text-slate-900">
            {formatPriceRange(item.minSellingPrice, item.maxSellingPrice)}
          </div>
          <div className="text-[11px] text-slate-500">
            <Link className="text-sky-700 underline focus-visible:outline-2 focus-visible:outline-sky-600" to={`/app/products/${item.productId}/variants`} aria-label={`Quản lý SKU của ${item.productName}`}>{item.totalVariants} biến thể</Link>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      cell: (item) => <ProductStatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      cell: (item) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            to={`/app/products/${item.productId}/variants`}
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600"
            title="Quản lý biến thể (SKU) & giá bán"
            aria-label={`Quản lý SKU của ${item.productName}`}
          >
            SKU <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => openViewDialog(item)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600"
            title="Xem chi tiết"
            aria-label={`Xem ${item.productName}`}
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openEditDialog(item)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-sky-200 bg-sky-50 text-sky-700 transition-colors hover:bg-sky-100 focus-visible:outline-2 focus-visible:outline-sky-600"
            title="Chỉnh sửa sản phẩm"
            aria-label={`Sửa ${item.productName}`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openStatusDialog(item)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-700 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-sky-600"
            title="Đổi trạng thái"
            aria-label={`Đổi trạng thái ${item.productName}`}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => openDeleteDialog(item)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-sky-600"
            title="Xóa sản phẩm"
            aria-label={`Xóa ${item.productName}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  const listErrorMessage = isError ? getCatalogErrorState(error).message : ''

  // Build fallback product detail when waiting for detailQuery
  const activeProductDetail: ProductDetail | undefined = detailQuery.data
    ? detailQuery.data
    : dialog?.initialSummary
      ? {
          productId: dialog.initialSummary.productId,
          productCode: dialog.initialSummary.productCode,
          productName: dialog.initialSummary.productName,
          category: {
            categoryId: dialog.initialSummary.categoryId,
            categoryCode: '',
            categoryName: dialog.initialSummary.categoryName,
          },
          brand: dialog.initialSummary.brandId
            ? {
                brandId: dialog.initialSummary.brandId,
                brandCode: '',
                brandName: dialog.initialSummary.brandName ?? '',
              }
            : null,
          productType: dialog.initialSummary.productType,
          status: dialog.initialSummary.status,
          images: dialog.initialSummary.primaryImageUrl
            ? [
                {
                  imageUrl: dialog.initialSummary.primaryImageUrl,
                  isPrimary: true,
                  sortOrder: 0,
                },
              ]
            : [],
          description: null,
          specifications: null,
          variants: [],
          createdAt: dialog.initialSummary.createdAt,
          updatedAt: dialog.initialSummary.updatedAt,
        }
      : undefined

  return (
    <div className="space-y-5">
      <ManagementPageHeader
        title="Quản lý Sản phẩm"
        description="Quản lý thông tin định danh sản phẩm, danh mục, thương hiệu và thông số kỹ thuật"
        breadcrumb="Sản phẩm"
        group="Quản lý danh mục"
        icon={<Package className="h-6 w-6" />}
      />

      {/* Top action toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Danh mục định danh sản phẩm (Master Data). Biến thể và bảng giá chi tiết được quản lý tại module biến thể.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={secondaryButton}
            onClick={() => setIsImportOpen(true)}
          >
            <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
            Nhập Excel
          </button>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => void handleExportExcel()}
            disabled={isExporting || rows.length === 0}
            title={rows.length === 0 ? 'Không có sản phẩm để xuất' : 'Xuất danh sách sản phẩm ra Excel/CSV'}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {isExporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          <button
            type="button"
            className={primaryButton}
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Tạo sản phẩm
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <ManagementFilterBar>
        <ManagementSearch
          id="product-search"
          label="Tìm kiếm"
          value={search}
          onChange={(val) => handleFilterChange(setSearch, val)}
          placeholder="Tìm theo tên hoặc mã SP..."
          disabled={isLoading}
        />

        <ManagementSelect
          id="product-category-filter"
          label="Danh mục"
          value={categoryId}
          onChange={(val) => handleFilterChange(setCategoryId, val)}
          disabled={isLoading || categoryOptionsQuery.isLoading}
        >
          <option value="">Tất cả danh mục</option>
          {categoryOptions.map((opt) => (
            <option key={opt.categoryId} value={opt.categoryId}>
              {opt.categoryCode} — {opt.categoryName}
            </option>
          ))}
        </ManagementSelect>

        <ManagementSelect
          id="product-brand-filter"
          label="Thương hiệu"
          value={brandId}
          onChange={(val) => handleFilterChange(setBrandId, val)}
          disabled={isLoading || brandOptionsQuery.isLoading}
        >
          <option value="">Tất cả thương hiệu</option>
          {brandOptions.map((opt) => (
            <option key={opt.brandId} value={opt.brandId}>
              {opt.brandCode} — {opt.brandName}
            </option>
          ))}
        </ManagementSelect>

        <ManagementSelect
          id="product-status-filter"
          label="Trạng thái"
          value={status}
          onChange={(val) => handleFilterChange(setStatus, val as '' | ProductStatus)}
          disabled={isLoading}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Bản nháp</option>
          <option value="ACTIVE">Đang kinh doanh</option>
          <option value="INACTIVE">Tạm ngưng</option>
          <option value="DISCONTINUED">Ngừng kinh doanh</option>
        </ManagementSelect>

        <ManagementSelect
          id="product-type-filter"
          label="Loại sản phẩm"
          value={productType}
          onChange={(val) => handleFilterChange(setProductType, val as '' | ProductType)}
          disabled={isLoading}
        >
          <option value="">Tất cả loại</option>
          <option value="NORMAL">Sản phẩm thông thường</option>
          <option value="BUNDLE">Gói combo</option>
        </ManagementSelect>

        <ManagementSelect
          id="product-sort"
          label="Sắp xếp"
          value={sort}
          onChange={(val) => handleFilterChange(setSort, val)}
          disabled={isLoading}
        >
          <option value="createdAt,desc">Mới nhất</option>
          <option value="createdAt,asc">Cũ nhất</option>
          <option value="productName,asc">Tên (A-Z)</option>
          <option value="productName,desc">Tên (Z-A)</option>
          <option value="productCode,asc">Mã sản phẩm (A-Z)</option>
        </ManagementSelect>

        <button
          type="button"
          onClick={resetFilters}
          className="h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600"
        >
          Xóa bộ lọc
        </button>
      </ManagementFilterBar>

      {/* Main Table section */}
      <section
        aria-labelledby="products-heading"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs"
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 id="products-heading" className="text-base font-semibold text-slate-900">
              Danh sách sản phẩm
            </h2>
            <p className="text-xs text-slate-500">
              Tổng số {totalElements.toLocaleString('vi-VN')} sản phẩm được đồng bộ từ hệ thống.
            </p>
          </div>
          {isFetching && (
            <span className="self-start rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 sm:self-auto">
              Đang làm mới dữ liệu...
            </span>
          )}
        </div>

        {/* Error notification banner */}
        {listErrorMessage && (
          <div className="m-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <div>
              <p className="font-medium">Không thể tải danh sách sản phẩm</p>
              <p className="text-xs">{listErrorMessage}</p>
            </div>
            <button
              type="button"
              onClick={() => void refetch()}
              className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Thử lại
            </button>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden sm:block [&_table]:text-sm">
          <ManagementTable
            columns={columns}
            rows={rows}
            rowKey={(item) => item.productId}
            labelledBy="products-heading"
            emptyMessage={
              isLoading
                ? 'Đang tải danh sách sản phẩm...'
                : listErrorMessage
                  ? 'Chưa thể tải dữ liệu sản phẩm.'
                  : 'Không tìm thấy sản phẩm phù hợp. Hãy thử từ khóa hoặc bộ lọc khác.'
            }
          />
        </div>

        {/* Mobile View */}
        <CatalogMobileList
          rows={rows}
          rowKey={(item) => item.productId}
          emptyMessage={
            isLoading
              ? 'Đang tải danh sách sản phẩm...'
              : listErrorMessage
                ? 'Chưa thể tải dữ liệu sản phẩm.'
                : 'Không tìm thấy sản phẩm phù hợp.'
          }
          renderRow={(item) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {item.primaryImageUrl ? (
                      <img
                        src={item.primaryImageUrl}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{item.productName}</p>
                    <p className="font-mono text-xs text-sky-800">{item.productCode}</p>
                    <p className="text-xs text-slate-500">
                      {item.categoryName} • {item.brandName || 'Không có thương hiệu'}
                    </p>
                  </div>
                </div>
                <ProductStatusBadge status={item.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2 text-xs">
                <div>
                  <span className="text-slate-500">Khoảng giá:</span>
                  <div className="font-medium text-slate-900">
                    {formatPriceRange(item.minSellingPrice, item.maxSellingPrice)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Biến thể:</span>
                  <div className="font-medium text-slate-900"><Link className="text-sky-700 underline focus-visible:outline-2 focus-visible:outline-sky-600" to={`/app/products/${item.productId}/variants`} aria-label={`Quản lý SKU của ${item.productName}`}>{item.totalVariants} biến thể</Link></div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <ManagementRowActions
                  actions={[
                    {
                      variant: 'view',
                      label: 'Xem',
                      ariaLabel: `Xem ${item.productName}`,
                      onClick: () => openViewDialog(item),
                    },
                    {
                      variant: 'edit',
                      label: 'Sửa',
                      ariaLabel: `Sửa ${item.productName}`,
                      onClick: () => openEditDialog(item),
                    },
                    {
                      variant: 'delete',
                      label: 'Xóa',
                      ariaLabel: `Xóa ${item.productName}`,
                      onClick: () => openDeleteDialog(item),
                    },
                  ]}
                />
                <div className="flex items-center gap-2">
                  <Link
                    to={`/app/products/${item.productId}/variants`}
                    className="inline-flex min-h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700"
                    aria-label={`Quản lý SKU của ${item.productName}`}
                  >
                    SKU <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => openStatusDialog(item)}
                    className="inline-flex min-h-9 items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 text-xs font-medium text-amber-800"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Đổi trạng thái
                  </button>
                </div>
              </div>
            </div>
          )}
        />

        {/* Pagination */}
        <CatalogPagination
          page={data?.page ?? page}
          totalPages={totalPages}
          totalElements={totalElements}
          noun="sản phẩm"
          disabled={isFetching}
          onPageChange={setPage}
        />
      </section>

      {/* Modal: Create / Edit / View Product */}
      {dialog && (
        <ManagementDialog
          title={
            dialog.mode === 'create'
              ? 'Tạo sản phẩm mới'
              : dialog.mode === 'edit'
                ? 'Chỉnh sửa sản phẩm'
                : 'Chi tiết sản phẩm'
          }
          onClose={() => setDialog(null)}
          closeDisabled={createState.isLoading || updateState.isLoading}
        >
          {dialog.mode !== 'create' && detailQuery.isLoading && !activeProductDetail ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Đang tải chi tiết sản phẩm...
            </div>
          ) : (
            <ProductForm
              key={`${dialog.mode}-${dialog.productId ?? 'new'}`}
              mode={dialog.mode}
              product={activeProductDetail}
              categoryOptions={categoryOptions}
              categoryLoading={categoryOptionsQuery.isLoading}
              brandOptions={brandOptions}
              brandLoading={brandOptionsQuery.isLoading}
              pending={createState.isLoading || updateState.isLoading}
              apiError={formError}
              apiFieldErrors={fieldErrors}
              onClose={() => setDialog(null)}
              onSubmit={handleSaveProduct}
            />
          )}
        </ManagementDialog>
      )}

      {/* Modal: Update Product Status */}
      {statusTarget && (
        <ProductStatusDialog
          product={statusTarget}
          pending={statusState.isLoading}
          apiError={statusError}
          onClose={() => setStatusTarget(null)}
          onConfirm={handleConfirmStatus}
        />
      )}

      {/* Modal: Soft Delete Confirmation */}
      {deleteTarget && (
        <CatalogDeleteDialog
          kind="sản phẩm"
          code={deleteTarget.productCode}
          name={deleteTarget.productName}
          pending={deleteState.isLoading}
          error={deleteError}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleConfirmDelete()}
        />
      )}

      {/* Modal: Import Excel */}
      {isImportOpen && (
        <ProductImportDialog
          onSuccess={() => void refetch()}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </div>
  )
}
