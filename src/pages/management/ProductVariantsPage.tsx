import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Boxes,
  Check,
  CheckCircle2,
  CircleDollarSign,
  CircleOff,
  Grid2X2,
  Layers,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import {
  CatalogPagination,
  type ProductVariant,
  type VariantDeletionEligibility,
  type VariantStatus,
  type VariantUpsertRequest,
  useChangeVariantStatusMutation,
  useCreateVariantMatrixMutation,
  useCreateVariantMutation,
  useDeleteVariantMutation,
  useGetVariantDeletionEligibilityQuery,
  useGetVariantStatsQuery,
  useGetVariantsQuery,
  useGetProductQuery,
  useUpdateVariantMutation,
} from '../../features/catalog'
import { ManagementDialog, ManagementFormField, managementFieldClass } from '../../shared/ui/ManagementDialog.tsx'
import { ManagementFilterBar, ManagementPageHeader, ManagementSearch, ManagementSelect } from '../../shared/ui/ManagementPage.tsx'
import { ManagementTable, type ManagementTableColumn } from '../../shared/ui/ManagementTable.tsx'
import { ActivityLogPanel } from '../../features/audit'

const pageSize = 10
const primaryButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-sky-700 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-45'
const secondaryButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-45'
const dangerButton =
  'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-red-700 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-45'
const iconActionButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-sky-700 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-45'
const iconDangerButton =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-red-700 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-sky-700 disabled:cursor-not-allowed disabled:opacity-45'

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; variant: ProductVariant }
  | { kind: 'matrix' }
  | { kind: 'status'; variant: ProductVariant }
  | { kind: 'delete'; variant: ProductVariant }
  | null

function apiError(error: unknown) {
  return typeof error === 'object' && error && 'data' in error && (error as { data?: { message?: string } }).data?.message
    ? (error as { data: { message: string } }).data.message
    : 'Không thể hoàn tất thao tác. Vui lòng kiểm tra dữ liệu và thử lại.'
}

function money(value?: number | null) {
  return value == null ? 'Chưa có giá' : `${new Intl.NumberFormat('vi-VN').format(value)} ₫`
}

function statusLabel(status: VariantStatus) {
  return status === 'ACTIVE' ? 'Đang kinh doanh' : status === 'INACTIVE' ? 'Ngừng kinh doanh' : 'Đã xóa'
}

