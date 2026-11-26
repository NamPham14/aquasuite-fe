import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RotateCcw, ShieldCheck, Wrench } from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth'
import {
  ManagementFilterCard,
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
  ManagementSearch,
  ManagementSelect,
  filterControlClass,
} from '../../shared/ui/ManagementPage'
import { ManagementTable, ManagementTableSkeleton, type ManagementTableColumn } from '../../shared/ui/ManagementTable'
import { ManagementRowActions } from '../../shared/ui/ManagementRowActions'
import { Button, SakugaActionButton } from '../../shared/ui/Button'
import { ErrorState } from '../../shared/ui/FeedbackStates'
import { normalizeApiError } from '../../shared/api/apiError'
import {
  useGetMyWarrantyRecordsQuery,
  useGetWarrantyRecordsQuery,
} from '../../features/servicedesk/api/warrantyApi'
import { WarrantyStatusBadge } from '../../features/servicedesk/components/WarrantyStatusBadge'
import { CreateWarrantyModal } from '../../features/servicedesk/components/CreateWarrantyModal'
import { VoidWarrantyModal } from '../../features/servicedesk/components/VoidWarrantyModal'
import { ClaimWarrantyModal } from '../../features/servicedesk/components/ClaimWarrantyModal'
import { warrantyPhoneFilterSchema } from '../../features/servicedesk/schemas/warrantySchemas'
import type { WarrantyDisplayStatus, WarrantyRecordListItem } from '../../features/servicedesk/types/warranty.types'

