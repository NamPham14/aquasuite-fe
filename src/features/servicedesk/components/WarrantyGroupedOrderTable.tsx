import { Fragment } from 'react'
import { ChevronDown, ChevronRight, Package, ShieldCheck, Wrench } from 'lucide-react'
import type { WarrantyDisplayStatus, WarrantyRecordListItem } from '../types/warranty.types'
import type { OrderWarrantyGroup } from '../utils/warrantyGrouping'
import { WarrantyStatusBadge } from './WarrantyStatusBadge'
import { ManagementRowActions } from '../../../shared/ui/ManagementRowActions'

const SUMMARY_BADGES_MANAGEMENT: Array<{
  key: WarrantyDisplayStatus
  label: string
  className: string
}> = [
  { key: 'ACTIVE', label: 'còn hạn', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { key: 'CLAIMED', label: 'đang BH', className: 'border-sky-200 bg-sky-50 text-sky-700' },
  { key: 'EXPIRED', label: 'hết hạn', className: 'border-slate-200 bg-slate-100 text-slate-600' },
  { key: 'VOIDED', label: 'đã hủy', className: 'border-rose-200 bg-rose-50 text-rose-700' },
]

const SUMMARY_BADGES_EDITORIAL: Array<{
  key: WarrantyDisplayStatus
  label: string
  className: string
}> = [
  { key: 'ACTIVE', label: 'còn hạn', className: 'border-[#C6DDD0] bg-[#EEF5F1] text-[#245C42]' },
  { key: 'CLAIMED', label: 'đang BH', className: 'border-[#D6D1C7] bg-[#F2EFE9] text-[#8C6D46]' },
  { key: 'EXPIRED', label: 'hết hạn', className: 'border-[#D6D1C7] bg-[#FAF9F6] text-[#6B6760]' },
  { key: 'VOIDED', label: 'đã hủy', className: 'border-[#E5B8B8] bg-[#FEF2F2] text-[#991B1B]' },
]

function summarizeProducts(records: readonly WarrantyRecordListItem[]): {
  primaryTitle: string
  extraNote: string | null
} {
  if (records.length === 0) {
    return { primaryTitle: '—', extraNote: null }
  }
  const first = records[0]
  const primaryTitle = first.productName || first.variantName || first.sku || 'Sản phẩm'
  if (records.length === 1) {
    return {
      primaryTitle,
      extraNote: first.sku ? `SKU: ${first.sku}` : null,
    }
  }
  const distinctNames = new Set(records.map((r) => r.productName || r.variantName || r.sku || r.warrantyCode))
  if (distinctNames.size === 1) {
    return {
      primaryTitle,
      extraNote: `${records.length} thẻ bảo hành (cùng dòng sản phẩm)`,
    }
  }
  return {
    primaryTitle,
    extraNote: `+ ${records.length - 1} thẻ sản phẩm khác trong đơn`,
  }
}

export function WarrantyGroupedOrderTable({
  groups,
  expandedKeys,
  onToggleGroup,
  customerScope,
  canVoid,
  onViewDetail,
  onClaim,
  onVoid,
  emptyMessage,
}: {
  groups: readonly OrderWarrantyGroup[]
  expandedKeys: ReadonlySet<string>
  onToggleGroup: (groupKey: string) => void
  customerScope: boolean
  canVoid: boolean
  onViewDetail: (warrantyRecordId: string) => void
  onClaim: (warrantyRecordId: string) => void
  onVoid: (record: WarrantyRecordListItem) => void
  emptyMessage: string
}) {
  const columnCount = customerScope ? 4 : 5
  const summaryBadges = customerScope ? SUMMARY_BADGES_EDITORIAL : SUMMARY_BADGES_MANAGEMENT
  const badgeTone = customerScope ? 'editorial' : 'management'

  const renderRecordActions = (row: WarrantyRecordListItem) => {
    if (customerScope) {
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
        <div className="flex items-center justify-end gap-2 whitespace-nowrap">
          <button
            type="button"
            onClick={() => onViewDetail(row.warrantyRecordId)}
            className="border border-[#D6D1C7] bg-white px-3 py-1.5 text-[11px] font-medium text-[#171614] hover:border-[#171614] transition-colors cursor-pointer"
          >
            Hồ sơ
          </button>
          <button
            type="button"
            disabled={!canClaim}
            title={tooltip}
            onClick={() => onClaim(row.warrantyRecordId)}
            className="inline-flex items-center gap-1 border border-[#171614] bg-[#171614] px-3 py-1.5 text-[11px] font-medium text-[#FAF9F6] hover:bg-[#2A2825] disabled:cursor-not-allowed disabled:border-[#E6E2DA] disabled:bg-[#F2EFE9] disabled:text-[#8C867C] transition-colors cursor-pointer"
          >
            <Wrench className="h-3 w-3 text-[#C5B091]" aria-hidden="true" />
            <span>Yêu cầu BH</span>
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
        onClick: () => onViewDetail(row.warrantyRecordId),
      },
    ]
    if (canVoid && row.status === 'ACTIVE') {
      actions.push({
        variant: 'delete',
        label: 'Hủy thẻ',
        ariaLabel: `Hủy thẻ bảo hành ${row.warrantyCode}`,
        disabled: row.displayStatus === 'CLAIMED',
        onClick: () => onVoid(row),
      })
    }
    return <ManagementRowActions actions={actions} />
  }

  return (
    <div className="overflow-x-auto" role="region" aria-labelledby="warranty-table-heading" tabIndex={0}>
      <table
        aria-labelledby="warranty-table-heading"
        className={`min-w-full border-collapse text-[13px] ${
          customerScope ? 'text-[#171614]' : 'text-aqs-ink-muted'
        }`}
      >
        <thead
          className={
            customerScope
              ? 'bg-[#FAF9F6] text-[#78736A]'
              : 'bg-aqs-surface text-aqs-ink-faint'
          }
        >
          <tr className={customerScope ? 'border-b border-[#E6E2DA]' : 'border-b border-aqs-border'}>
            <th
              scope="col"
              className={`h-[42px] px-4 text-left whitespace-nowrap ${
                customerScope ? 'text-[10px] uppercase tracking-[0.16em] font-medium' : 'text-xs font-semibold'
              }`}
            >
              Đơn hàng / Nguồn cấp
            </th>
            <th
              scope="col"
              className={`h-[42px] px-4 text-left whitespace-nowrap ${
                customerScope ? 'text-[10px] uppercase tracking-[0.16em] font-medium' : 'text-xs font-semibold'
              }`}
            >
              Sản phẩm tóm tắt
            </th>
            {!customerScope && (
              <th scope="col" className="h-[42px] px-3.5 text-left text-xs font-semibold whitespace-nowrap">
                Khách hàng
              </th>
            )}
            <th
              scope="col"
              className={`h-[42px] px-4 text-left whitespace-nowrap ${
                customerScope ? 'text-[10px] uppercase tracking-[0.16em] font-medium' : 'text-xs font-semibold'
              }`}
            >
              Tổng quan thẻ
            </th>
            <th
              scope="col"
              className={`h-[42px] px-4 text-right whitespace-nowrap ${
                customerScope ? 'text-[10px] uppercase tracking-[0.16em] font-medium' : 'text-xs font-semibold'
              }`}
            >
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody className={customerScope ? 'divide-y divide-[#E6E2DA]' : 'divide-y divide-aqs-divider'}>
          {groups.map((group) => {
            const isExpanded = expandedKeys.has(group.groupKey)
            const singleRecord = group.records.length === 1 ? group.records[0] : null
            const summary = summarizeProducts(group.records)

            if (group.isAdHoc && singleRecord) {
              return (
                <tr
                  key={group.groupKey}
                  className={
                    customerScope
                      ? 'transition-colors duration-150 hover:bg-[#FAF9F6]'
                      : 'transition-colors duration-150 hover:bg-aqs-surface-subtle'
                  }
                >
                  <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center border ${
                          customerScope
                            ? 'border-[#E6E2DA] bg-[#FAF9F6] text-[#8C6D46]'
                            : 'rounded-md border-slate-200 bg-slate-50 text-slate-500'
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <div>
                        <button
                          type="button"
                          onClick={() => onViewDetail(singleRecord.warrantyRecordId)}
                          className={`font-semibold hover:underline cursor-pointer ${
                            customerScope ? 'font-mono text-[#171614]' : 'text-sky-700'
                          }`}
                        >
                          {singleRecord.warrantyCode}
                        </button>
                        <div className="text-[11px] text-[#78736A]">Cấp lẻ (Ad-hoc)</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <div className="min-w-[210px] max-w-[280px] whitespace-normal break-words leading-snug">
                      <div className="font-medium text-[#171614]">
                        {singleRecord.productName || singleRecord.variantName || '—'}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#78736A]">
                        SKU: {singleRecord.sku || '—'} &middot; Serial: {singleRecord.serialNumber || 'Không theo dõi'}
                      </div>
                    </div>
                  </td>
                  {!customerScope && (
                    <td className="px-3.5 py-3 align-middle">
                      <div className="min-w-[140px] max-w-[210px] whitespace-normal break-words leading-snug">
                        <div className="font-medium text-slate-900">{group.customerName || '—'}</div>
                        <div className="text-[11px] text-slate-500">{group.phoneNumber || 'Chưa có SĐT'}</div>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      <WarrantyStatusBadge status={singleRecord.displayStatus} tone={badgeTone} />
                      <span className="text-[11px] text-[#78736A] tabular-nums">
                        {singleRecord.startDate} &rarr; {singleRecord.endDate}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                    {renderRecordActions(singleRecord)}
                  </td>
                </tr>
              )
            }

            return (
              <Fragment key={group.groupKey}>
                <tr
                  className={`transition-colors duration-150 ${
                    customerScope
                      ? isExpanded
                        ? 'bg-[#FAF9F6]'
                        : 'hover:bg-[#FAF9F6]'
                      : isExpanded
                        ? 'bg-sky-50/40'
                        : 'hover:bg-aqs-surface-subtle'
                  }`}
                >
                  <td className="px-4 py-3.5 align-middle whitespace-nowrap">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => onToggleGroup(group.groupKey)}
                      className="group flex items-center gap-3 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-focus"
                    >
                      <span
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center border transition-colors ${
                          customerScope
                            ? isExpanded
                              ? 'border-[#171614] bg-[#171614] text-[#FAF9F6]'
                              : 'border-[#D6D1C7] bg-white text-[#57534E] group-hover:border-[#171614]'
                            : isExpanded
                              ? 'rounded-md border-sky-300 bg-sky-100 text-sky-700'
                              : 'rounded-md border-slate-200 bg-white text-slate-500 group-hover:border-sky-200 group-hover:text-sky-700'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Package
                            className={`h-3.5 w-3.5 ${customerScope ? 'text-[#8C6D46]' : 'text-slate-400'}`}
                            aria-hidden="true"
                          />
                          <span
                            className={`font-semibold ${
                              customerScope
                                ? 'font-mono text-[#171614]'
                                : 'text-slate-900 group-hover:text-sky-700'
                            }`}
                          >
                            {group.orderCode || 'Đơn hàng'}
                          </span>
                        </div>
                        <div
                          className={`text-[11px] font-medium ${
                            customerScope ? 'text-[#8C6D46]' : 'text-sky-700'
                          }`}
                        >
                          {group.records.length} thẻ bảo hành
                        </div>
                      </div>
                    </button>
                  </td>

                  <td className="px-4 py-3.5 align-middle">
                    <div className="min-w-[210px] max-w-[300px] whitespace-normal break-words leading-snug">
                      <div className="font-medium text-[#171614]">{summary.primaryTitle}</div>
                      {summary.extraNote && (
                        <div className="mt-0.5 text-[11px] text-[#78736A]">{summary.extraNote}</div>
                      )}
                    </div>
                  </td>

                  {!customerScope && (
                    <td className="px-3.5 py-3 align-middle">
                      <div className="min-w-[140px] max-w-[210px] whitespace-normal break-words leading-snug">
                        <div className="font-medium text-slate-900">{group.customerName || '—'}</div>
                        <div className="text-[11px] text-slate-500">{group.phoneNumber || 'Chưa có SĐT'}</div>
                      </div>
                    </td>
                  )}

                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {summaryBadges.map(({ key, label, className }) => {
                        const count = group.statusCounts[key] ?? 0
                        if (count === 0) return null
                        return (
                          <span
                            key={key}
                            className={`inline-flex items-center border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap ${
                              customerScope ? '' : 'rounded-full'
                            } ${className}`}
                          >
                            {count} {label}
                          </span>
                        )
                      })}
                    </div>
                  </td>

                  <td className="px-4 py-3.5 text-right align-middle whitespace-nowrap">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => onToggleGroup(group.groupKey)}
                      className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                        customerScope
                          ? 'border-[#D6D1C7] bg-white text-[#171614] hover:border-[#171614]'
                          : 'rounded-md border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700'
                      }`}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                          Thu gọn
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                          Xem {group.records.length} thẻ
                        </>
                      )}
                    </button>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className={customerScope ? 'bg-[#FAF9F6]' : 'bg-slate-50/80'}>
                    <td colSpan={columnCount} className="px-4 py-3.5 sm:pl-12">
                      <div
                        className={`overflow-x-auto border bg-white ${
                          customerScope ? 'border-[#E6E2DA]' : 'rounded-lg border-slate-200 shadow-xs'
                        }`}
                      >
                        <table className="min-w-full border-collapse text-xs text-[#57534E]">
                          <thead
                            className={`border-b text-[11px] font-semibold ${
                              customerScope
                                ? 'border-[#E6E2DA] bg-[#F2EFE9] text-[#78736A]'
                                : 'border-slate-200 bg-slate-50/90 text-slate-500'
                            }`}
                          >
                            <tr>
                              <th scope="col" className="px-3.5 py-2.5 text-left whitespace-nowrap">
                                Mã bảo hành
                              </th>
                              <th scope="col" className="px-3.5 py-2.5 text-left whitespace-nowrap">
                                Sản phẩm / SKU
                              </th>
                              <th scope="col" className="px-3.5 py-2.5 text-left whitespace-nowrap">
                                Serial / Barcode
                              </th>
                              <th scope="col" className="px-3.5 py-2.5 text-left whitespace-nowrap">
                                Hiệu lực
                              </th>
                              <th scope="col" className="px-3.5 py-2.5 text-left whitespace-nowrap">
                                Trạng thái
                              </th>
                              <th scope="col" className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                Thao tác
                              </th>
                            </tr>
                          </thead>
                          <tbody className={customerScope ? 'divide-y divide-[#E6E2DA]' : 'divide-y divide-slate-100'}>
                            {group.records.map((rec) => (
                              <tr key={rec.warrantyRecordId} className="hover:bg-[#FAF9F6]">
                                <td className="px-3.5 py-2.5 align-middle whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => onViewDetail(rec.warrantyRecordId)}
                                    className={`font-semibold hover:underline cursor-pointer ${
                                      customerScope ? 'font-mono text-[#171614]' : 'text-sky-700'
                                    }`}
                                  >
                                    {rec.warrantyCode}
                                  </button>
                                </td>
                                <td className="px-3.5 py-2.5 align-middle">
                                  <div className="min-w-[210px] max-w-[290px] whitespace-normal break-words leading-snug">
                                    <div className="font-medium text-[#171614]">
                                      {rec.productName || rec.variantName || '—'}
                                    </div>
                                    {rec.variantName && rec.productName && rec.variantName !== rec.productName && (
                                      <div className="text-[11px] text-[#78736A]">{rec.variantName}</div>
                                    )}
                                    <div className="mt-0.5 text-[11px] text-[#78736A]">SKU: {rec.sku || '—'}</div>
                                  </div>
                                </td>
                                <td className="px-3.5 py-2.5 align-middle">
                                  <span className="inline-block max-w-[180px] whitespace-normal break-all font-mono text-[11px] text-[#171614]">
                                    {rec.serialNumber || 'Không theo dõi'}
                                  </span>
                                </td>
                                <td className="px-3.5 py-2.5 align-middle whitespace-nowrap">
                                  <div className="text-[#171614] tabular-nums">
                                    {rec.startDate} &rarr; {rec.endDate}
                                  </div>
                                  <div className="text-[11px] text-[#78736A]">
                                    {rec.remainingDays > 0 ? `Còn ${rec.remainingDays} ngày` : '0 ngày còn lại'}
                                  </div>
                                </td>
                                <td className="px-3.5 py-2.5 align-middle whitespace-nowrap">
                                  <WarrantyStatusBadge status={rec.displayStatus} tone={badgeTone} />
                                </td>
                                <td className="px-3.5 py-2.5 text-right align-middle whitespace-nowrap">
                                  {renderRecordActions(rec)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}

          {groups.length === 0 && (
            <tr>
              <td colSpan={columnCount} className="px-4 py-10 text-center text-xs text-[#78736A]">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
