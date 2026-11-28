import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronsDownUp,
  ChevronsUpDown,
  ClipboardList,
  Layers,
  List,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
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
import { WarrantyGroupedOrderTable } from '../../features/servicedesk/components/WarrantyGroupedOrderTable'
import { groupWarrantyRecordsByOrder } from '../../features/servicedesk/utils/warrantyGrouping'
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
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(() => new Set())

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [voidTarget, setVoidTarget] = useState<WarrantyRecordListItem | null>(null)
  const [claimRecordId, setClaimRecordId] = useState<string | null>(null)

  const handlePhoneChange = (val: string) => {
    setPhone(val)
    setPage(1)
    const parsed = warrantyPhoneFilterSchema.safeParse(val)
    setPhoneError(parsed.success ? null : parsed.error.issues[0]?.message ?? 'Số điện thoại không hợp lệ.')
  }

  const pageSize = viewMode === 'grouped' ? 50 : 20

  const queryParams = {
    keyword: keyword.trim() || undefined,
    phone: !customerScope && !phoneError && phone.trim() ? phone.trim() : undefined,
    displayStatus: displayStatus || undefined,
    page,
    size: pageSize,
    sortBy: 'createdAt',
    direction: 'desc' as const,
  }

  const staffQuery = useGetWarrantyRecordsQuery(queryParams, { skip: customerScope })
  const customerQuery = useGetMyWarrantyRecordsQuery(queryParams, { skip: !customerScope })
  const activeQuery = customerScope ? customerQuery : staffQuery

  const pageData = activeQuery.data
  const items = useMemo(() => pageData?.items ?? [], [pageData?.items])
  const orderGroups = useMemo(() => groupWarrantyRecordsByOrder(items), [items])
  const expandableKeys = useMemo(
    () => orderGroups.filter((g) => !g.isAdHoc).map((g) => g.groupKey),
    [orderGroups],
  )
  const allExpanded =
    expandableKeys.length > 0 && expandableKeys.every((key) => expandedGroupKeys.has(key))

  const toggleGroup = (groupKey: string) => {
    setExpandedGroupKeys((prev) => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedGroupKeys(new Set())
    } else {
      setExpandedGroupKeys(new Set(expandableKeys))
    }
  }

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

  const fetchError = activeQuery.error ? normalizeApiError(activeQuery.error).message : null

  if (customerScope) {
    return (
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Quiet-Luxury Khách hàng */}
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-[#E6E2DA]">
          <div className="space-y-1.5">
            <Link
              to="/profile?tab=warranty"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-[#78736A] hover:text-[#171614] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Hồ sơ tài khoản</span>
            </Link>
            <h1 className="font-editorial text-3xl sm:text-4xl font-normal text-[#171614] tracking-[-0.01em]">
              Bảo hành của tôi
            </h1>
            <p className="text-xs sm:text-sm text-[#6B6760]">
              Tra cứu thời hạn bảo hành theo đơn hàng, mã Serial và gửi yêu cầu hỗ trợ kỹ thuật chính hãng.
            </p>
          </div>

          <Link
            to="/profile/warranty-tickets"
            className="h-10 inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] transition-colors"
          >
            <ClipboardList className="h-3.5 w-3.5 text-[#C5B091]" aria-hidden="true" />
            <span>Yêu cầu bảo hành của tôi</span>
          </Link>
        </div>

        {/* Bộ lọc đường mảnh */}
        <div className="border border-[#E6E2DA] bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#78736A]">
              Tìm &amp; Lọc thẻ bảo hành
            </span>
            <span className="text-xs text-[#6B6760] tabular-nums">
              Hiển thị <strong className="text-[#171614]">{items.length}</strong> / {totalElements} thẻ bảo hành
            </span>
          </div>

          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
            <div>
              <label
                htmlFor="warranty-keyword-search"
                className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5"
              >
                Tìm theo Mã thẻ / Số Serial
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867C]" />
                <input
                  id="warranty-keyword-search"
                  type="search"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Nhập WAR-... hoặc số serial..."
                  className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] pl-9 pr-3 text-xs text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="warranty-status-filter"
                className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5"
              >
                Trạng thái
              </label>
              <select
                id="warranty-status-filter"
                value={displayStatus}
                onChange={(e) => {
                  setDisplayStatus(e.target.value as WarrantyDisplayStatus | '')
                  setPage(1)
                }}
                className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] px-3 text-xs text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="ACTIVE">Còn hiệu lực (Active)</option>
                <option value="CLAIMED">Đang bảo hành (Claimed)</option>
                <option value="EXPIRED">Hết hạn (Expired)</option>
                <option value="VOIDED">Đã hủy (Voided)</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-10 inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-4 text-[11px] uppercase tracking-[0.14em] font-medium text-[#171614] hover:border-[#171614] transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Bảng thẻ bảo hành */}
        <section className="border border-[#E6E2DA] bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E6E2DA] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-3">
            <h2
              id="warranty-table-heading"
              className="font-editorial text-lg font-normal text-[#171614]"
            >
              {viewMode === 'grouped'
                ? `Đơn hàng & thẻ bảo hành (${orderGroups.length} nhóm / ${totalElements} thẻ)`
                : `Danh sách thẻ bảo hành (${totalElements})`}
            </h2>

            <div className="flex flex-wrap items-center gap-2.5">
              {viewMode === 'grouped' && expandableKeys.length > 0 && (
                <button
                  type="button"
                  onClick={toggleExpandAll}
                  className="inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-3 py-1.5 text-[11px] font-medium text-[#171614] hover:border-[#171614] cursor-pointer transition-colors"
                >
                  {allExpanded ? (
                    <>
                      <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Thu gọn tất cả</span>
                    </>
                  ) : (
                    <>
                      <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Mở tất cả</span>
                    </>
                  )}
                </button>
              )}

              <div
                role="group"
                aria-label="Chế độ hiển thị"
                className="inline-flex border border-[#D6D1C7] bg-white p-0.5 text-[11px]"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === 'grouped'}
                  onClick={() => {
                    setViewMode('grouped')
                    setPage(1)
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 font-medium transition-colors cursor-pointer ${
                    viewMode === 'grouped'
                      ? 'bg-[#171614] text-[#FAF9F6]'
                      : 'text-[#6B6760] hover:text-[#171614]'
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Theo đơn hàng</span>
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'flat'}
                  onClick={() => {
                    setViewMode('flat')
                    setPage(1)
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 font-medium transition-colors cursor-pointer ${
                    viewMode === 'flat'
                      ? 'bg-[#171614] text-[#FAF9F6]'
                      : 'text-[#6B6760] hover:text-[#171614]'
                  }`}
                >
                  <List className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Từng thẻ</span>
                </button>
              </div>
            </div>
          </div>

          {fetchError ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs font-medium text-[#991B1B]">{fetchError}</p>
              <button
                type="button"
                onClick={() => void activeQuery.refetch()}
                className="border border-[#171614] bg-[#171614] px-5 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : activeQuery.isLoading ? (
            <div className="p-12 text-center text-xs text-[#78736A]">
              Đang tải dữ liệu bảo hành từ hệ thống...
            </div>
          ) : viewMode === 'grouped' ? (
            <WarrantyGroupedOrderTable
              groups={orderGroups}
              expandedKeys={expandedGroupKeys}
              onToggleGroup={toggleGroup}
              customerScope
              canVoid={false}
              onViewDetail={(id) => navigate(`${detailBasePath}/${id}`)}
              onClaim={(id) => setClaimRecordId(id)}
              onVoid={() => {}}
              emptyMessage="Không tìm thấy thẻ bảo hành nào phù hợp với điều kiện lọc."
            />
          ) : (
            <div className="overflow-x-auto">
              <table aria-labelledby="warranty-table-heading" className="min-w-full border-collapse text-xs text-[#171614]">
                <thead className="bg-[#FAF9F6] text-[#78736A] text-[10px] uppercase tracking-[0.16em] border-b border-[#E6E2DA] font-medium">
                  <tr>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Mã bảo hành</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Sản phẩm / SKU</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Serial / Barcode</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Đơn hàng</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Hiệu lực</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Trạng thái</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2DA]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-xs text-[#78736A]">
                        Không tìm thấy thẻ bảo hành nào phù hợp với điều kiện lọc.
                      </td>
                    </tr>
                  ) : (
                    items.map((row) => {
                      const canClaim =
                        row.canRequestSupport ??
                        (row.status === 'ACTIVE' && row.displayStatus !== 'CLAIMED' && !row.openTicketCode)
                      let tooltip = 'Gửi yêu cầu sửa chữa/bảo hành cho thiết bị này'
                      if (row.openTicketCode) {
                        tooltip = `Đang có yêu cầu bảo hành mở (${row.openTicketCode})`
                      } else if (row.displayStatus === 'CLAIMED') {
                        tooltip = 'Thẻ đang có yêu cầu bảo hành chưa hoàn tất'
                      } else if (row.displayStatus === 'VOIDED') {
                        tooltip = 'Thẻ bảo hành đã bị vô hiệu hóa'
                      }

                      return (
                        <tr key={row.warrantyRecordId} className="hover:bg-[#FAF9F6] transition-colors">
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => navigate(`${detailBasePath}/${row.warrantyRecordId}`)}
                              className="font-mono font-semibold text-[#171614] hover:underline cursor-pointer"
                            >
                              {row.warrantyCode}
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="min-w-[210px] max-w-[280px] whitespace-normal break-words leading-snug">
                              <div className="font-medium text-[#171614]">
                                {row.productName || row.variantName || '—'}
                              </div>
                              {row.variantName && row.productName && row.variantName !== row.productName && (
                                <div className="text-[11px] text-[#78736A]">{row.variantName}</div>
                              )}
                              <div className="mt-0.5 text-[11px] text-[#78736A]">SKU: {row.sku || '—'}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-block max-w-[180px] whitespace-normal break-all font-mono text-xs text-[#171614]">
                              {row.serialNumber || 'Không theo dõi'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-[#57534E]">
                            {row.orderCode || 'Cấp lẻ (Ad-hoc)'}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="text-[#171614] tabular-nums">
                              {row.startDate} &rarr; {row.endDate}
                            </div>
                            <div className="text-[11px] text-[#78736A]">
                              {row.remainingDays > 0 ? `Còn ${row.remainingDays} ngày` : '0 ngày còn lại'}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <WarrantyStatusBadge status={row.displayStatus} tone="editorial" />
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`${detailBasePath}/${row.warrantyRecordId}`)}
                                className="border border-[#D6D1C7] bg-white px-3 py-1.5 text-[11px] font-medium text-[#171614] hover:border-[#171614] cursor-pointer"
                              >
                                Hồ sơ
                              </button>
                              <button
                                type="button"
                                disabled={!canClaim}
                                title={tooltip}
                                onClick={() => setClaimRecordId(row.warrantyRecordId)}
                                className="inline-flex items-center gap-1 border border-[#171614] bg-[#171614] px-3 py-1.5 text-[11px] font-medium text-[#FAF9F6] hover:bg-[#2A2825] disabled:cursor-not-allowed disabled:border-[#E6E2DA] disabled:bg-[#F2EFE9] disabled:text-[#8C867C] cursor-pointer"
                              >
                                <Wrench className="h-3 w-3 text-[#C5B091]" />
                                <span>Yêu cầu BH</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E6E2DA] bg-[#FAF9F6] px-6 py-3.5 text-xs text-[#6B6760]">
              <div>
                Hiển thị <strong className="tabular-nums text-[#171614]">{items.length}</strong> /{' '}
                <strong className="tabular-nums text-[#171614]">{totalElements}</strong> thẻ bảo hành
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="border border-[#D6D1C7] bg-white px-3 py-1 text-xs font-medium text-[#171614] hover:border-[#171614] disabled:opacity-40 cursor-pointer"
                >
                  Trước
                </button>
                <span className="px-2 font-medium tabular-nums text-[#171614]">
                  Trang {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="border border-[#D6D1C7] bg-white px-3 py-1 text-xs font-medium text-[#171614] hover:border-[#171614] disabled:opacity-40 cursor-pointer"
                >
                  Tiếp
                </button>
              </div>
            </div>
          )}
        </section>

        {claimRecordId && (
          <ClaimWarrantyModal
            warrantyRecordId={claimRecordId}
            onClose={() => setClaimRecordId(null)}
            onSuccess={() => {
              activeQuery.refetch()
            }}
          />
        )}
      </div>
    )
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
      cell: (row) => (
        <div className="min-w-[210px] max-w-[280px] whitespace-normal break-words leading-snug">
          <div className="font-medium text-slate-900">{row.productName || row.variantName || '—'}</div>
          {row.variantName && row.productName && row.variantName !== row.productName && (
            <div className="text-[11px] text-slate-500">{row.variantName}</div>
          )}
          <div className="mt-0.5 text-[11px] text-slate-500">SKU: {row.sku || '—'}</div>
        </div>
      ),
    },
    {
      key: 'serialNumber',
      header: 'Serial / Barcode',
      cell: (row) => (
        <span className="inline-block max-w-[180px] whitespace-normal break-all font-mono text-xs text-slate-700">
          {row.serialNumber || 'Không theo dõi'}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      cell: (row: WarrantyRecordListItem) => (
        <div className="min-w-[140px] max-w-[210px] whitespace-normal break-words leading-snug">
          <div className="font-medium text-slate-900">{row.customerName || '—'}</div>
          <div className="text-[11px] text-slate-500">{row.phoneNumber || 'Chưa có SĐT'}</div>
        </div>
      ),
    },
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

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title="Thẻ bảo hành điện tử (E-Warranty)"
        description="Cấp mới, tra cứu theo SĐT/Serial và quản lý hồ sơ bảo hành điện tử toàn cửa hàng."
        group="Dịch vụ & Hậu mãi"
        breadcrumb="Thẻ bảo hành điện tử"
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
        title={
          viewMode === 'grouped'
            ? `Đơn hàng & thẻ bảo hành (${orderGroups.length} nhóm / ${totalElements} thẻ)`
            : `Danh sách thẻ bảo hành (${totalElements})`
        }
        refreshing={activeQuery.isFetching && items.length > 0}
        busy={activeQuery.isFetching}
        headerActions={
          <div className="flex flex-wrap items-center gap-2">
            {viewMode === 'grouped' && expandableKeys.length > 0 && (
              <Button type="button" variant="secondary" size="sm" onClick={toggleExpandAll}>
                {allExpanded ? (
                  <>
                    <ChevronsDownUp className="h-3.5 w-3.5" aria-hidden="true" />
                    Thu gọn tất cả
                  </>
                ) : (
                  <>
                    <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                    Mở tất cả
                  </>
                )}
              </Button>
            )}
            <div
              role="group"
              aria-label="Chế độ hiển thị"
              className="inline-flex rounded-lg border border-aqs-border bg-aqs-surface-subtle p-0.5 text-xs"
            >
              <button
                type="button"
                aria-pressed={viewMode === 'grouped'}
                onClick={() => {
                  setViewMode('grouped')
                  setPage(1)
                }}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  viewMode === 'grouped'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                Theo đơn hàng
              </button>
              <button
                type="button"
                aria-pressed={viewMode === 'flat'}
                onClick={() => {
                  setViewMode('flat')
                  setPage(1)
                }}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                  viewMode === 'flat'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" aria-hidden="true" />
                Từng thẻ
              </button>
            </div>
          </div>
        }
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
          <ManagementTableSkeleton columns={viewMode === 'grouped' ? 5 : 8} rows={5} />
        ) : viewMode === 'grouped' ? (
          <WarrantyGroupedOrderTable
            groups={orderGroups}
            expandedKeys={expandedGroupKeys}
            onToggleGroup={toggleGroup}
            customerScope={false}
            canVoid={canVoid}
            onViewDetail={(id) => navigate(`${detailBasePath}/${id}`)}
            onClaim={(id) => setClaimRecordId(id)}
            onVoid={(row) => setVoidTarget(row)}
            emptyMessage="Không tìm thấy thẻ bảo hành nào phù hợp với điều kiện lọc."
          />
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
    </ManagementPageShell>
  )
}