export function WarrantyRecordsPage({ customerScope = false }: { customerScope?: boolean }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const roles = user?.roles ?? []

  const canCreate = !customerScope && roles.some((r) => ['SHOP_OWNER', 'SALES_STAFF'].includes(r))
  const canVoid = !customerScope && roles.includes('SHOP_OWNER')

  const [keyword, setKeyword] = useState('')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [displayStatus, setDisplayStatus] = useState<WarrantyDisplayStatus | ''>('')
  const [page, setPage] = useState(1)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [voidTarget, setVoidTarget] = useState<WarrantyRecordListItem | null>(null)
  const [claimRecordId, setClaimRecordId] = useState<string | null>(null)

  const handlePhoneChange = (val: string) => {
    setPhone(val)
    setPage(1)
    const parsed = warrantyPhoneFilterSchema.safeParse(val)
    setPhoneError(parsed.success ? null : parsed.error.issues[0]?.message ?? 'Số điện thoại không hợp lệ.')
  }

  const queryParams = {
    keyword: keyword.trim() || undefined,
    phone: !customerScope && !phoneError && phone.trim() ? phone.trim() : undefined,
    displayStatus: displayStatus || undefined,
    page,
    size: 20,
    sortBy: 'createdAt',
    direction: 'desc' as const,
  }

  const staffQuery = useGetWarrantyRecordsQuery(queryParams, { skip: customerScope })
  const customerQuery = useGetMyWarrantyRecordsQuery(queryParams, { skip: !customerScope })
  const activeQuery = customerScope ? customerQuery : staffQuery

  const pageData = activeQuery.data
  const items = pageData?.items ?? []
  const totalElements = pageData?.totalElements ?? 0
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)
  const detailBasePath = customerScope ? '/profile/warranties' : '/app/warranty-records'

  const hasActiveFilters = Boolean(keyword || phone || displayStatus)

  const resetFilters = () => {
    setKeyword('')
    setPhone('')
    setPhoneError(null)
    setDisplayStatus('')
    setPage(1)
  }

  const columns: ManagementTableColumn<WarrantyRecordListItem>[] = [
    {
      key: 'warrantyCode',
      header: 'Mã bảo hành',
      cell: (row) => (
        <button
          type="button"
          onClick={() => navigate(`${detailBasePath}/${row.warrantyRecordId}`)}
          className="font-semibold text-sky-700 hover:underline"
        >
          {row.warrantyCode}
        </button>
      ),
    },
    {
      key: 'product',
      header: 'Sản phẩm / SKU',
      cellClassName: 'max-w-[240px] whitespace-normal',
      cell: (row) => (
        <div>
          <div className="font-medium text-slate-900">{row.productName || row.variantName || '—'}</div>
          <div className="text-[11px] text-slate-500">SKU: {row.sku || '—'}</div>
        </div>
      ),
    },
    {
      key: 'serialNumber',
      header: 'Serial / Barcode',
      cell: (row) => (
        <span className="font-mono text-xs text-slate-700">{row.serialNumber || 'Không theo dõi'}</span>
      ),
    },
    ...(!customerScope
      ? [
          {
            key: 'customer',
            header: 'Khách hàng',
            cell: (row: WarrantyRecordListItem) => (
              <div>
                <div className="font-medium text-slate-900">{row.customerName || '—'}</div>
                <div className="text-[11px] text-slate-500">{row.phoneNumber || 'Chưa có SĐT'}</div>
              </div>
            ),
          },
        ]
      : []),
    {
      key: 'orderCode',
      header: 'Đơn hàng',
      cell: (row) => (
        <span className="text-slate-700">{row.orderCode || 'Cấp lẻ (Ad-hoc)'}</span>
      ),
    },
    {
      key: 'period',
      header: 'Hiệu lực',
      cell: (row) => (
        <div>
          <div className="text-slate-800">
            {row.startDate} → {row.endDate}
          </div>
          <div className="text-[11px] text-slate-500">
            {row.remainingDays > 0 ? `Còn ${row.remainingDays} ngày` : '0 ngày còn lại'}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (row) => <WarrantyStatusBadge status={row.displayStatus} />,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      cell: (row) => {
        if (customerScope) {
          const canClaim = row.canRequestSupport ?? (row.status === 'ACTIVE' && row.displayStatus !== 'CLAIMED' && !row.openTicketCode)
          let tooltip = 'Gửi yêu cầu sửa chữa/bảo hành cho thiết bị này'
          if (row.openTicketCode) {
            tooltip = `Đang có yêu cầu bảo hành mở (${row.openTicketCode})`
          } else if (row.displayStatus === 'CLAIMED') {
            tooltip = 'Thẻ đang có yêu cầu bảo hành chưa hoàn tất'
          } else if (row.displayStatus === 'VOIDED') {
            tooltip = 'Thẻ bảo hành đã bị vô hiệu hóa'
          }

          return (
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => navigate(`${detailBasePath}/${row.warrantyRecordId}`)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Hồ sơ
              </button>
              <button
                type="button"
                disabled={!canClaim}
                title={tooltip}
                onClick={() => setClaimRecordId(row.warrantyRecordId)}
                className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <Wrench className="h-3.5 w-3.5" />
                Yêu cầu BH
              </button>
            </div>
          )
        }

        const actions: {
          variant: 'view' | 'edit' | 'delete'
          label: string
          ariaLabel: string
          onClick: () => void
          disabled?: boolean
        }[] = [
          {
            variant: 'view',
            label: 'Hồ sơ',
            ariaLabel: `Xem hồ sơ thẻ bảo hành ${row.warrantyCode}`,
            onClick: () => navigate(`${detailBasePath}/${row.warrantyRecordId}`),
          },
        ]
        if (canVoid && row.status === 'ACTIVE') {
          actions.push({
            variant: 'delete',
            label: 'Hủy thẻ',
            ariaLabel: `Hủy thẻ bảo hành ${row.warrantyCode}`,
            disabled: row.displayStatus === 'CLAIMED',
            onClick: () => setVoidTarget(row),
          })
        }
        return <ManagementRowActions actions={actions} />
      },
    },
  ]

  const fetchError = activeQuery.error ? normalizeApiError(activeQuery.error).message : null

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title={customerScope ? 'Bảo hành của tôi' : 'Thẻ bảo hành điện tử (E-Warranty)'}
        description={
          customerScope
            ? 'Tra cứu thời hạn bảo hành, điều khoản áp dụng và lịch sử sửa chữa sản phẩm của bạn.'
            : 'Cấp mới, tra cứu theo SĐT/Serial và quản lý hồ sơ bảo hành điện tử toàn cửa hàng.'
        }
        group="Dịch vụ & Hậu mãi"
        breadcrumb={customerScope ? 'Bảo hành của tôi' : 'Thẻ bảo hành điện tử'}
        icon={<ShieldCheck className="h-5 w-5" />}
        actions={
          canCreate ? (
            <SakugaActionButton onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Cấp thẻ bảo hành
            </SakugaActionButton>
          ) : undefined
        }
      />

      <ManagementFilterCard
        headingId="warranty-record-filters"
        title="Tìm và lọc thẻ bảo hành"
        resultCount={`Hiển thị ${items.length} / ${totalElements} thẻ bảo hành`}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
      >
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <ManagementSearch
            id="warranty-keyword-search"
            label="Tìm theo Mã thẻ / Số Serial"
            value={keyword}
            onChange={(val) => {
              setKeyword(val)
              setPage(1)
            }}
            placeholder="Nhập WAR-... hoặc số serial..."
          />

          {!customerScope && (
            <div className="min-w-0">
              <label htmlFor="warranty-phone-filter" className="mb-1.5 block text-xs font-semibold leading-none text-aqs-ink-muted">
                Số điện thoại khách hàng
              </label>
              <input
                id="warranty-phone-filter"
                type="search"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="VD: 0901234567"
                className={`${filterControlClass} ${phoneError ? 'border-aqs-danger' : ''}`}
              />
              {phoneError && <p className="mt-1 text-[11px] text-aqs-danger">{phoneError}</p>}
            </div>
          )}

          <ManagementSelect
            id="warranty-status-filter"
            label="Trạng thái"
            value={displayStatus}
            onChange={(val) => {
              setDisplayStatus(val as WarrantyDisplayStatus | '')
              setPage(1)
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Còn hiệu lực (Active)</option>
            <option value="CLAIMED">Đang bảo hành (Claimed)</option>
            <option value="EXPIRED">Hết hạn (Expired)</option>
            <option value="VOIDED">Đã hủy (Voided)</option>
          </ManagementSelect>

          {hasActiveFilters && (
            <Button variant="secondary" onClick={resetFilters}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Đặt lại
            </Button>
          )}
        </div>
      </ManagementFilterCard>

      <ManagementPanel
        headingId="warranty-table-heading"
        title={`Danh sách thẻ bảo hành (${totalElements})`}
        refreshing={activeQuery.isFetching && items.length > 0}
        busy={activeQuery.isFetching}
      >
        {fetchError ? (
          <div className="p-5">
            <ErrorState
              sectionLabel="Danh sách thẻ bảo hành"
              title="Không thể tải dữ liệu bảo hành"
              message={fetchError}
              onRetry={() => void activeQuery.refetch()}
              retrying={activeQuery.isFetching}
            />
          </div>
        ) : activeQuery.isLoading ? (
          <ManagementTableSkeleton columns={customerScope ? 7 : 8} rows={5} />
        ) : (
          <ManagementTable
            columns={columns}
            rows={items}
            rowKey={(r) => r.warrantyRecordId}
            labelledBy="warranty-table-heading"
            emptyMessage="Không tìm thấy thẻ bảo hành nào phù hợp với điều kiện lọc."
          />
        )}

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-aqs-border bg-aqs-surface-subtle/60 px-5 py-3 text-xs text-aqs-ink-muted">
            <div>
              Hiển thị <span className="font-semibold tabular-nums text-aqs-ink">{items.length}</span> /{' '}
              <span className="font-semibold tabular-nums text-aqs-ink">{totalElements}</span> thẻ bảo hành
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Trước
              </Button>
              <span className="px-1 font-medium tabular-nums text-aqs-ink">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Tiếp
              </Button>
            </div>
          </div>
        )}
      </ManagementPanel>

      {showCreateModal && (
        <CreateWarrantyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(id) => navigate(`${detailBasePath}/${id}`)}
        />
      )}

      {voidTarget && (
        <VoidWarrantyModal
          warrantyRecordId={voidTarget.warrantyRecordId}
          warrantyCode={voidTarget.warrantyCode}
          onClose={() => setVoidTarget(null)}
        />
      )}

      {claimRecordId && (
        <ClaimWarrantyModal
          warrantyRecordId={claimRecordId}
          onClose={() => setClaimRecordId(null)}
          onSuccess={() => {
            activeQuery.refetch()
          }}
        />
      )}
    </ManagementPageShell>
  )
}

