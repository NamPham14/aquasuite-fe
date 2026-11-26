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
import { DeleteConfirmDialog, ManagementDialog } from '../../shared/ui/ManagementDialog'
import { Button, IconButton, SakugaActionButton, Tooltip } from '../../shared/ui/Button'
import {
  ManagementFilterCard,
  ManagementFilterChip,
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
  ManagementSearch,
  ManagementSelect,
} from '../../shared/ui/ManagementPage'
import { ManagementRowActions } from '../../shared/ui/ManagementRowActions'
import {
  ManagementMobileList,
  ManagementPagination,
  ManagementTable,
  ManagementTableSkeleton,
  type ManagementTableColumn,
} from '../../shared/ui/ManagementTable'
import { EmptyState, ErrorState, OPERATIONAL_TOAST_CLASS } from '../../shared/ui/FeedbackStates'

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
  const hasActiveFilters = Boolean(
    search || categoryId || brandId || status || productType || sort !== 'createdAt,desc',
  )

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
        toast.info('Không có sản phẩm nào để xuất file.', { className: OPERATIONAL_TOAST_CLASS })
        return
      }
      exportProductsToExcel(
        exportRows,
        `Danh_sach_san_pham_${new Date().toISOString().slice(0, 10)}.csv`,
      )
      toast.success(`Đã xuất ${exportRows.length} sản phẩm ra file thành công.`, {
        className: OPERATIONAL_TOAST_CLASS,
      })
    } catch {
      if (rows.length > 0) {
        exportProductsToExcel(
          rows,
          `Danh_sach_san_pham_${new Date().toISOString().slice(0, 10)}.csv`,
        )
        toast.success(`Đã xuất ${rows.length} sản phẩm trên trang hiện tại.`, {
          className: OPERATIONAL_TOAST_CLASS,
        })
      } else {
        toast.error('Không thể xuất dữ liệu sản phẩm.', { className: OPERATIONAL_TOAST_CLASS })
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
        toast.success('Tạo sản phẩm thành công.', { className: OPERATIONAL_TOAST_CLASS })
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
        toast.success('Cập nhật sản phẩm thành công.', { className: OPERATIONAL_TOAST_CLASS })
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
      toast.success('Cập nhật trạng thái sản phẩm thành công.', {
        className: OPERATIONAL_TOAST_CLASS,
      })
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
      toast.success('Xóa sản phẩm thành công.', { className: OPERATIONAL_TOAST_CLASS })
      setDeleteTarget(null)
    } catch (err) {
      const errorState = getCatalogErrorState(err)
      setDeleteError(errorState.message)
    }
  }

  const columns: ManagementTableColumn<ProductSummary>[] = [
    {
      key: 'product',
      header: 'Sản phẩm',
      cellClassName: '!whitespace-normal min-w-[220px]',
      cell: (item) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-[5px] border border-aqs-border bg-aqs-surface-subtle">
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
              <div className="grid h-full w-full place-items-center text-aqs-ink-faint">
                <Package className="h-5 w-5" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-aqs-accent-hover">{item.productCode}</span>
              {item.productType === 'BUNDLE' && (
                <span className="rounded border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                  Combo
                </span>
              )}
            </div>
            <div
              className="mt-0.5 line-clamp-2 max-w-[320px] text-[13px] font-semibold leading-snug text-aqs-ink"
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
          <div className="font-medium text-aqs-ink">{item.categoryName}</div>
          <div className="text-xs text-aqs-ink-faint">
            {item.brandName ? `Hiệu: ${item.brandName}` : 'Không có thương hiệu'}
          </div>
        </div>
      ),
    },
    {
      key: 'priceVariants',
      header: 'Giá bán',
      align: 'center',
      cell: (item) => (
        <div className="text-center font-semibold tabular-nums text-aqs-ink">
          {formatPriceRange(item.minSellingPrice, item.maxSellingPrice)}
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
      align: 'center',
      cell: (item) => (
        <div className="flex items-center justify-center gap-1.5">
          <Link
            to={`/app/products/${item.productId}/variants`}
            className="inline-flex min-h-9 items-center gap-1 rounded-control border border-aqs-border px-2.5 text-xs font-semibold text-aqs-ink-muted no-underline transition-colors hover:bg-aqs-surface-subtle hover:text-aqs-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-focus"
            title="Quản lý biến thể (SKU) & giá bán"
            aria-label={`Quản lý SKU của ${item.productName}`}
          >
            SKU <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <IconButton label={`Xem ${item.productName}`} icon={<Eye />} onClick={() => openViewDialog(item)} />
          <IconButton label={`Sửa ${item.productName}`} icon={<Pencil />} onClick={() => openEditDialog(item)} />
          <IconButton
            label={`Đổi trạng thái ${item.productName}`}
            icon={<RefreshCw />}
            onClick={() => openStatusDialog(item)}
          />
          <IconButton
            label={`Xóa ${item.productName}`}
            icon={<Trash2 />}
            tone="danger"
            onClick={() => openDeleteDialog(item)}
          />
        </div>
      ),
    },
  ]

  const listErrorMessage = isError ? getCatalogErrorState(error).message : ''

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
    <ManagementPageShell>
      <ManagementPageHeader
        title="Quản lý Sản phẩm"
        description="Kiểm soát thông tin định danh, phân loại và trạng thái kinh doanh. Biến thể và bảng giá tiếp tục được quản lý trong module SKU hiện có."
        group="Quản lý danh mục"
        breadcrumb="Sản phẩm"
        actions={
          <>
            <Button variant="secondary" icon={<FileSpreadsheet />} onClick={() => setIsImportOpen(true)}>
              Nhập Excel
            </Button>
            <Tooltip label={rows.length === 0 ? 'Không có sản phẩm để xuất' : 'Xuất danh sách hiện tại ra CSV'}>
              <Button
                variant="secondary"
                icon={<Download />}
                loading={isExporting}
                disabled={isExporting || rows.length === 0}
                onClick={() => void handleExportExcel()}
              >
                {isExporting ? 'Đang xuất' : 'Xuất Excel'}
              </Button>
            </Tooltip>
            <SakugaActionButton icon={<Plus />} onClick={openCreateDialog}>
              Tạo sản phẩm
            </SakugaActionButton>
          </>
        }
      />

      <ManagementFilterCard
        headingId="product-filters-heading"
        title="Tìm và lọc sản phẩm"
        description="Kết quả tự cập nhật theo các điều kiện bên dưới."
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        summaryChips={
          <>
            {search && <ManagementFilterChip>Từ khóa: {search}</ManagementFilterChip>}
            {categoryId && <ManagementFilterChip>Danh mục đã chọn</ManagementFilterChip>}
            {brandId && <ManagementFilterChip>Thương hiệu đã chọn</ManagementFilterChip>}
            {status && <ManagementFilterChip>Trạng thái: {status}</ManagementFilterChip>}
            {productType && <ManagementFilterChip>Loại: {productType}</ManagementFilterChip>}
          </>
        }
        resultCount={`${totalElements.toLocaleString('vi-VN')} kết quả`}
      >
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(220px,1.8fr)_repeat(5,minmax(132px,1fr))]">
          <ManagementSearch
            id="product-search"
            label="Tìm kiếm"
            value={search}
            onChange={(val) => handleFilterChange(setSearch, val)}
            placeholder="Tên hoặc mã sản phẩm…"
            disabled={isLoading}
            className="sm:col-span-2 lg:col-span-2 xl:col-span-1"
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
            <option value="NORMAL">Thông thường</option>
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
            <option value="productName,asc">Tên (A–Z)</option>
            <option value="productName,desc">Tên (Z–A)</option>
            <option value="productCode,asc">Mã sản phẩm (A–Z)</option>
          </ManagementSelect>
        </div>
      </ManagementFilterCard>

      <ManagementPanel
        headingId="products-heading"
        title="Danh sách sản phẩm"
        description={`Tổng số ${totalElements.toLocaleString('vi-VN')} sản phẩm được đồng bộ từ hệ thống.`}
        refreshing={isFetching && !isLoading}
        busy={isFetching}
      >
        {isLoading ? (
          <ManagementTableSkeleton
            rows={6}
            columns={5}
            withLeadingAvatar
            label="Đang tải danh sách sản phẩm"
          />
        ) : listErrorMessage ? (
          <ErrorState
            sectionLabel="Danh sách sản phẩm"
            title="Không thể tải danh sách sản phẩm"
            message={listErrorMessage}
            retrying={isFetching}
            onRetry={() => void refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Không có sản phẩm phù hợp"
            description={
              search.trim()
                ? `Không tìm thấy kết quả cho “${search.trim()}”. Hãy bỏ từ khóa hoặc nới bộ lọc.`
                : 'Bộ lọc hiện tại chưa trả về sản phẩm nào. Hãy nới điều kiện để xem thêm dữ liệu.'
            }
            search={search}
            hasFilters={hasActiveFilters}
            onClearSearch={() => handleFilterChange(setSearch, '')}
            onResetFilters={resetFilters}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <ManagementTable
                columns={columns}
                rows={rows}
                rowKey={(item) => item.productId}
                labelledBy="products-heading"
                emptyMessage="Không có sản phẩm."
              />
            </div>

            <ManagementMobileList
              rows={rows}
              rowKey={(item) => item.productId}
              emptyMessage="Không có sản phẩm."
              renderRow={(item) => (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-control border border-aqs-border bg-aqs-surface-subtle">
                        {item.primaryImageUrl ? (
                          <img
                            src={item.primaryImageUrl}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-aqs-ink-faint">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-aqs-ink">{item.productName}</p>
                        <p className="font-mono text-xs text-aqs-accent-hover">{item.productCode}</p>
                        <p className="text-xs text-aqs-ink-faint">
                          {item.categoryName} • {item.brandName || 'Không có thương hiệu'}
                        </p>
                      </div>
                    </div>
                    <ProductStatusBadge status={item.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-control bg-aqs-surface-subtle px-3 py-2.5 text-xs">
                    <div>
                      <span className="block text-[11px] text-aqs-ink-faint">Khoảng giá</span>
                      <strong className="mt-0.5 block font-semibold tabular-nums text-aqs-ink">
                        {formatPriceRange(item.minSellingPrice, item.maxSellingPrice)}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[11px] text-aqs-ink-faint">Biến thể</span>
                      <div className="mt-0.5 font-semibold">
                        <Link
                          className="text-aqs-accent-hover underline focus-visible:outline-2 focus-visible:outline-aqs-focus"
                          to={`/app/products/${item.productId}/variants`}
                          aria-label={`Quản lý SKU của ${item.productName}`}
                        >
                          {item.totalVariants} biến thể
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                        className="inline-flex min-h-9 items-center gap-1 rounded-control border border-aqs-border bg-aqs-surface px-2.5 text-xs font-semibold text-aqs-ink-muted"
                        aria-label={`Quản lý SKU của ${item.productName}`}
                      >
                        SKU <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        icon={<RefreshCw className="h-3.5 w-3.5" />}
                        onClick={() => openStatusDialog(item)}
                      >
                        Đổi trạng thái
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            />

            <ManagementPagination
              page={data?.page ?? page}
              totalPages={totalPages}
              totalElements={totalElements}
              shownCount={rows.length}
              noun="sản phẩm"
              disabled={isFetching}
              onPageChange={setPage}
            />
          </>
        )}
      </ManagementPanel>

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
            <div className="p-8 text-center text-sm text-aqs-ink-faint">
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

      {statusTarget && (
        <ProductStatusDialog
          product={statusTarget}
          pending={statusState.isLoading}
          apiError={statusError}
          onClose={() => setStatusTarget(null)}
          onConfirm={handleConfirmStatus}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          title="Xác nhận xóa sản phẩm"
          subject={`${deleteTarget.productCode} — ${deleteTarget.productName}`}
          description="Sản phẩm sẽ bị xóa vĩnh viễn. Máy chủ sẽ từ chối nếu dữ liệu đang được tham chiếu."
          confirmLabel="Xóa sản phẩm"
          pendingLabel="Đang xóa sản phẩm"
          pending={deleteState.isLoading}
          error={deleteError || undefined}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void handleConfirmDelete()}
        />
      )}

      {isImportOpen && (
        <ProductImportDialog
          onSuccess={() => void refetch()}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </ManagementPageShell>
  )
}
