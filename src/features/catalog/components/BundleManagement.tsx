import { Layers, Plus, RefreshCw } from 'lucide-react'
import {
  ManagementFilterCard,
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
  ManagementSearch,
  ManagementSelect,
} from '../../../shared/ui/ManagementPage'
import {
  ManagementMobileList,
  ManagementPagination,
  ManagementTable,
  ManagementTableSkeleton,
  type ManagementTableColumn,
} from '../../../shared/ui/ManagementTable'
import { ManagementActionButton } from '../../../shared/ui/ManagementRowActions'
import { Button, SakugaActionButton } from '../../../shared/ui/Button'
import { CodeChip, StatusBadge } from '../../../shared/ui/Badge'
import { EmptyState, ErrorState } from '../../../shared/ui/FeedbackStates'
import { useBundleManagement } from '../hooks/useBundleManagement'
import type { Bundle, BundlePublication } from '../types/bundle.types'
import { bundleButtonClass, bundleError, bundleMoney, publicationLabels } from '../lib/bundle'
import { BundleDialog } from './BundleDialog'

function publicationTone(status: BundlePublication) {
  if (status === 'PUBLISHED') return 'positive' as const
  if (status === 'DRAFT') return 'accent' as const
  return 'neutral' as const
}

export function BundleManagement() {
  const m = useBundleManagement()
  const data = m.list.currentData
  const error = m.error || (m.list.isError ? bundleError(m.list.error).message : '')
  const hasFilters = Boolean(m.filters.keyword || m.filters.publicationStatus)

  function actions(bundle: Bundle) {
    return (
      <div className="max-w-full overflow-x-auto p-1">
        <div className="flex w-max items-center gap-1.5">
          {[
            {
              variant: 'view' as const,
              label: 'Xem',
              ariaLabel: `Xem ${bundle.name}`,
              onClick: () => void m.open('view', bundle),
              disabled: m.loadingDetail,
            },
            {
              variant: 'edit' as const,
              label: bundle.publicationStatus === 'PUBLISHED' ? 'Sửa (khóa)' : 'Sửa',
              ariaLabel:
                bundle.publicationStatus === 'PUBLISHED'
                  ? `Sửa ${bundle.name} bị khóa; cần ngừng công bố trước`
                  : `Sửa ${bundle.name}`,
              onClick: () => void m.open('edit', bundle),
              disabled: m.loadingDetail || bundle.publicationStatus === 'PUBLISHED',
            },
            {
              variant: 'delete' as const,
              label: 'Xóa',
              ariaLabel: `Xóa ${bundle.name}`,
              onClick: () => void m.open('delete', bundle),
              disabled: m.loadingDetail,
            },
          ].map((action) => (
            <ManagementActionButton key={action.variant} {...action} />
          ))}
          <Button
            variant="secondary"
            size="sm"
            disabled={m.loadingDetail}
            onClick={() =>
              void m.open(bundle.publicationStatus === 'PUBLISHED' ? 'unpublish' : 'publish', bundle)
            }
          >
            {bundle.publicationStatus === 'PUBLISHED' ? 'Ngừng công bố' : 'Công bố'}
          </Button>
        </div>
      </div>
    )
  }

  const columns: ManagementTableColumn<Bundle>[] = [
    {
      key: 'name',
      header: 'Combo',
      cell: (bundle) => (
        <div className="max-w-64 whitespace-normal">
          <p className="break-words font-semibold text-aqs-ink">{bundle.name}</p>
          <div className="mt-1">
            <CodeChip>{bundle.productCode}</CodeChip>
          </div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Số SKU',
      align: 'center',
      cellClassName: 'tabular-nums font-medium text-aqs-ink-muted',
      cell: (bundle) => bundle.linkedItemsCount,
    },
    {
      key: 'retail',
      header: 'Tổng giá lẻ',
      cellClassName: 'tabular-nums text-aqs-ink-muted',
      cell: (bundle) => bundleMoney(bundle.originalTotal),
      align: 'right',
    },
    {
      key: 'price',
      header: 'Giá gói',
      cell: (bundle) => (
        <span className="text-sm font-bold tabular-nums text-aqs-ink">
          {bundleMoney(bundle.packagePrice)}
        </span>
      ),
      align: 'right',
    },
    {
      key: 'discount',
      header: 'Giảm giá',
      align: 'center',
      cell: (bundle) =>
        bundle.priceIssue ? (
          <StatusBadge tone="warning">
            Cần kiểm tra giá
          </StatusBadge>
        ) : bundle.discountPercent != null ? (
          <span className="font-semibold tabular-nums text-aqs-positive">
            -{bundle.discountPercent}%
          </span>
        ) : (
          <span className="text-aqs-ink-muted">Chưa xác định</span>
        ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      align: 'center',
      cell: (bundle) => (
        <StatusBadge tone={publicationTone(bundle.publicationStatus)}>
          {publicationLabels[bundle.publicationStatus]}
        </StatusBadge>
      ),
    },
    { key: 'actions', header: 'Thao tác', align: 'center', cell: actions },
  ]

  const rows = m.list.isError || m.forbidden ? [] : data?.items ?? []
  const totalElements = data?.totalElements ?? rows.length
  const empty = m.list.isFetching
    ? 'Đang tải combo...'
    : m.list.isError
      ? 'Chưa thể tải dữ liệu.'
      : 'Không tìm thấy combo phù hợp.'

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title="Quản lý Combo"
        description="Cấu hình bộ SKU, giá gói và lịch công bố. Tạo bản nháp, kiểm tra thành phần rồi công bố theo lịch."
        breadcrumb="Combo"
        group="Quản lý danh mục"
        icon={<Layers className="h-5 w-5" />}
        actions={
          !m.forbidden ? (
            <SakugaActionButton
              disabled={m.loadingDetail || m.list.isError}
              onClick={m.createNew}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Tạo combo
            </SakugaActionButton>
          ) : undefined
        }
      />

      {m.forbidden ? (
        <section
          role="alert"
          className="space-y-3 rounded-card border border-aqs-danger-border bg-aqs-surface p-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
        >
          <h2 className="text-lg font-semibold text-aqs-ink">Không có quyền quản lý combo</h2>
          <p className="text-sm text-aqs-ink-muted">
            Máy chủ không cho phép tài khoản này truy cập chức năng quản lý combo.
          </p>
          <Button
            variant="secondary"
            disabled={m.list.isFetching}
            onClick={() => void m.retry()}
          >
            Kiểm tra lại quyền
          </Button>
        </section>
      ) : (
        <>
          <ManagementFilterCard
            headingId="combo-filters"
            title="Tìm và lọc combo"
            description="Lọc nhanh theo mã, tên combo hoặc trạng thái công bố."
            resultCount={m.list.isFetching && !data ? 'Đang tải...' : `${totalElements} kết quả`}
            hasActiveFilters={hasFilters}
            onReset={() => m.changeFilters({ keyword: undefined, publicationStatus: undefined })}
          >
            <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
              <ManagementSearch
                id="combo-search"
                label="Tìm kiếm"
                value={m.filters.keyword ?? ''}
                onChange={(value) => m.changeFilters({ keyword: value.slice(0, 255) || undefined })}
                placeholder="Tìm theo mã hoặc tên combo..."
              />
              <ManagementSelect
                id="combo-publication-filter"
                label="Công bố"
                value={m.filters.publicationStatus ?? ''}
                onChange={(value) =>
                  m.changeFilters({
                    publicationStatus: (value || undefined) as BundlePublication | undefined,
                  })
                }
              >
                <option value="">Tất cả</option>
                <option value="DRAFT">Bản nháp</option>
                <option value="PUBLISHED">Đã công bố</option>
                <option value="UNPUBLISHED">Ngừng công bố</option>
              </ManagementSelect>
              <Button
                variant="secondary"
                onClick={() =>
                  m.changeFilters({ keyword: undefined, publicationStatus: undefined })
                }
              >
                Đặt lại
              </Button>
            </div>
          </ManagementFilterCard>

          {m.loadingDetail && (
            <p role="status" className="text-sm text-aqs-ink-muted">
              Đang tải chi tiết mới nhất...
            </p>
          )}

          <ManagementPanel
            headingId="combo-list-heading"
            title="Danh sách combo"
            description={`Tổng số ${totalElements} combo trong hệ thống.`}
            busy={m.list.isFetching}
            headerActions={
              <Button
                variant="secondary"
                size="sm"
                disabled={m.list.isFetching}
                onClick={() => void m.retry()}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${m.list.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`}
                  aria-hidden="true"
                />
                Tải lại
              </Button>
            }
          >
            <div aria-busy={m.list.isFetching}>
              {error && !m.dialog ? (
                <div className="p-5">
                  <ErrorState
                    sectionLabel="Danh sách combo"
                    title="Không thể tải danh sách combo"
                    message={error}
                    onRetry={() => void m.retry()}
                    retrying={m.list.isFetching}
                  />
                </div>
              ) : m.list.isFetching && !rows.length ? (
                <ManagementTableSkeleton columns={7} rows={5} />
              ) : !rows.length ? (
                <div className="p-5">
                  <EmptyState
                    title={hasFilters ? 'Không tìm thấy combo phù hợp' : 'Chưa có combo nào'}
                    description={
                      hasFilters
                        ? 'Thử điều chỉnh từ khóa hoặc đặt lại bộ lọc trạng thái công bố.'
                        : 'Tạo combo đầu tiên để gộp nhiều SKU với giá ưu đãi.'
                    }
                    search={m.filters.keyword}
                    hasFilters={hasFilters}
                    onClearSearch={
                      m.filters.keyword
                        ? () => m.changeFilters({ keyword: undefined })
                        : undefined
                    }
                    onResetFilters={
                      hasFilters
                        ? () => m.changeFilters({ keyword: undefined, publicationStatus: undefined })
                        : undefined
                    }
                  />
                </div>
              ) : (
                <>
                  <div className="hidden sm:block">
                    <ManagementTable
                      columns={columns}
                      rows={rows}
                      rowKey={(bundle) => bundle.bundleId}
                      labelledBy="combo-list-heading"
                      emptyMessage={empty}
                    />
                  </div>
                  <ManagementMobileList
                    breakpoint="sm"
                    rows={rows}
                    rowKey={(bundle) => bundle.bundleId}
                    emptyMessage={empty}
                    renderRow={(bundle) => (
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="break-words font-semibold text-aqs-ink">{bundle.name}</h3>
                            <div className="mt-1">
                              <CodeChip>{bundle.productCode}</CodeChip>
                            </div>
                          </div>
                          <StatusBadge tone={publicationTone(bundle.publicationStatus)}>
                            {publicationLabels[bundle.publicationStatus]}
                          </StatusBadge>
                        </div>
                        <p className="text-sm text-aqs-ink-muted">
                          {bundle.linkedItemsCount} SKU ·{' '}
                          <span className="font-bold tabular-nums text-aqs-ink">
                            Giá gói: {bundleMoney(bundle.packagePrice)}
                          </span>
                        </p>
                        <p className="text-xs text-aqs-ink-muted">
                          Giá lẻ: {bundleMoney(bundle.originalTotal)} ·{' '}
                          {bundle.priceIssue
                            ? 'Cần kiểm tra giá'
                            : bundle.discountPercent != null
                              ? `Giảm ${bundle.discountPercent}%`
                              : 'Chưa xác định giảm giá'}
                        </p>
                        {actions(bundle)}
                      </div>
                    )}
                  />
                </>
              )}
              {data && m.filters.page > 0 && !rows.length && !m.list.isFetching && (
                <div className="px-5 pb-5">
                  <button
                    type="button"
                    className={bundleButtonClass}
                    onClick={() => m.changeFilters({ page: 0 })}
                  >
                    Về trang đầu
                  </button>
                </div>
              )}
              <ManagementPagination
                page={m.filters.page}
                totalPages={data?.totalPages ?? 0}
                totalElements={data?.totalElements ?? 0}
                noun="combo"
                disabled={m.list.isFetching}
                onPageChange={(page) => m.changeFilters({ page })}
              />
            </div>
          </ManagementPanel>

          {m.dialog && <BundleDialog key={`${m.dialog.mode}-${m.revision}`} management={m} />}
        </>
      )}
    </ManagementPageShell>
  )
}
