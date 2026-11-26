import { useEffect, useState } from 'react'
import { FileSpreadsheet, Plus, Tags } from 'lucide-react'
import { toast } from 'sonner'
import {
  BrandForm,
  BrandImportDialog,
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
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [deleteError, setDeleteError] = useState('')
  const data = list.data
  const rows = data?.items ?? []
  const hasFilters = Boolean(filters.search.trim() || filters.status)

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
        toast.success('Đã tạo thương hiệu.', { className: OPERATIONAL_TOAST_CLASS })
      } else if (dialog?.mode === 'edit' && dialog.item) {
        await updateBrand({
          id: dialog.item.id,
          data: {
            name: values.name,
            description: values.description || null,
            status: values.status,
          },
        }).unwrap()
        toast.success('Đã cập nhật thương hiệu.', { className: OPERATIONAL_TOAST_CLASS })
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
      toast.success('Đã xóa thương hiệu.', { className: OPERATIONAL_TOAST_CLASS })
    } catch (error) {
      setDeleteError(getCatalogErrorState(error).message)
    }
  }

  const columns: ManagementTableColumn<Brand>[] = [
    {
      key: 'code',
      header: 'Mã thương hiệu',
      cell: (item) => <CodeChip>{item.code}</CodeChip>,
    },
    {
      key: 'name',
      header: 'Tên thương hiệu',
      cell: (item) => <span className="font-semibold text-aqs-ink">{item.name}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      cell: (item) => <CatalogStatusBadge status={item.status} />,
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
  const totalElements = data?.totalElements ?? rows.length

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title="Quản lý Thương hiệu"
        description="Quản lý mã, tên và trạng thái thương hiệu sản phẩm. Mã thương hiệu là khóa ổn định và không thể sửa sau khi tạo."
        breadcrumb="Thương hiệu"
        group="Quản lý danh mục"
        icon={<Tags className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setIsImportOpen(true)}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Nhập Excel
            </Button>
            <SakugaActionButton onClick={() => openDialog('create')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Thêm thương hiệu
            </SakugaActionButton>
          </div>
        }
      />

      <ManagementFilterCard
        headingId="brand-filters"
        title="Tìm và lọc thương hiệu"
        description="Kết quả tự cập nhật theo từ khóa, trạng thái và thứ tự sắp xếp."
        resultCount={list.isLoading ? 'Đang tải...' : `${totalElements} kết quả`}
        hasActiveFilters={hasFilters}
        onReset={filters.reset}
      >
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
          <ManagementSearch
            id="brand-search"
            label="Tìm kiếm"
            value={filters.search}
            onChange={filters.setSearch}
            placeholder="Tìm theo mã hoặc tên..."
            disabled={list.isLoading}
          />
          <ManagementSelect
            id="brand-status-filter"
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
            id="brand-sort"
            label="Sắp xếp theo"
            value={filters.sortBy}
            onChange={filters.setSortBy}
            disabled={list.isLoading}
          >
            <option value="code">Mã</option>
            <option value="name">Tên</option>
            <option value="status">Trạng thái</option>
          </ManagementSelect>
          <ManagementSelect
            id="brand-direction"
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
        headingId="brand-list"
        title="Danh sách thương hiệu"
        description={`Tổng số ${totalElements} thương hiệu được đồng bộ từ hệ thống.`}
        refreshing={list.isFetching && !list.isLoading}
        busy={list.isFetching}
      >
        <div aria-busy={list.isFetching}>
          {listError ? (
            <div className="p-5">
              <ErrorState
                sectionLabel="Danh sách thương hiệu"
                title="Không thể tải danh sách thương hiệu"
                message={listError}
                onRetry={() => void list.refetch()}
                retrying={list.isFetching}
              />
            </div>
          ) : list.isLoading && !rows.length ? (
            <ManagementTableSkeleton columns={4} rows={5} />
          ) : !rows.length ? (
            <div className="p-5">
              <EmptyState
                title={hasFilters ? 'Không tìm thấy thương hiệu phù hợp' : 'Chưa có thương hiệu nào'}
                description={
                  hasFilters
                    ? 'Hãy thử điều chỉnh từ khóa hoặc bỏ bộ lọc trạng thái.'
                    : 'Bắt đầu bằng cách thêm thương hiệu đầu tiên hoặc nhập từ Excel.'
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
                  labelledBy="brand-list"
                  emptyMessage="Không tìm thấy thương hiệu phù hợp."
                />
              </div>
              <ManagementMobileList
                breakpoint="sm"
                rows={rows}
                rowKey={(item) => item.id}
                emptyMessage="Không tìm thấy thương hiệu phù hợp."
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
                    {item.description && (
                      <p className="line-clamp-2 text-sm text-aqs-ink-muted">{item.description}</p>
                    )}
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
            noun="thương hiệu"
            disabled={list.isFetching}
            onPageChange={filters.setPage}
          />
        </div>
      </ManagementPanel>

      {dialog && dialog.mode !== 'delete' && (
        <ManagementDialog
          title={
            dialog.mode === 'create'
              ? 'Thêm thương hiệu'
              : dialog.mode === 'edit'
                ? 'Sửa thương hiệu'
                : 'Chi tiết thương hiệu'
          }
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
        <DeleteConfirmDialog
          title="Xác nhận xóa thương hiệu"
          subject={`${dialog.item.code} — ${dialog.item.name}`}
          description="Thao tác này xóa vĩnh viễn thương hiệu. Máy chủ sẽ từ chối nếu dữ liệu đang được tham chiếu."
          confirmLabel="Xóa thương hiệu"
          pendingLabel="Đang xóa..."
          pending={deleteState.isLoading}
          error={deleteError || undefined}
          onClose={() => setDialog(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
      {isImportOpen && (
        <BrandImportDialog
          onSuccess={() => void list.refetch()}
          onClose={() => setIsImportOpen(false)}
        />
      )}
    </ManagementPageShell>
  )
}
