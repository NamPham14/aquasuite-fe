import { useEffect, useState } from 'react'
import { FolderTree, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  CategoryForm,
  CatalogDeleteDialog,
  CatalogMobileList,
  CatalogPagination,
  CatalogStatusBadge,
  getCatalogErrorState,
  useCatalogListState,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useGetCategoryOptionsQuery,
  useUpdateCategoryMutation,
  type CatalogDialogMode,
  type Category,
  type ValidCategoryFormValues,
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

/** Chế độ hộp thoại và danh mục được chọn; tạo mới không cần bản ghi. */
interface CategoryDialogState {
  mode: CatalogDialogMode
  item?: Category
}

/** Định dạng thời điểm BE trả về theo ngôn ngữ Việt Nam; giá trị lỗi hiện dấu gạch. */
function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

/** Điều phối danh sách, bộ lọc và thao tác danh mục, bao gồm quan hệ cha–con. */
export function CategoriesPage() {
  const filters = useCatalogListState()
  const { page, setPage } = filters
  const list = useGetCategoriesQuery(filters.query)
  const optionsQuery = useGetCategoryOptionsQuery()
  const [createCategory, createState] = useCreateCategoryMutation()
  const [updateCategory, updateState] = useUpdateCategoryMutation()
  const [deleteCategory, deleteState] = useDeleteCategoryMutation()
  const [dialog, setDialog] = useState<CategoryDialogState | null>(null)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [deleteError, setDeleteError] = useState('')
  const data = list.data
  const rows = data?.items ?? []
  const options = optionsQuery.data ?? []
  const optionNames = new Map(options.map((option) => [option.categoryId, `${option.categoryCode} — ${option.categoryName}`]))

  useEffect(() => {
    if (data && data.totalPages > 0 && page >= data.totalPages) {
      setPage(data.totalPages - 1)
    }
  }, [data, page, setPage])

  /** Mở hộp thoại mới và xóa lỗi của thao tác trước. */
  function openDialog(mode: CatalogDialogMode, item?: Category) {
    setFormError('')
    setFieldErrors({})
    setDeleteError('')
    setDialog({ mode, item })
  }

  /** Tạo hoặc cập nhật danh mục; BE chịu trách nhiệm kiểm tra vòng lặp phân cấp. */
  async function saveCategory(values: ValidCategoryFormValues) {
    setFormError('')
    setFieldErrors({})
    try {
      if (dialog?.mode === 'create') {
        await createCategory({
          code: values.code,
          name: values.name,
          description: values.description || null,
          status: values.status,
          parentId: values.parentId || null,
        }).unwrap()
        toast.success('Đã tạo danh mục.')
      } else if (dialog?.mode === 'edit' && dialog.item) {
        await updateCategory({
          id: dialog.item.id,
          data: {
            name: values.name,
            description: values.description || null,
            status: values.status,
            parentId: values.parentId || null,
          },
        }).unwrap()
        toast.success('Đã cập nhật danh mục.')
      }
      setDialog(null)
    } catch (error) {
      const state = getCatalogErrorState(error)
      setFormError(state.message)
      setFieldErrors(state.fields)
    }
  }

  /** Gửi yêu cầu xóa sau xác nhận và hiển thị xung đột quan hệ do BE trả về. */
  async function confirmDelete() {
    if (dialog?.mode !== 'delete' || !dialog.item || deleteState.isLoading) return
    setDeleteError('')
    try {
      await deleteCategory(dialog.item.id).unwrap()
      setDialog(null)
      toast.success('Đã xóa danh mục.')
    } catch (error) {
      setDeleteError(getCatalogErrorState(error).message)
    }
  }

  const columns: ManagementTableColumn<Category>[] = [
    { key: 'code', header: 'Mã danh mục', cell: (item) => <span className="font-medium text-slate-900">{item.code}</span> },
    { key: 'name', header: 'Tên danh mục', cell: (item) => item.name },
    {
      key: 'parent',
      header: 'Danh mục cha',
      cell: (item) => item.parentId ? optionNames.get(item.parentId) ?? `ID ${item.parentId.slice(0, 8)}…` : 'Danh mục gốc',
    },
    { key: 'status', header: 'Trạng thái', cell: (item) => <CatalogStatusBadge status={item.status} /> },
    { key: 'updatedAt', header: 'Cập nhật', cell: (item) => formatDateTime(item.updatedAt) },
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
  const optionsError = optionsQuery.isError ? getCatalogErrorState(optionsQuery.error).message : ''
  return (
    <div className="space-y-5">
      <ManagementPageHeader
        title="Quản lý Danh mục"
        description="Quản lý danh mục sản phẩm và quan hệ phân cấp"
        breadcrumb="Danh mục"
        group="Quản lý danh mục"
        icon={<FolderTree className="h-6 w-6" />}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Danh sách dạng phẳng; máy chủ kiểm tra tên trùng, vòng lặp và quan hệ cha con.</p>
        <button type="button" className={primaryButton} onClick={() => openDialog('create')}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Thêm danh mục
        </button>
      </div>
      <ManagementFilterBar>
        <ManagementSearch
          id="category-search"
          label="Tìm kiếm"
          value={filters.search}
          onChange={filters.setSearch}
          placeholder="Tìm theo mã hoặc tên..."
          disabled={list.isLoading}
        />
        <ManagementSelect id="category-status-filter" label="Trạng thái" value={filters.status} onChange={filters.setStatus} disabled={list.isLoading}>
          <option value="">Tất cả</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </ManagementSelect>
        <ManagementSelect id="category-sort" label="Sắp xếp theo" value={filters.sortBy} onChange={filters.setSortBy} disabled={list.isLoading}>
          <option value="code">Mã</option>
          <option value="name">Tên</option>
          <option value="status">Trạng thái</option>
          <option value="createdAt">Ngày tạo</option>
          <option value="updatedAt">Ngày cập nhật</option>
        </ManagementSelect>
        <ManagementSelect id="category-direction" label="Thứ tự" value={filters.direction} onChange={filters.setDirection} disabled={list.isLoading}>
          <option value="asc">Tăng dần</option>
          <option value="desc">Giảm dần</option>
        </ManagementSelect>
        <button type="button" className={secondaryButton} onClick={filters.reset} disabled={list.isLoading}>Đặt lại</button>
      </ManagementFilterBar>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-busy={list.isFetching}>
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <h2 id="category-list" className="text-base font-semibold text-slate-900">Danh sách danh mục</h2>
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
            labelledBy="category-list"
            emptyMessage={list.isLoading ? 'Đang tải danh mục...' : listError ? 'Chưa thể tải dữ liệu.' : 'Không tìm thấy danh mục phù hợp.'}
          />
        </div>
        <CatalogMobileList
          rows={rows}
          rowKey={(item) => item.id}
          emptyMessage={list.isLoading ? 'Đang tải danh mục...' : listError ? 'Chưa thể tải dữ liệu.' : 'Không tìm thấy danh mục phù hợp.'}
          renderRow={(item) => (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{item.code}</p>
                </div>
                <CatalogStatusBadge status={item.status} />
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-slate-500">Danh mục cha</dt>
                <dd className="min-w-0 text-right text-slate-700">{item.parentId ? optionNames.get(item.parentId) ?? `ID ${item.parentId.slice(0, 8)}…` : 'Danh mục gốc'}</dd>
                <dt className="text-slate-500">Cập nhật</dt>
                <dd className="text-right text-slate-700">{formatDateTime(item.updatedAt)}</dd>
              </dl>
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
          noun="danh mục"
          disabled={list.isFetching}
          onPageChange={filters.setPage}
        />
      </section>
      {dialog && dialog.mode !== 'delete' && (
        <ManagementDialog
          title={dialog.mode === 'create' ? 'Thêm danh mục' : dialog.mode === 'edit' ? 'Sửa danh mục' : 'Chi tiết danh mục'}
          onClose={() => setDialog(null)}
          closeDisabled={createState.isLoading || updateState.isLoading}
        >
          <CategoryForm
            key={`${dialog.mode}-${dialog.item?.id ?? 'new'}`}
            mode={dialog.mode}
            category={dialog.item}
            options={options}
            optionsLoading={optionsQuery.isLoading}
            pending={createState.isLoading || updateState.isLoading}
            apiError={formError || optionsError}
            apiFieldErrors={fieldErrors}
            onClose={() => setDialog(null)}
            onSubmit={saveCategory}
          />
        </ManagementDialog>
      )}
      {dialog?.mode === 'delete' && dialog.item && (
        <CatalogDeleteDialog
          kind="danh mục"
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