function StatusBadge({ status, missingPrice }: { status: VariantStatus; missingPrice?: boolean }) {
  if (status === 'INACTIVE' && missingPrice) {
    return (
      <div className="inline-flex flex-col">
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
          <span className="h-[7px] w-[7px] rounded-full bg-current" aria-hidden="true" />
          Chưa có giá bán
        </span>
        <p className="mt-1 text-[11.5px] text-slate-500">Đang ngừng kinh doanh</p>
      </div>
    )
  }

  const style =
    status === 'ACTIVE'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'INACTIVE'
        ? 'bg-slate-100 text-slate-600'
        : 'bg-red-50 text-red-700'

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${style}`}>
      <span className="h-[7px] w-[7px] rounded-full bg-current" aria-hidden="true" />
      {statusLabel(status)}
    </span>
  )
}

function MarginInfo({ costPrice, sellingPrice }: { costPrice?: number | null; sellingPrice?: number | null }) {
  if (sellingPrice == null) {
    return <span className="text-[13px] font-medium italic text-slate-400">Chưa có giá bán</span>
  }
  const hasCost = costPrice != null
  const diff = hasCost ? sellingPrice - costPrice : 0
  const pct = hasCost && sellingPrice > 0 ? Math.round((diff / sellingPrice) * 100) : 0
  const belowCost = hasCost && diff < 0

  return (
    <div className="tabular-nums">
      <p className="whitespace-nowrap font-bold text-slate-900">{money(sellingPrice)}</p>
      {hasCost && (
        <>
          <p className={`whitespace-nowrap text-xs font-semibold ${belowCost ? 'text-red-700' : 'text-sky-800'}`}>
            Lãi: {belowCost ? '−' : '+'}
            {new Intl.NumberFormat('vi-VN').format(Math.abs(diff))} ₫ · {pct}%
          </p>
          {belowCost && (
            <span className="mt-1 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-700">
              Bán dưới giá vốn
            </span>
          )}
        </>
      )}
    </div>
  )
}

function specSummary(item: ProductVariant) {
  const spec = item.technicalSpec ?? {}
  return Object.entries(spec)
    .filter(([, value]) => value != null && String(value).trim() !== '')
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ')
}

/** UC-10; product master data remains the responsibility of UC-09. */
export function ProductVariantsPage() {
  const { productId } = useParams<{ productId: string }>()
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<VariantStatus | ''>('')
  const [missingPrice, setMissingPrice] = useState(false)
  const [sortBy, setSortBy] = useState('default')
  const [page, setPage] = useState(0)
  const [dialog, setDialog] = useState<DialogState>(null)

  const params = useMemo(
    () => ({
      productId: productId ?? '',
      keyword: keyword.trim() || undefined,
      status: status || undefined,
      missingPrice: missingPrice || undefined,
      sortBy,
      sortDir: 'DESC' as const,
      warehouseCode: 'WH_MAIN',
      page,
      size: pageSize,
    }),
    [keyword, missingPrice, page, productId, sortBy, status],
  )

  const list = useGetVariantsQuery(params, { skip: !productId })
  const product = useGetProductQuery(productId ?? '', { skip: !productId })
  const stats = useGetVariantStatsQuery(productId ?? '', { skip: !productId })
  const [create, createState] = useCreateVariantMutation()
  const [update, updateState] = useUpdateVariantMutation()
  const [matrix, matrixState] = useCreateVariantMatrixMutation()
  const [changeStatus, statusState] = useChangeVariantStatusMutation()
  const [remove, removeState] = useDeleteVariantMutation()

  if (!productId) {
    return <p className="rounded-lg bg-red-50 p-4 text-sm text-red-800">Thiếu mã sản phẩm gốc để quản lý biến thể.</p>
  }

  const chooseStatus = (next: VariantStatus | '') => {
    setStatus(next)
    setMissingPrice(false)
    setPage(0)
  }

  const save = async (data: VariantUpsertRequest, editing?: ProductVariant) => {
    try {
      if (editing) {
        await update({ productId, variantId: editing.id, data }).unwrap()
      } else {
        await create({ productId, data }).unwrap()
      }
      toast.success(editing ? 'Đã lưu thay đổi biến thể.' : 'SKU và giá biến thể đã được lưu thành công.')
      if (data.sellingPrice == null) {
        toast.warning(`Biến thể ${data.sku} chưa có giá bán nên đang ở trạng thái Ngừng kinh doanh.`)
      }
      setDialog(null)
    } catch (error) {
      toast.error(apiError(error))
    }
  }

  const saveMatrix = async (rows: VariantUpsertRequest[]) => {
    try {
      const result = await matrix({ productId, variants: rows }).unwrap()
      toast.success(`Đã tạo ${result.length} biến thể.`)
      const noPriceCount = rows.filter((r) => r.sellingPrice == null).length
      if (noPriceCount > 0) {
        toast.warning(`${noPriceCount} biến thể chưa có giá bán nên đang ở trạng thái Ngừng kinh doanh.`)
      }
      setDialog(null)
    } catch (error) {
      toast.error(apiError(error))
    }
  }

  const switchStatus = async (item: ProductVariant) => {
    if (item.status !== 'ACTIVE' && item.sellingPrice == null) {
      toast.warning(`Biến thể ${item.sku} chưa có giá bán nên chưa thể kinh doanh. Hãy bổ sung giá bán.`)
      setDialog({ kind: 'edit', variant: item })
      return
    }
    const next = item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await changeStatus({ productId, variantId: item.id, status: next }).unwrap()
      toast.success(`Đã ${next === 'ACTIVE' ? 'kích hoạt kinh doanh' : 'ngừng kinh doanh'} biến thể ${item.sku}.`)
      setDialog(null)
    } catch (error) {
      toast.error(apiError(error))
    }
  }

  const deleteConfirmed = async (item: ProductVariant, reason: string) => {
    try {
      await remove({ productId, variantId: item.id, data: { confirmed: true, reason } }).unwrap()
      toast.success(`Đã xóa vĩnh viễn biến thể ${item.sku}. Mã SKU đã được giải phóng.`)
      setDialog(null)
    } catch (error) {
      toast.error(apiError(error))
    }
  }

  const rows = list.data?.content ?? []

const columns: ManagementTableColumn<ProductVariant>[] = [
    {
      key: 'sku',
      header: 'Mã SKU / Biến thể',
      align: 'left',
      headerClassName: 'w-[17%]',
      cell: (item) => (
        <div>
          <p className="truncate font-mono text-[13px] font-semibold text-sky-800" title={item.sku}>
            {item.sku}
          </p>
          <p className="line-clamp-2 font-semibold text-slate-900" title={item.variantName}>
            {item.variantName}
          </p>
          {item.serialTracking && <p className="mt-0.5 text-[11px] text-slate-500">Theo dõi Serial</p>}
        </div>
      ),
    },
    {
      key: 'attributes',
      header: 'Thuộc tính',
      align: 'right',
      headerClassName: 'w-[16%]',
      cell: (item) => <AttributeSummary item={item} />,
    },
    {
      key: 'unit',
      header: 'ĐVT · Quy đổi',
      align: 'right',
      headerClassName: 'w-[10%]',
      cell: (item) => (
        <span className="whitespace-nowrap tabular-nums text-slate-800">
          {item.unit}
          {item.conversionRate !== 1 && <span className="text-xs text-slate-500"> · × {item.conversionRate}</span>}
        </span>
      ),
    },
    {
      key: 'cost',
      header: 'Giá nhập',
      align: 'left',
      headerClassName: 'w-[11%]',
      cell: (item) =>
        item.costPrice != null ? (
          <span className="whitespace-nowrap font-semibold tabular-nums text-slate-900">{money(item.costPrice)}</span>
        ) : (
          <span className="text-[13px] font-medium italic text-slate-400">Chưa nhập</span>
        ),
    },
    {
      key: 'stock',
      header: 'Tồn kho WH_MAIN',
      align: 'right',
      headerClassName: 'w-[12%]',
      cell: (item) => (
        <div className="text-xs tabular-nums text-slate-700">
          <p className={item.lowStock ? 'font-bold text-amber-700' : 'font-semibold text-slate-900'}>
            {item.onHandQty ?? 0} tồn thực tế
          </p>
          <p className="text-[11px] text-slate-500">
            Khả dụng: {item.availableQty ?? 0} · Giữ: {item.reservedQty ?? 0}
          </p>
        </div>
      ),
    },
    {
      key: 'retail',
      header: 'Giá bán & lãi dự kiến',
      align: 'right',
      headerClassName: 'w-[13%]',
      cell: (item) => <MarginInfo costPrice={item.costPrice} sellingPrice={item.sellingPrice} />,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'left',
      headerClassName: 'w-[11%]',
      cell: (item) => <StatusBadge status={item.status} missingPrice={item.sellingPrice == null} />,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      headerClassName: 'w-[8%]',
      cell: (item) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            className={iconActionButton}
            onClick={() => setDialog({ kind: 'edit', variant: item })}
            title="Sửa biến thể & giá"
            aria-label={`Sửa ${item.sku}`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          {item.status !== 'DELETED' && (
            <button
              type="button"
              className={iconActionButton}
              disabled={statusState.isLoading}
              onClick={() => setDialog({ kind: 'status', variant: item })}
              title={item.status === 'ACTIVE' ? 'Ngừng kinh doanh' : 'Kinh doanh lại'}
              aria-label={item.status === 'ACTIVE' ? `Ngừng kinh doanh ${item.sku}` : `Kích hoạt ${item.sku}`}
            >
              {item.status === 'ACTIVE' ? (
                <Ban className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
          <button
            type="button"
            className={iconDangerButton}
            onClick={() => setDialog({ kind: 'delete', variant: item })}
            title="Xóa biến thể"
            aria-label={`Xóa ${item.sku}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <ManagementPageHeader
        title="Biến thể & Giá"
        description="Quản lý mã SKU, thuộc tính, giá nhập và giá bán của sản phẩm"
        breadcrumb="Sản phẩm / Biến thể & Giá"
        group="Danh mục sản phẩm"
        icon={<Boxes className="h-6 w-6" />}
      />
      <Link to="/app/products" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Quay về danh sách sản phẩm
      </Link>

      {product.data && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-semibold text-sky-800">{product.data.productCode}</p>
              <h2 className="mt-1 text-base font-bold text-slate-900">{product.data.productName}</h2>
              <p className="mt-1 text-xs text-slate-600">{product.data.brand?.brandName ?? 'Chưa gắn hãng'} · {product.data.category.categoryName} · {product.data.productType}</p>
            </div>
            {product.data.warrantyPolicy ? (
              <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                <strong>Áp dụng tự động: {product.data.warrantyPolicy.policyName}</strong><br />
                {product.data.warrantyPolicy.warrantyMonths} tháng theo Hãng & Nhóm hàng
              </div>
            ) : <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Chưa có chính sách bảo hành áp dụng.</p>}
          </div>
        </section>
      )}

      <section aria-label="Thống kê biến thể" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy={stats.isLoading}>
        <StatCard
          label="Tổng số SKU"
          value={stats.data?.total}
          icon={<Layers className="h-5 w-5" />}
          tone="accent"
          active={status === ''}
          onClick={() => chooseStatus('')}
        />
        <StatCard
          label="Đang kinh doanh"
          value={stats.data?.active}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="ok"
          active={status === 'ACTIVE'}
          onClick={() => chooseStatus('ACTIVE')}
        />
        <StatCard
          label="Ngừng kinh doanh"
          value={stats.data?.inactive}
          icon={<Ban className="h-5 w-5" />}
          tone="muted"
          active={status === 'INACTIVE'}
          onClick={() => chooseStatus('INACTIVE')}
        />
        <StatCard
          label="Chưa có giá bán — không bán được"
          value={stats.data?.missingRetailPrice}
          icon={<CircleDollarSign className="h-5 w-5" />}
          tone="warn"
          active={missingPrice}
          onClick={() => { setMissingPrice(true); setStatus('INACTIVE'); setPage(0) }}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="text-[13.5px] text-slate-600">
          SKU là mã duy nhất toàn hệ thống. Giá bán để trống sẽ tự động chuyển về <strong>Ngừng kinh doanh</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} disabled={product.data?.productType === 'BUNDLE'} onClick={() => setDialog({ kind: 'matrix' })}>
            <Grid2X2 className="h-4 w-4" aria-hidden="true" />
            Tạo ma trận biến thể
          </button>
          <button type="button" className={primaryButton} disabled={product.data?.productType === 'BUNDLE'} onClick={() => setDialog({ kind: 'create' })}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm biến thể
          </button>
        </div>
      </div>

      <ManagementFilterBar>
        <ManagementSearch
          id="variant-search"
          label="Tìm kiếm"
          value={keyword}
          onChange={(value) => {
            setKeyword(value)
            setPage(0)
          }}
          placeholder="Mã SKU, tên biến thể, màu sắc..."
        />
        <ManagementSelect
          id="variant-status"
          label="Trạng thái"
          value={status}
          onChange={(value) => chooseStatus(value as VariantStatus | '')}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang kinh doanh</option>
          <option value="INACTIVE">Ngừng kinh doanh</option>
        </ManagementSelect>
        <ManagementSelect id="variant-sort" label="Sắp xếp" value={sortBy} onChange={(value) => { setSortBy(value); setPage(0) }}>
          <option value="default">Mới cập nhật</option>
          <option value="sku">Mã SKU</option>
          <option value="costPrice">Giá nhập</option>
          <option value="sellingPrice">Giá bán</option>
          <option value="profit">Lợi nhuận</option>
        </ManagementSelect>
        <button
          type="button"
          className={secondaryButton}
          onClick={() => {
            setKeyword('')
            chooseStatus('')
            setMissingPrice(false)
            setSortBy('default')
          }}
        >
          Đặt lại
        </button>
      </ManagementFilterBar>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs" aria-busy={list.isFetching}>
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3.5 pb-2.5">
          <h2 id="variant-list" className="text-[15px] font-bold text-slate-900">
            Danh sách biến thể (SKU)
          </h2>
          <p className="text-xs text-slate-600">
            {list.isFetching && !list.isLoading
              ? 'Đang cập nhật...'
              : `${list.data?.totalElements ?? rows.length} biến thể khớp bộ lọc`}
          </p>
        </div>

        {list.isError ? (
          <p role="alert" className="mx-4 mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {apiError(list.error)}
          </p>
        ) : (
          <>
            <div className="hidden md:block [&_table]:text-sm">
              <ManagementTable
                columns={columns}
                rows={rows}
                rowKey={(item) => item.id}
                wrapCells
                labelledBy="variant-list"
                emptyMessage={
                  list.isLoading
                    ? 'Đang tải biến thể...'
                    : 'Không tìm thấy biến thể nào. Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.'
                }
              />
            </div>

            <div className="divide-y divide-slate-200 md:hidden">
              {rows.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-600">
                  <p className="mb-1 text-[15px] font-bold text-slate-900">
                    {list.isLoading ? 'Đang tải biến thể...' : 'Không tìm thấy biến thể nào'}
                  </p>
                  {!list.isLoading && <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>}
                </div>
              ) : (
                rows.map((item) => (
                  <article key={item.id} className="space-y-3 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-semibold text-sky-800">{item.sku}</p>
                        <p className="text-sm font-bold text-slate-900">{item.variantName}</p>
                        {item.serialTracking && <p className="text-xs text-slate-500">Theo dõi Serial từng chiếc</p>}
                      </div>
                      <StatusBadge status={item.status} missingPrice={item.sellingPrice == null} />
                    </div>

                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                      <dt className="font-semibold uppercase tracking-wider text-slate-500">Thuộc tính</dt>
                      <dd className="text-right text-slate-700">
                        {[item.color, item.size].filter(Boolean).join(' · ') || '—'}
                      </dd>
                      {specSummary(item) && <><dt className="font-semibold uppercase tracking-wider text-slate-500">Thông số</dt><dd className="text-right text-slate-700">{specSummary(item)}</dd></>}
                      <dt className="font-semibold uppercase tracking-wider text-slate-500">ĐVT · Quy đổi</dt>
                      <dd className="text-right text-slate-700">
                        {item.unit} {item.conversionRate !== 1 ? `· × ${item.conversionRate}` : ''}
                      </dd>
                      <dt className="font-semibold uppercase tracking-wider text-slate-500">Giá nhập</dt>
                      <dd className="text-right font-medium text-slate-800">
                        {item.costPrice != null ? money(item.costPrice) : 'Chưa nhập'}
                      </dd>
                      <dt className="font-semibold uppercase tracking-wider text-slate-500">Giá bán</dt>
                      <dd className="text-right">
                        <MarginInfo costPrice={item.costPrice} sellingPrice={item.sellingPrice} />
                      </dd>
                      <dt className="font-semibold uppercase tracking-wider text-slate-500">Tồn WH_MAIN</dt>
                      <dd className="text-right text-slate-700">{item.onHandQty ?? 0} tồn · {item.availableQty ?? 0} khả dụng</dd>
                    </dl>

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        className={iconActionButton}
                        onClick={() => setDialog({ kind: 'edit', variant: item })}
                        aria-label={`Sửa ${item.sku}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {item.status !== 'DELETED' && (
                        <button
                          type="button"
                          className={iconActionButton}
                          disabled={statusState.isLoading}
                          onClick={() => setDialog({ kind: 'status', variant: item })}
                          aria-label={item.status === 'ACTIVE' ? `Ngừng kinh doanh ${item.sku}` : `Kích hoạt ${item.sku}`}
                        >
                          {item.status === 'ACTIVE' ? (
                            <Ban className="h-4 w-4" aria-hidden="true" />
                          ) : (
                            <Check className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        className={iconDangerButton}
                        onClick={() => setDialog({ kind: 'delete', variant: item })}
                        aria-label={`Xóa ${item.sku}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </>
        )}

        <CatalogPagination
          page={list.data?.number ?? page}
          totalPages={list.data?.totalPages ?? 0}
          totalElements={list.data?.totalElements ?? 0}
          noun="biến thể"
          disabled={list.isFetching}
          onPageChange={setPage}
        />
      </section>

      <p className="rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-[13px] text-sky-900">
        Chỉ xóa vĩnh viễn được SKU tạo nhầm, chưa từng phát sinh chứng từ và có tồn kho / đặt giữ bằng 0. Nếu đã phát sinh giao dịch, hãy dùng <strong>Ngừng kinh doanh</strong>.
      </p>

      <ActivityLogPanel
        entityType="PRODUCT_VARIANT"
        productId={productId}
        enabled={Boolean(productId)}
        description="Các lần tạo, chỉnh giá, đổi trạng thái và xóa SKU của sản phẩm này."
      />

      {dialog?.kind === 'create' && (
        <ManagementDialog title="Thêm biến thể" size="wide" onClose={() => setDialog(null)} closeDisabled={createState.isLoading}>
          <VariantForm inheritedSpecifications={product.data?.specifications} pending={createState.isLoading} onClose={() => setDialog(null)} onSubmit={(data) => void save(data)} />
        </ManagementDialog>
      )}
      {dialog?.kind === 'edit' && (
        <ManagementDialog
          title={`Sửa biến thể — ${dialog.variant.sku}`}
          size="wide"
          onClose={() => setDialog(null)}
          closeDisabled={updateState.isLoading}
        >
          <VariantForm
            initial={dialog.variant}
            inheritedSpecifications={product.data?.specifications}
            pending={updateState.isLoading}
            onClose={() => setDialog(null)}
            onSubmit={(data) => void save(data, dialog.variant)}
          />
        </ManagementDialog>
      )}
      {dialog?.kind === 'matrix' && (
        <ManagementDialog
          title="Tạo ma trận biến thể — Màu sắc × Kích thước"
          size="xl"
          onClose={() => setDialog(null)}
          closeDisabled={matrixState.isLoading}
        >
          <MatrixForm productCode={product.data?.productCode} inheritedSpecifications={product.data?.specifications} pending={matrixState.isLoading} onClose={() => setDialog(null)} onSubmit={saveMatrix} />
        </ManagementDialog>
      )}
      {dialog?.kind === 'delete' && (
        <DeleteVariantDialog
          productId={productId}
          variant={dialog.variant}
          pending={removeState.isLoading || statusState.isLoading}
          onClose={() => setDialog(null)}
          onDelete={deleteConfirmed}
          onDeactivate={() => setDialog({ kind: 'status', variant: dialog.variant })}
        />
      )}
      {dialog?.kind === 'status' && (
        <StatusChangeDialog variant={dialog.variant} pending={statusState.isLoading} onClose={() => setDialog(null)} onConfirm={() => void switchStatus(dialog.variant)} />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  tone,
  active,
  onClick,
}: {
  label: string
  value?: number
  icon: ReactNode
  tone: 'accent' | 'ok' | 'muted' | 'warn'
  active: boolean
  onClick?: () => void
}) {
  const iconTone =
    tone === 'ok'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'muted'
        ? 'bg-slate-100 text-slate-600'
        : tone === 'warn'
          ? 'bg-amber-50 text-amber-700'
          : 'bg-sky-50 text-sky-700'

  const baseClass = `flex w-full items-center gap-3 rounded-lg border bg-white px-3.5 py-3 text-left shadow-2xs transition-colors ${
    active ? 'border-sky-700 ring-1 ring-inset ring-sky-700' : 'border-slate-200'
  } ${onClick ? 'hover:border-sky-700 focus-visible:outline-2 focus-visible:outline-sky-700' : ''}`

  const inner = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconTone}`}>{icon}</span>
      <span className="min-w-0">
        <strong className="block text-xl font-bold leading-tight text-slate-900">{value ?? '—'}</strong>
        <span className="block truncate text-xs font-medium text-slate-600">{label}</span>
      </span>
    </>
  )

  return onClick ? (
    <button type="button" aria-pressed={active} onClick={onClick} className={baseClass}>
      {inner}
    </button>
  ) : (
    <div className={baseClass}>{inner}</div>
  )
}

function Field({
  name,
  label,
  initial,
  type = 'text',
  hint,
  children,
  ...props
}: {
  name: string
  label: string
  initial?: string | number
  type?: string
  hint?: string
  children?: ReactNode
  min?: string
  step?: string
  placeholder?: string
  list?: string
  className?: string
}) {
  return (
    <ManagementFormField id={`variant-${name}`} label={label} hint={hint}>
      {children ?? (
        <input
          id={`variant-${name}`}
          name={name}
          type={type}
          defaultValue={initial ?? ''}
          className={`${managementFieldClass} ${props.className ?? ''}`}
          {...props}
        />
      )}
    </ManagementFormField>
  )
}

function Select({
  name,
  label,
  initial,
  children,
}: {
  name: string
  label: string
  initial: string
  children: ReactNode
}) {
  return (
    <Field name={name} label={label}>
      <select id={`variant-${name}`} name={name} defaultValue={initial} className={managementFieldClass}>
        {children}
      </select>
    </Field>
  )
}

function readNumber(data: FormData, key: string, fallback?: number) {
  const value = String(data.get(key) ?? '').trim()
  return value === '' ? fallback : Number(value)
}

function makeRequest(form: HTMLFormElement, inheritedSpecifications?: Record<string, unknown> | null): VariantUpsertRequest {
  const data = new FormData(form)
  const text = (key: string) => String(data.get(key) ?? '').trim()
  const costPrice = readNumber(data, 'costPrice')
  const sellingPrice = readNumber(data, 'sellingPrice')
  const technicalSpec = {
    ...(inheritedSpecifications ?? {}),
    ...Object.fromEntries(
      Array.from(form.querySelectorAll<HTMLInputElement>('[data-spec-key]'))
        .map((input) => [input.dataset.specKey?.trim() ?? '', input.value.trim()])
        .filter(([key, value]) => key && value),
    ),
  }
  const extraKey = text('extraSpecKey')
  const extraValue = text('extraSpecValue')
  if (extraKey && extraValue) technicalSpec[extraKey] = extraValue

  return {
    sku: text('sku').toUpperCase(),
    variantName: text('variantName'),
    unit: text('unit'),
    conversionRate: readNumber(data, 'conversionRate', 1) ?? 1,
    color: text('color') || undefined,
    size: text('size') || undefined,
    weight: readNumber(data, 'weight', 0) ?? 0,
    technicalSpec: Object.keys(technicalSpec).length ? technicalSpec : undefined,
    costPrice,
    sellingPrice,
    serialTracking: data.get('serialTracking') === 'on',
    status: sellingPrice == null ? 'INACTIVE' : (text('status') as VariantStatus),
    acknowledgeBelowCost: data.get('acknowledgeBelowCost') === 'on',
  }
}

function VariantForm({
  initial,
  inheritedSpecifications,
  pending,
  onClose,
  onSubmit,
}: {
  initial?: ProductVariant
  inheritedSpecifications?: Record<string, unknown> | null
  pending: boolean
  onClose: () => void
  onSubmit: (data: VariantUpsertRequest) => void
}) {
  const spec = { ...(inheritedSpecifications ?? {}), ...(initial?.technicalSpec ?? {}) }
  const [costInput, setCostInput] = useState<string>(initial?.costPrice != null ? String(initial.costPrice) : '')
  const [sellInput, setSellInput] = useState<string>(initial?.sellingPrice != null ? String(initial.sellingPrice) : '')

  const parsedCost = costInput.trim() === '' ? null : Number(costInput)
  const parsedSell = sellInput.trim() === '' ? null : Number(sellInput)
  const validPrices = parsedCost != null && !Number.isNaN(parsedCost) && parsedSell != null && !Number.isNaN(parsedSell)
  const profitDiff = validPrices ? parsedSell - parsedCost : 0
  const profitPct = validPrices && parsedSell > 0 ? Math.round((profitDiff / parsedSell) * 100) : 0
  const isBelowCost = validPrices && profitDiff < 0

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = makeRequest(event.currentTarget, inheritedSpecifications)
    if (
      !data.sku ||
      !data.variantName ||
      !data.unit ||
      !data.conversionRate ||
      data.conversionRate <= 0 ||
      data.weight == null ||
      data.weight < 0 ||
      (data.costPrice != null && data.costPrice < 0) ||
      (data.sellingPrice != null && data.sellingPrice < 0)
    ) {
      toast.error('Vui lòng nhập đầy đủ các trường bắt buộc và đảm bảo giá / hệ số hợp lệ.')
      return
    }
    if (data.costPrice != null && data.sellingPrice != null && data.sellingPrice < data.costPrice && !data.acknowledgeBelowCost) {
      toast.error('Giá bán đang thấp hơn giá nhập. Vui lòng tích xác nhận trước khi lưu.')
      return
    }
    onSubmit(data)
  }

  return (
    <form className="space-y-4 p-5 sm:p-6" onSubmit={submit}>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field
          name="sku"
          label="Mã SKU *"
          initial={initial?.sku}
          placeholder="VD: SKU-NEO-WHT-305"
          hint="Mã hàng nội bộ, duy nhất trên toàn hệ thống."
          className="font-mono uppercase"
        />
        <Field
          name="variantName"
          label="Tên biến thể *"
          initial={initial?.variantName}
          placeholder="VD: Trắng bóng — Tâm xả 305mm"
        />

        <div className="border-t border-slate-100 pt-2 text-[11.5px] font-bold uppercase tracking-wider text-slate-400 sm:col-span-2">
          Thuộc tính &amp; đơn vị tính
        </div>

        <Field name="color" label="Màu sắc" initial={initial?.color ?? ''} placeholder="VD: Trắng bóng" list="variant-color-list" />
        <datalist id="variant-color-list">
          <option value="Trắng bóng" />
          <option value="Đen mờ" />
          <option value="Chrome" />
          <option value="Vàng xước" />
          <option value="Trắng" />
        </datalist>

        <Field name="size" label="Kích thước / Size" initial={initial?.size ?? ''} placeholder="VD: 305mm, Phi 32" list="variant-size-list" />
        <datalist id="variant-size-list">
          <option value="305mm" />
          <option value="400mm" />
          <option value="150mm" />
          <option value="200mm" />
          <option value="Phi 32" />
        </datalist>

        <Select name="unit" label="Đơn vị tính *" initial={initial?.unit ?? 'cái'}>
          <option value="cái">cái</option>
          <option value="bộ">bộ</option>
          <option value="m">mét (m)</option>
          <option value="cuộn">cuộn</option>
          <option value="hộp">hộp</option>
          <option value="thùng">thùng</option>
          <option value="chiếc">chiếc</option>
        </Select>
        <Field
          name="conversionRate"
          type="number"
          label="Hệ số quy đổi *"
          initial={initial?.conversionRate ?? 1}
          min="0.0001"
          step="any"
          hint="Quy đổi về đơn vị cơ bản (mặc định 1)."
        />
        <Field
          name="weight"
          type="number"
          label="Trọng lượng (kg) *"
          initial={initial?.weight ?? 0}
          min="0"
          step="any"
          hint="Khối lượng sản phẩm"
        />
        <Select name="status" label="Trạng thái kinh doanh" initial={initial?.status ?? 'ACTIVE'}>
          <option value="ACTIVE">Đang kinh doanh</option>
          <option value="INACTIVE">Ngừng kinh doanh</option>
        </Select>
      </div>

      <fieldset className="grid gap-3.5 border-t border-slate-100 pt-3.5 sm:grid-cols-2">
        <legend className="px-1 text-[11.5px] font-bold uppercase tracking-wider text-slate-400">
          Thông số kỹ thuật
        </legend>
        {Object.entries(spec).map(([key, value]) => (
          <Field key={key} name={`spec-${key}`} label={key} initial={String(value ?? '')}>
            <input id={`variant-spec-${key}`} data-spec-key={key} defaultValue={String(value ?? '')} className={managementFieldClass} />
          </Field>
        ))}
        {Object.keys(spec).length === 0 && <p className="text-sm text-slate-500 sm:col-span-2">Sản phẩm gốc chưa có thông số kỹ thuật. Bạn có thể bổ sung tại quản lý sản phẩm.</p>}
        <Field name="extraSpecKey" label="Thông số riêng mới" placeholder="VD: Công suất" />
        <Field name="extraSpecValue" label="Giá trị thông số" placeholder="VD: 800 W" />
      </fieldset>

      <fieldset className="space-y-3 border-t border-slate-100 pt-3.5">
        <legend className="px-1 text-[11.5px] font-bold uppercase tracking-wider text-slate-400">
          Giá nhập &amp; Giá bán niêm yết
        </legend>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <ManagementFormField id="variant-costPrice" label="Giá nhập (VNĐ)">
            <input
              id="variant-costPrice"
              name="costPrice"
              type="number"
              min="0"
              step="1"
              value={costInput}
              onChange={(event) => setCostInput(event.target.value)}
              placeholder="0"
              className={`${managementFieldClass} text-right font-semibold`}
            />
          </ManagementFormField>
          <ManagementFormField
            id="variant-sellingPrice"
            label="Giá bán niêm yết (VNĐ)"
            hint="Để trống tự đặt trạng thái Ngừng kinh doanh."
          >
            <input
              id="variant-sellingPrice"
              name="sellingPrice"
              type="number"
              min="0"
              step="1"
              value={sellInput}
              onChange={(event) => setSellInput(event.target.value)}
              placeholder="Để trống = chưa bán"
              className={`${managementFieldClass} text-right font-semibold`}
            />
          </ManagementFormField>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-700">
          {validPrices ? (
            <span>
              Lãi dự kiến mỗi đơn vị:{' '}
              <strong className={`text-sm ${profitDiff < 0 ? 'text-red-700' : 'text-sky-800'}`}>
                {profitDiff < 0 ? '−' : '+'}
                {new Intl.NumberFormat('vi-VN').format(Math.abs(profitDiff))} ₫
              </strong>{' '}
              <span className="text-xs text-slate-500">(biên lãi {profitPct}% trên giá bán)</span>
            </span>
          ) : (
            <span className="text-slate-500">Nhập cả giá nhập và giá bán để xem lãi dự kiến.</span>
          )}
        </div>

        {isBelowCost && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-400 bg-amber-50 p-3 text-[13px] text-amber-950">
            <input
              name="acknowledgeBelowCost"
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-500 accent-amber-700"
            />
            <span>
              <strong className="block font-bold text-amber-900">
                Cảnh báo: Giá bán đang thấp hơn giá nhập (lỗ{' '}
                {new Intl.NumberFormat('vi-VN').format(Math.abs(profitDiff))} ₫/đơn vị)
              </strong>
              Tôi xác nhận giá bán thấp hơn giá nhập và đồng ý lưu mức giá này.
            </span>
          </label>
        )}
      </fieldset>

      <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 px-3.5 py-2.5 text-[13px] text-slate-800">
        <input
          name="serialTracking"
          type="checkbox"
          defaultChecked={initial?.serialTracking}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 accent-sky-700"
        />
        <span>
          <strong className="block font-semibold text-slate-900">Theo dõi Serial từng chiếc</strong>
          <span className="block text-xs text-slate-500">
            Bật cho hàng giá trị cao — số serial được ghi khi xuất kho &amp; kích hoạt bảo hành.
          </span>
        </span>
      </label>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className={secondaryButton} disabled={pending} onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className={primaryButton} disabled={pending}>
          {pending ? 'Đang lưu...' : initial ? 'Lưu thay đổi' : 'Lưu biến thể'}
        </button>
      </div>
    </form>
  )
}

function slug(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
}

type MatrixRowItem = {
  id: string
  color: string
  size: string
  sku: string
  costPrice: string
  sellingPrice: string
}

const DEFAULT_COLORS = ['Trắng bóng', 'Đen mờ', 'Chrome', 'Vàng xước']
const DEFAULT_SIZES = ['150mm', '200mm', '305mm', '400mm']

function MatrixForm({
  productCode,
  inheritedSpecifications,
  pending,
  onClose,
  onSubmit,
}: {
  productCode?: string
  inheritedSpecifications?: Record<string, unknown> | null
  pending: boolean
  onClose: () => void
  onSubmit: (rows: VariantUpsertRequest[]) => void
}) {
  const [colorOptions, setColorOptions] = useState<string[]>(DEFAULT_COLORS)
  const [sizeOptions, setSizeOptions] = useState<string[]>(DEFAULT_SIZES)
  const [selectedColors, setSelectedColors] = useState<string[]>(['Trắng bóng', 'Đen mờ'])
  const [selectedSizes, setSelectedSizes] = useState<string[]>(['150mm', '200mm'])
  const [newColor, setNewColor] = useState('')
  const [newSize, setNewSize] = useState('')
  const [unit, setUnit] = useState('cái')
  const [bulkCost, setBulkCost] = useState('')
  const [bulkSell, setBulkSell] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [serialTracking, setSerialTracking] = useState(false)

  const buildCombinations = (colors: string[], sizes: string[], cost = bulkCost, sell = bulkSell): MatrixRowItem[] =>
    colors.flatMap((color) =>
      sizes.map((size) => ({
        id: `${color}::${size}`,
        color,
        size,
        sku: `${productCode ? slug(productCode) : 'SKU'}-${slug(color)}-${slug(size)}`,
        costPrice: cost,
        sellingPrice: sell,
      })),
    )

  const [rows, setRows] = useState<MatrixRowItem[]>(() => buildCombinations(['Trắng bóng', 'Đen mờ'], ['150mm', '200mm'], '', ''))

  const toggleColor = (color: string) => {
    const next = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color]
    setSelectedColors(next)
    setRows(buildCombinations(next, selectedSizes))
  }

  const toggleSize = (size: string) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size]
    setSelectedSizes(next)
    setRows(buildCombinations(selectedColors, next))
  }

  const addColorChip = () => {
    const trimmed = newColor.trim()
    if (!trimmed) return
    const nextOptions = colorOptions.includes(trimmed) ? colorOptions : [...colorOptions, trimmed]
    const nextSelected = selectedColors.includes(trimmed) ? selectedColors : [...selectedColors, trimmed]
    setColorOptions(nextOptions)
    setSelectedColors(nextSelected)
    setNewColor('')
    setRows(buildCombinations(nextSelected, selectedSizes))
  }

  const addSizeChip = () => {
    const trimmed = newSize.trim()
    if (!trimmed) return
    const nextOptions = sizeOptions.includes(trimmed) ? sizeOptions : [...sizeOptions, trimmed]
    const nextSelected = selectedSizes.includes(trimmed) ? selectedSizes : [...selectedSizes, trimmed]
    setSizeOptions(nextOptions)
    setSelectedSizes(nextSelected)
    setNewSize('')
    setRows(buildCombinations(selectedColors, nextSelected))
  }

  const applyBulkCost = (value: string) => {
    setBulkCost(value)
    setRows((prev) => prev.map((row) => ({ ...row, costPrice: value })))
  }

  const applyBulkSell = (value: string) => {
    setBulkSell(value)
    setRows((prev) => prev.map((row) => ({ ...row, sellingPrice: value })))
  }

  const updateRow = (id: string, field: keyof MatrixRowItem, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  const duplicateSkus = useMemo(() => {
    const counts = new Map<string, number>()
    rows.forEach((row) => {
      const normalized = row.sku.trim().toUpperCase()
      if (normalized) counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
    })
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([sku]) => sku))
  }, [rows])

  const hasBelowCost = useMemo(
    () =>
      rows.some((row) => {
        if (row.sellingPrice.trim() === '') return false
        const sell = Number(row.sellingPrice)
        const cost = row.costPrice.trim() === '' ? 0 : Number(row.costPrice)
        return !Number.isNaN(sell) && !Number.isNaN(cost) && sell < cost
      }),
    [rows],
  )

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (rows.length === 0) {
      toast.error('Hãy chọn ít nhất 1 màu sắc và 1 kích thước để tạo tổ hợp.')
      return
    }
    if (rows.some((row) => !row.sku.trim())) {
      toast.error('Mỗi tổ hợp phải có mã SKU.')
      return
    }
    if (duplicateSkus.size > 0) {
      toast.error('Phát hiện mã SKU trùng lặp trong bảng tổ hợp. Vui lòng sửa trước khi lưu.')
      return
    }
    if (hasBelowCost && !acknowledged) {
      toast.error('Hãy xác nhận cảnh báo có dòng giá bán thấp hơn giá nhập.')
      return
    }

    const variants: VariantUpsertRequest[] = rows.map((row) => {
      const costPrice = row.costPrice.trim() === '' ? 0 : Number(row.costPrice)
      const sellingPrice = row.sellingPrice.trim() === '' ? undefined : Number(row.sellingPrice)
      return {
        sku: row.sku.trim().toUpperCase(),
        variantName: `${row.color} — ${row.size}`,
        unit,
        conversionRate: 1,
        color: row.color,
        size: row.size,
        weight: 0,
        technicalSpec: inheritedSpecifications ?? undefined,
        serialTracking,
        costPrice,
        sellingPrice,
        status: sellingPrice == null ? 'INACTIVE' : 'ACTIVE',
        acknowledgeBelowCost: acknowledged,
      }
    })

    onSubmit(variants)
  }

  return (
    <form className="space-y-4 p-5 sm:p-6" onSubmit={submit}>
      <p className="text-[13px] text-slate-600">
        Chọn các giá trị thuộc tính để sinh tổ hợp. Mã SKU được gợi ý tự động, có thể sửa tay hoặc xóa bớt từng dòng.
      </p>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={serialTracking} onChange={(event) => setSerialTracking(event.target.checked)} className="h-4 w-4 accent-sky-700" />
        Theo dõi Serial cho các SKU được tạo từ ma trận
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-700">Thuộc tính 1 — Màu sắc</span>
          <div className="flex flex-wrap gap-1.5">
            {colorOptions.map((color) => {
              const active = selectedColors.includes(color)
              return (
                <button
                  key={color}
                  type="button"
                  onClick={() => toggleColor(color)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-sky-700 bg-sky-700 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-sky-700'
                  }`}
                >
                  {color}
                </button>
              )
            })}
          </div>
          <div className="flex gap-1.5">
            <input
              value={newColor}
              onChange={(event) => setNewColor(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addColorChip()
                }
              }}
              placeholder="Thêm màu khác..."
              className={managementFieldClass}
            />
            <button type="button" onClick={addColorChip} className={secondaryButton} style={{ margin: '4px 0px 0px' }}>
              Thêm
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-700">Thuộc tính 2 — Kích thước</span>
          <div className="flex flex-wrap gap-1.5">
            {sizeOptions.map((size) => {
              const active = selectedSizes.includes(size)
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    active
                      ? 'border-sky-700 bg-sky-700 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-sky-700'
                  }`}
                >
                  {size}
                </button>
              )
            })}
          </div>
          <div className="flex gap-1.5">
            <input
              value={newSize}
              onChange={(event) => setNewSize(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  addSizeChip()
                }
              }}
              placeholder="Thêm size khác..."
              className={managementFieldClass}
            />
            <button type="button" onClick={addSizeChip} className={secondaryButton} style={{ margin: '4px 0px 0px' }}>
              Thêm
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <ManagementFormField id="matrix-unit" label="Đơn vị tính">
          <select id="matrix-unit" value={unit} onChange={(event) => setUnit(event.target.value)} className={managementFieldClass}>
            <option value="cái">cái</option>
            <option value="bộ">bộ</option>
            <option value="m">mét (m)</option>
            <option value="cuộn">cuộn</option>
          </select>
        </ManagementFormField>
        <ManagementFormField id="matrix-bulk-cost" label="Giá nhập áp cho tất cả (VNĐ)">
          <input
            id="matrix-bulk-cost"
            type="number"
            min="0"
            value={bulkCost}
            onChange={(event) => applyBulkCost(event.target.value)}
            placeholder="0"
            className={`${managementFieldClass} text-right font-semibold`}
          />
        </ManagementFormField>
        <ManagementFormField id="matrix-bulk-sell" label="Giá bán áp cho tất cả (VNĐ)">
          <input
            id="matrix-bulk-sell"
            type="number"
            min="0"
            value={bulkSell}
            onChange={(event) => applyBulkSell(event.target.value)}
            placeholder="Để trống = chưa bán"
            className={`${managementFieldClass} text-right font-semibold`}
          />
        </ManagementFormField>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-slate-900">Các tổ hợp sẽ tạo: {rows.length} biến thể</span>
        <button
          type="button"
          onClick={() => setRows(buildCombinations(selectedColors, selectedSizes))}
          className="text-xs font-semibold text-sky-700 hover:text-sky-800"
        >
          Sinh lại danh sách
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-[13px]">
          <thead className="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <tr>
              <th className="px-3 py-2">Màu sắc</th>
              <th className="px-3 py-2">Kích thước</th>
              <th className="px-3 py-2">Mã SKU *</th>
              <th className="px-3 py-2 text-right">Giá nhập</th>
              <th className="px-3 py-2 text-right">Giá bán</th>
              <th className="w-9 px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-xs text-slate-500">
                  Hãy chọn ít nhất 1 màu sắc và 1 kích thước.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isDup = duplicateSkus.has(row.sku.trim().toUpperCase())
                return (
                  <tr key={row.id} className={isDup ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.color}</td>
                    <td className="px-3 py-2 text-slate-700">{row.size}</td>
                    <td className="px-3 py-2">
                      <input
                        value={row.sku}
                        onChange={(event) => updateRow(row.id, 'sku', event.target.value)}
                        className={`w-44 rounded-md border px-2 py-1 font-mono text-xs uppercase ${
                          isDup ? 'border-red-600 bg-white text-red-800' : 'border-slate-300 bg-white'
                        }`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={row.costPrice}
                        onChange={(event) => updateRow(row.id, 'costPrice', event.target.value)}
                        placeholder="0"
                        className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-xs font-semibold"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={row.sellingPrice}
                        onChange={(event) => updateRow(row.id, 'sellingPrice', event.target.value)}
                        placeholder="Chưa bán"
                        className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-xs font-semibold"
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        title="Bỏ tổ hợp này"
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {duplicateSkus.size > 0 && (
        <p role="alert" className="text-xs font-semibold text-red-700">
          Phát hiện mã SKU trùng lặp trong danh sách ({Array.from(duplicateSkus).join(', ')}). Vui lòng chỉnh sửa trước khi lưu.
        </p>
      )}

      {hasBelowCost && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-amber-400 bg-amber-50 p-3 text-[13px] text-amber-950">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-500 accent-amber-700"
          />
          <span>Tôi xác nhận các dòng có giá bán thấp hơn giá nhập và đồng ý tạo biến thể.</span>
        </label>
      )}

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className={secondaryButton} disabled={pending} onClick={onClose}>
          Hủy
        </button>
        <button type="submit" className={primaryButton} disabled={pending}>
          {pending ? 'Đang tạo...' : 'Xác nhận tạo biến thể'}
        </button>
      </div>
    </form>
  )
}

function StatusChangeDialog({ variant, pending, onClose, onConfirm }: { variant: ProductVariant; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  const deactivating = variant.status === 'ACTIVE'
  return (
    <ManagementDialog title={deactivating ? 'Ngừng kinh doanh biến thể' : 'Kích hoạt kinh doanh biến thể'} onClose={onClose} closeDisabled={pending}>
      <div className="space-y-4 p-5 sm:p-6">
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          {deactivating ? <>SKU <strong className="font-mono">{variant.sku}</strong> sẽ không còn được thêm vào giỏ hàng, báo giá và đơn hàng mới. Lịch sử giao dịch vẫn được giữ nguyên.</> : <>SKU <strong className="font-mono">{variant.sku}</strong> sẽ được phép bán trở lại.</>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" className={secondaryButton} disabled={pending} onClick={onClose}>Hủy</button>
          <button type="button" className={primaryButton} disabled={pending} onClick={onConfirm}>{pending ? 'Đang cập nhật...' : deactivating ? 'Xác nhận ngừng kinh doanh' : 'Xác nhận kích hoạt'}</button>
        </div>
      </div>
    </ManagementDialog>
  )
}

function AttributeSummary({ item }: { item: ProductVariant }) {
  const basic = [
    item.color,
    item.size,
    item.weight != null && item.weight > 0 ? `${item.weight} kg` : null,
  ].filter(Boolean)

  const specEntries = Object.entries(item.technicalSpec ?? {}).filter(
    ([, value]) => value != null && String(value).trim() !== '',
  )
  const visibleSpecs = specEntries.slice(0, 2)
  const hiddenCount = specEntries.length - visibleSpecs.length
  const fullTitle = [
    basic.join(' · '),
    ...specEntries.map(([k, v]) => `${k}: ${String(v)}`),
  ]
    .filter(Boolean)
    .join('\n')

  return (
    <div className="space-y-1 text-left" title={fullTitle || undefined}>
      <p className="line-clamp-1 font-medium text-slate-800">{basic.join(' · ') || '—'}</p>
      {specEntries.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {visibleSpecs.map(([key, value]) => (
            <span
              key={key}
              className="inline-block max-w-[140px] truncate rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
            >
              {key}: {String(value)}
            </span>
          ))}
          {hiddenCount > 0 && (
            <span className="inline-block rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700">
              +{hiddenCount} thông số
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function DeleteVariantDialog({
  productId,
  variant,
  pending,
  onClose,
  onDelete,
  onDeactivate,
}: {
  productId: string
  variant: ProductVariant
  pending: boolean
  onClose: () => void
  onDelete: (item: ProductVariant, reason: string) => void
  onDeactivate: () => void
}) {
  const eligibility = useGetVariantDeletionEligibilityQuery({ productId, variantId: variant.id })
  const [step, setStep] = useState<1 | 2>(1)
  const [reason, setReason] = useState('')

  return (
    <ManagementDialog title={`Xóa vĩnh viễn biến thể — ${variant.sku}`} onClose={onClose} closeDisabled={pending}>
      <div className="space-y-4 p-5 sm:p-6">
        {eligibility.isLoading && <p className="text-sm text-slate-600">Đang kiểm tra điều kiện xóa...</p>}
        {eligibility.isError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {apiError(eligibility.error)}
          </p>
        )}

        {eligibility.data &&
          (eligibility.data.eligible ? (
            step === 1 ? (
              <>
                <p className="text-[13.5px] leading-relaxed text-slate-700">
                  Biến thể <strong className="font-mono text-slate-900">{variant.sku}</strong> —{' '}
                  <strong className="text-slate-900">{variant.variantName}</strong> sẽ bị{' '}
                  <strong className="text-red-700">xóa vĩnh viễn</strong> khỏi hệ thống và không thể khôi phục qua giao
                  diện. Sau khi xóa, mã SKU <strong className="font-mono text-slate-900">{variant.sku}</strong> sẽ được
                  giải phóng và có thể dùng lại.
                </p>

                <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px] text-slate-700">
                  <p className="font-bold text-slate-900">Điều kiện xóa — đã kiểm tra:</p>
                  <p className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
                    <span>
                      Tồn kho bằng <strong>0</strong> (tồn thực tế: 0, đang đặt giữ: 0)
                    </span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
                    <span>Chưa có chứng từ nào tham chiếu (nhập, xuất, báo giá, đơn hàng, hóa đơn, kiểm kê)</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden="true" />
                    <span>Không phải thành phần của combo đang kinh doanh</span>
                  </p>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" className={secondaryButton} disabled={pending} onClick={onClose}>
                    Hủy bỏ
                  </button>
                  <button type="button" className={dangerButton} disabled={pending} onClick={() => setStep(2)}>
                    Tôi hiểu, tiếp tục
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] text-amber-950">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                  <span>
                    Xác nhận lần cuối: xóa vĩnh viễn biến thể <strong className="font-mono">{variant.sku}</strong>? Thao
                    tác thực hiện ngay và không thể hoàn tác.
                  </span>
                </div>

                <ManagementFormField
                  id="variant-delete-reason"
                  label="Lý do xóa *"
                  hint="Lý do và thông tin biến thể trước khi xóa sẽ được lưu trong Nhật ký hoạt động."
                >
                  <textarea
                    id="variant-delete-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="VD: Tạo nhầm khi nhập dữ liệu ban đầu"
                    rows={3}
                    className={managementFieldClass}
                  />
                </ManagementFormField>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" className={secondaryButton} disabled={pending} onClick={() => setStep(1)}>
                    Quay lại
                  </button>
                  <button
                    type="button"
                    className={dangerButton}
                    disabled={pending || !reason.trim()}
                    onClick={() => onDelete(variant, reason.trim())}
                  >
                    {pending ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                  </button>
                </div>
              </>
            )
          ) : (
            <Blocked
              usage={eligibility.data}
              canDeactivate={variant.status === 'ACTIVE'}
              pending={pending}
              onClose={onClose}
              onDeactivate={onDeactivate}
            />
          ))}
      </div>
    </ManagementDialog>
  )
}

function Blocked({
  usage,
  canDeactivate,
  pending,
  onClose,
  onDeactivate,
}: {
  usage: VariantDeletionEligibility
  canDeactivate: boolean
  pending: boolean
  onClose: () => void
  onDeactivate: () => void
}) {
  const items = [
    ['Tồn kho', usage.onHandQty],
    ['Đang giữ', usage.reservedQty],
    ['Phiếu nhập', usage.goodsReceiptCount],
    ['Thẻ kho', usage.stockMovementCount],
    ['Phiếu xuất', usage.dispatchCount],
    ['Báo giá', usage.quotationCount],
    ['Đơn hàng', usage.orderCount],
    ['Hóa đơn', usage.invoiceCount],
    ['Kiểm kê', usage.stockCountItemCount],
    ['Combo đang bán', usage.activeBundleCount + usage.activeBundleOptionCount],
    ['Đơn mua', usage.purchaseOrderCount],
    ['Giao hàng', usage.deliveryItemCount],
  ].filter(([, value]) => Number(value) > 0)

  return (
    <>
      <div className="rounded-lg bg-red-50 p-3 text-[13px] text-red-800">
        <strong className="block font-bold">Không thể xóa biến thể này — SKU_007</strong>
        Chỉ xóa được biến thể tạo nhầm, chưa từng phát sinh giao dịch. Biến thể này đang có các phát sinh sau:
      </div>

      <ul className="grid grid-cols-2 gap-2 text-xs text-slate-700">
        {items.map(([label, value]) => (
          <li key={String(label)} className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
            <span>{label}</span>
            <strong className="text-slate-900">{String(value)}</strong>
          </li>
        ))}
      </ul>

      <p className="text-xs text-slate-600">
        Nếu SKU này ngừng bán, hãy chọn <strong>Ngừng kinh doanh</strong> để ẩn khỏi bán hàng, giữ nguyên lịch sử và có
        thể kích hoạt lại bất cứ lúc nào.
      </p>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" className={secondaryButton} disabled={pending} onClick={onClose}>
          Đóng
        </button>
        {canDeactivate && (
          <button type="button" className={primaryButton} disabled={pending} onClick={onDeactivate}>
            <CircleOff className="h-4 w-4" aria-hidden="true" />
            Ngừng kinh doanh thay thế
          </button>
        )}
      </div>
    </>
  )
}
