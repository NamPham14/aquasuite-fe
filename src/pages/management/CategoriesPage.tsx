import { useEffect, useState } from 'react'
import { FileSpreadsheet, FolderTree, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  CategoryForm,
  CategoryImportDialog,
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
import { DeleteConfirmDialog, ManagementDialog } from '../../shared/ui/ManagementDialog'
import {
  ManagementFilterCard,
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
import { Button, SakugaActionButton } from '../../shared/ui/Button'
import { CodeChip } from '../../shared/ui/Badge'
import { EmptyState, ErrorState, OPERATIONAL_TOAST_CLASS } from '../../shared/ui/FeedbackStates'

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
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [deleteError, setDeleteError] = useState('')
  const data = list.data
  const rows = data?.items ?? []
  const options = optionsQuery.data ?? []
  const optionNames = new Map(
    options.map((option) => [option.categoryId, `${option.categoryCode} — ${option.categoryName}`]),
  )
  const hasFilters = Boolean(filters.search.trim() || filters.status)

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
        toast.success('Đã tạo danh mục.', { className: OPERATIONAL_TOAST_CLASS })
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
        toast.success('Đã cập nhật danh mục.', { className: OPERATIONAL_TOAST_CLASS })
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
      toast.success('Đã xóa danh mục.', { className: OPERATIONAL_TOAST_CLASS })
    } catch (error) {
      setDeleteError(getCatalogErrorState(error).message)
    }
  }

  const columns: ManagementTableColumn<Category>[] = [
    {
      key: 'code',
      header: 'Mã danh mục',
      cell: (item) => <CodeChip>{item.code}</CodeChip>,
    },
    {
      key: 'name',
      header: 'Tên danh mục',
      cell: (item) => <span className="font-semibold text-aqs-ink">{item.name}</span>,
    },
    {
      key: 'parent',
      header: 'Danh mục cha',
      cell: (item) => (
        <span className="text-aqs-ink-muted">
          {item.parentId
            ? optionNames.get(item.parentId) ?? `ID ${item.parentId.slice(0, 8)}…`
            : 'Danh mục gốc'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      cell: (item) => <CatalogStatusBadge status={item.status} />,
    },
    {
      key: 'updatedAt',
      header: 'Cập nhật',
      cellClassName: 'tabular-nums text-aqs-ink-muted',
      cell: (item) => formatDateTime(item.updatedAt),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'center',
      cell: (item) => (
        <ManagementRowActions
          actions={[
            { variant: 'view', label: 'Xem', ariaLabel: `Xem ${item.name}`, onClick: () => openDialog('view', item) },
            { variant: 'edit', label: 'Sửa', ariaLabel: `Sửa ${item.name}`, onClick: () => openDialog('edit', item) },
            { variant: 'delete', label: 'Xóa', ariaLabel: `Xóa ${item.name}`, onClick: () => openDialog('delete', item) },
          ]}
        />
      ),
    },
  ]

  const listError = list.isError ? getCatalogErrorState(list.error).message : ''
  const optionsError = optionsQuery.isError ? getCatalogErrorState(optionsQuery.error).message : ''
  const totalElements = data?.totalElements ?? rows.length

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title="Quản lý Danh mục"
        description="Quản lý danh mục sản phẩm và quan hệ phân cấp. Máy chủ kiểm tra tên trùng, vòng lặp và quan hệ cha con."
        breadcrumb="Danh mục"
        group="Quản lý danh mục"
        icon={<FolderTree className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Nhập Excel
            </Button>
            <SakugaActionButton onClick={() => openDialog('create')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Thêm danh mục
            </SakugaActionButton>
          </div>
        }
      />

      <ManagementFilterCard
        headingId="category-filters"
        title="Tìm và lọc danh mục"
        description="Kết quả tự cập nhật theo từ khóa, trạng thái và thứ tự sắp xếp."
        resultCount={list.isLoading ? 'Đang tải...' : `${totalElements} kết quả`}
        hasActiveFilters={hasFilters}
        onReset={filters.reset}
      >
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
          <ManagementSearch
            id="category-search"
            label="Tìm kiếm"
            value={filters.search}
            onChange={filters.setSearch}
            placeholder="Tìm theo mã hoặc tên..."
            disabled={list.isLoading}
          />
          <ManagementSelect
            id="category-status-filter"
            label="Trạng thái"
            value={filters.status}
            onChange={filters.setStatus}
            disabled={list.isLoading}
          >
            <option value="">Tất cả</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </ManagementSelect>
          <ManagementSelect
            id="category-sort"
            label="Sắp xếp theo"
            value={filters.sortBy}
            onChange={filters.setSortBy}
            disabled={list.isLoading}
          >
            <option value="code">Mã</option>
            <option value="name">Tên</option>
            <option value="status">Trạng thái</option>
            <option value="createdAt">Ngày tạo</option>
            <option value="updatedAt">Ngày cập nhật</option>
          </ManagementSelect>
          <ManagementSelect
            id="category-direction"
            label="Thứ tự"
            value={filters.direction}
            onChange={filters.setDirection}
            disabled={list.isLoading}
          >
            <option value="asc">Tăng dần</option>
            <option value="desc">Giảm dần</option>
          </ManagementSelect>
          <Button variant="secondary" onClick={filters.reset} disabled={list.isLoading}>
            Đặt lại
          </Button>
        </div>
      </ManagementFilterCard>

      <ManagementPanel
        headingId="category-list"
        title="Danh sách danh mục"
        description={`Tổng số ${totalElements} danh mục được đồng bộ từ hệ thống.`}
        refreshing={list.isFetching && !list.isLoading}
        busy={list.isFetching}
      >
        <div aria-busy={list.isFetching}>
          {listError ? (
            <div className="p-5">
              <ErrorState
                sectionLabel="Danh sách danh mục"
                title="Không thể tải danh sách danh mục"
                message={listError}
                onRetry={() => void list.refetch()}
                retrying={list.isFetching}
              />
            </div>
          ) : list.isLoading && !rows.length ? (
            <ManagementTableSkeleton columns={6} rows={5} />
          ) : !rows.length ? (
            <div className="p-5">
              <EmptyState
                title={hasFilters ? 'Không tìm thấy danh mục phù hợp' : 'Chưa có danh mục nào'}
                description={
                  hasFilters
                    ? 'Hãy thử điều chỉnh từ khóa hoặc bỏ bộ lọc trạng thái.'
                    : 'Bắt đầu bằng cách thêm danh mục đầu tiên hoặc nhập từ Excel.'
                }
                search={filters.search}
                hasFilters={hasFilters}
                onClearSearch={filters.search ? () => filters.setSearch('') : undefined}
                onResetFilters={hasFilters ? filters.reset : undefined}
              />
            </div>
          ) : (
            <>
              <div className="hidden sm:block">
                <ManagementTable
                  columns={columns}
                  rows={rows}
                  rowKey={(item) => item.id}
                  labelledBy="category-list"
                  emptyMessage="Không tìm thấy danh mục phù hợp."
                />
              </div>
              <ManagementMobileList
                breakpoint="sm"
                rows={rows}
                rowKey={(item) => item.id}
                emptyMessage="Không tìm thấy danh mục phù hợp."
                renderRow={(item) => (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-aqs-ink">{item.name}</p>
                        <div className="mt-1">
                          <CodeChip>{item.code}</CodeChip>
                        </div>
                      </div>
                      <CatalogStatusBadge status={item.status} />
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                      <dt className="text-aqs-ink-muted">Danh mục cha</dt>
                      <dd className="min-w-0 text-right text-aqs-ink-muted">
                        {item.parentId
                          ? optionNames.get(item.parentId) ?? `ID ${item.parentId.slice(0, 8)}…`
                          : 'Danh mục gốc'}
                      </dd>
                      <dt className="text-aqs-ink-muted">Cập nhật</dt>
                      <dd className="text-right tabular-nums text-aqs-ink-muted">
                        {formatDateTime(item.updatedAt)}
                      </dd>
                    </dl>
                    <ManagementRowActions
                      actions={[
                        { variant: 'view', label: 'Xem', ariaLabel: `Xem ${item.name}`, onClick: () => openDialog('view', item) },
                        { variant: 'edit', label: 'Sửa', ariaLabel: `Sửa ${item.name}`, onClick: () => openDialog('edit', item) },
                        { variant: 'delete', label: 'Xóa', ariaLabel: `Xóa ${item.name}`, onClick: () => openDialog('delete', item) },
                      ]}
                    />
                  </div>
                )}
              />
            </>
          )}
          <ManagementPagination
            page={data?.page ?? filters.page}
            totalPages={data?.totalPages ?? 0}
            totalElements={data?.totalElements ?? 0}
            noun="danh mục"
            disabled={list.isFetching}
            onPageChange={filters.setPage}
          />
        </div>
      </ManagementPanel>

      {dialog && dialog.mode !== 'delete' && (
        <ManagementDialog
          title={
            dialog.mode === 'create'
              ? 'Thêm danh mục'
              : dialog.mode === 'edit'
                ? 'Sửa danh mục'
                : 'Chi tiết danh mục'
          }
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
        <DeleteConfirmDialog
          title="Xác nhận xóa danh mục"
          subject={`${dialog.item.code} — ${dialog.item.name}`}
          description="Thao tác này xóa vĩnh viễn danh mục. Máy chủ sẽ từ chối nếu dữ liệu đang được tham chiếu."
          confirmLabel="Xóa danh mục"
          pendingLabel="Đang xóa..."
          pending={deleteState.isLoading}
          error={deleteError || undefined}
          onClose={() => setDialog(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
      {isImportOpen && (
        <CategoryImportDialog
          onSuccess={() => {
            void list.refetch()
            void optionsQuery.refetch()
          }}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </ManagementPageShell>
  )
}
