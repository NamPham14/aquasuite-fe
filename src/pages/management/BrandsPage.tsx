import { useEffect, useState } from 'react'
import { Plus, Tags } from 'lucide-react'
import { toast } from 'sonner'
import {
  BrandForm,
  CatalogDeleteDialog,
  CatalogMobileList,
  CatalogPagination,
  CatalogStatusBadge,
  getCatalogErrorState,
  useCatalogListState,
  useCreateBrandMutation,
  useDeleteBrandMutation,
  useGetBrandsQuery,
  useUpdateBrandMutation,
  type Brand,
  type CatalogDialogMode,
  type ValidBrandFormValues,
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
  'inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50'
const primaryButton =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600'

/** Chế độ hộp thoại và thương hiệu được chọn; tạo mới không cần bản ghi. */
interface BrandDialogState {
  mode: CatalogDialogMode
  item?: Brand
}

/** Điều phối danh sách, bộ lọc và các thao tác quản lý thương hiệu qua BE. */
export function BrandsPage() {
  const filters = useCatalogListState()
  const { page, setPage } = filters
  const list = useGetBrandsQuery(filters.query)
  const [createBrand, createState] = useCreateBrandMutation()
  const [updateBrand, updateState] = useUpdateBrandMutation()
  const [deleteBrand, deleteState] = useDeleteBrandMutation()
  const [dialog, setDialog] = useState<BrandDialogState | null>(null)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [deleteError, setDeleteError] = useState('')
  const data = list.data
  const rows = data?.items ?? []

  useEffect(() => {
    if (data && data.totalPages > 0 && page >= data.totalPages) {
      setPage(data.totalPages - 1)
    }
  }, [data, page, setPage])

  /** Mở hộp thoại mới và xóa lỗi của thao tác trước. */
  function openDialog(mode: CatalogDialogMode, item?: Brand) {
    setFormError('')
    setFieldErrors({})
    setDeleteError('')
    setDialog({ mode, item })
  }

  /** Tạo hoặc cập nhật thương hiệu; chỉ gửi mã khi tạo vì mã không thể thay đổi. */
  async function saveBrand(values: ValidBrandFormValues) {
    setFormError('')
    setFieldErrors({})
    try {
      if (dialog?.mode === 'create') {
        await createBrand({
          code: values.code,
          name: values.name,
          description: values.description || null,
          status: values.status,
        }).unwrap()
        toast.success('Đã tạo thương hiệu.')
      } else if (dialog?.mode === 'edit' && dialog.item) {
        await updateBrand({
          id: dialog.item.id,
          data: {
            name: values.name,
            description: values.description || null,
            status: values.status,
          },
        }).unwrap()
        toast.success('Đã cập nhật thương hiệu.')
      }
      setDialog(null)
    } catch (error) {
      const state = getCatalogErrorState(error)
      setFormError(state.message)
      setFieldErrors(state.fields)
    }
  }

  /** Gửi yêu cầu xóa sau xác nhận và giữ lỗi trong hộp thoại nếu BE từ chối. */
  async function confirmDelete() {
    if (dialog?.mode !== 'delete' || !dialog.item || deleteState.isLoading) return
    setDeleteError('')
    try {
      await deleteBrand(dialog.item.id).unwrap()
      setDialog(null)
      toast.success('Đã xóa thương hiệu.')
    } catch (error) {
      setDeleteError(getCatalogErrorState(error).message)
    }
  }

  const columns: ManagementTableColumn<Brand>[] = [
    { key: 'code', header: 'Mã thương hiệu', cell: (item) => <span className="font-medium text-slate-900">{item.code}</span> },
    { key: 'name', header: 'Tên thương hiệu', cell: (item) => item.name },
    { key: 'status', header: 'Trạng thái', cell: (item) => <CatalogStatusBadge status={item.status} /> },
    {
      key: 'actions',
      header: 'Thao tác',
      cell: (item) => (
        <ManagementRowActions actions={[
          { variant: 'view', label: 'Xem', ariaLabel: `Xem ${item.name}`, onClick: () => openDialog('view', item) },
          { variant: 'edit', label: 'Sửa', ariaLabel: `Sửa ${item.name}`, onClick: () => openDialog('edit', item) },
          { variant: 'delete', label: 'Xóa', ariaLabel: `Xóa ${item.name}`, onClick: () => openDialog('delete', item) },
        ]} />
      ),
    },
  ]

  const listError = list.isError ? getCatalogErrorState(list.error).message : ''
  return (
    <div className="space-y-5">
      <ManagementPageHeader
        title="Quản lý Thương hiệu"
        description="Quản lý mã, tên và trạng thái thương hiệu sản phẩm"
        breadcrumb="Thương hiệu"
        group="Quản lý danh mục"
        icon={<Tags className="h-6 w-6" />}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Mã thương hiệu là khóa ổn định và không thể sửa sau khi tạo.</p>
        <button type="button" className={primaryButton} onClick={() => openDialog('create')}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Thêm thương hiệu
        </button>
      </div>
      <ManagementFilterBar>
        <ManagementSearch
          id="brand-search"
          label="Tìm kiếm"
          value={filters.search}
          onChange={filters.setSearch}
          placeholder="Tìm theo mã hoặc tên..."
          disabled={list.isLoading}
        />
        <ManagementSelect id="brand-status-filter" label="Trạng thái" value={filters.status} onChange={filters.setStatus} disabled={list.isLoading}>
          <option value="">Tất cả</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </ManagementSelect>
        <ManagementSelect id="brand-sort" label="Sắp xếp theo" value={filters.sortBy} onChange={filters.setSortBy} disabled={list.isLoading}>
          <option value="code">Mã</option>
          <option value="name">Tên</option>
          <option value="status">Trạng thái</option>
        </ManagementSelect>
        <ManagementSelect id="brand-direction" label="Thứ tự" value={filters.direction} onChange={filters.setDirection} disabled={list.isLoading}>
          <option value="asc">Tăng dần</option>
          <option value="desc">Giảm dần</option>
        </ManagementSelect>
        <button type="button" className={secondaryButton} onClick={filters.reset} disabled={list.isLoading}>Đặt lại</button>
      </ManagementFilterBar>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-busy={list.isFetching}>
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <h2 id="brand-list" className="text-base font-semibold text-slate-900">Danh sách thương hiệu</h2>
          {list.isFetching && !list.isLoading && <span className="text-xs text-slate-500">Đang cập nhật...</span>}
        </div>
        {listError && (
          <div role="alert" className="mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-rose-50 p-3 text-sm text-rose-800">
            <span>{listError}</span>
            <button type="button" className={secondaryButton} onClick={() => void list.refetch()}>Thử lại</button>
          </div>
        )}
        <div className="hidden sm:block [&_table]:text-sm">
          <ManagementTable
            columns={columns}
            rows={rows}
            rowKey={(item) => item.id}
            labelledBy="brand-list"
            emptyMessage={list.isLoading ? 'Đang tải thương hiệu...' : listError ? 'Chưa thể tải dữ liệu.' : 'Không tìm thấy thương hiệu phù hợp.'}
          />
        </div>
        <CatalogMobileList
          rows={rows}
          rowKey={(item) => item.id}
          emptyMessage={list.isLoading ? 'Đang tải thương hiệu...' : listError ? 'Chưa thể tải dữ liệu.' : 'Không tìm thấy thương hiệu phù hợp.'}
          renderRow={(item) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{item.code}</p>
                </div>
                <CatalogStatusBadge status={item.status} />
              </div>
              {item.description && <p className="line-clamp-2 text-sm text-slate-600">{item.description}</p>}
              <ManagementRowActions actions={[
                { variant: 'view', label: 'Xem', ariaLabel: `Xem ${item.name}`, onClick: () => openDialog('view', item) },
                { variant: 'edit', label: 'Sửa', ariaLabel: `Sửa ${item.name}`, onClick: () => openDialog('edit', item) },
                { variant: 'delete', label: 'Xóa', ariaLabel: `Xóa ${item.name}`, onClick: () => openDialog('delete', item) },
              ]} />
            </div>
          )}
        />
        <CatalogPagination
          page={data?.page ?? filters.page}
          totalPages={data?.totalPages ?? 0}
          totalElements={data?.totalElements ?? 0}
          noun="thương hiệu"
          disabled={list.isFetching}
          onPageChange={filters.setPage}
        />
      </section>
      {dialog && dialog.mode !== 'delete' && (
        <ManagementDialog
          title={dialog.mode === 'create' ? 'Thêm thương hiệu' : dialog.mode === 'edit' ? 'Sửa thương hiệu' : 'Chi tiết thương hiệu'}
          onClose={() => setDialog(null)}
          closeDisabled={createState.isLoading || updateState.isLoading}
        >
          <BrandForm
            key={`${dialog.mode}-${dialog.item?.id ?? 'new'}`}
            mode={dialog.mode}
            brand={dialog.item}
            pending={createState.isLoading || updateState.isLoading}
            apiError={formError}
            apiFieldErrors={fieldErrors}
            onClose={() => setDialog(null)}
            onSubmit={saveBrand}
          />
        </ManagementDialog>
      )}
      {dialog?.mode === 'delete' && dialog.item && (
        <CatalogDeleteDialog
          kind="thương hiệu"
          code={dialog.item.code}
          name={dialog.item.name}
          pending={deleteState.isLoading}
          error={deleteError}
          onClose={() => setDialog(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </div>
  )
}
