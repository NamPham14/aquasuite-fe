import { useState, useRef, useEffect, useMemo, Fragment } from 'react'
import { createPortal } from 'react-dom'
import {
  Eye,
  Pencil,
  ShieldCheck,
  Send,
  GitBranch,
  CheckCircle2,
  XCircle,
  Trash2,
  History,
  MoreHorizontal,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { QuotationStatusBadge } from './QuotationStatusBadge'
import { useGetRevisionHistoryQuery } from '../api/quotationApi'
import type { QuotationListItemResponse } from '../types/quotation.types'

interface QuotationTableProps {
  items: QuotationListItemResponse[]
  isLoading?: boolean
  isAdmin?: boolean
  onView: (item: QuotationListItemResponse) => void
  onEdit: (item: QuotationListItemResponse) => void
  onDelete: (item: QuotationListItemResponse) => void
  onSubmitApproval: (item: QuotationListItemResponse) => void
  onApprove: (item: QuotationListItemResponse) => void
  onReject: (item: QuotationListItemResponse) => void
  onSend: (item: QuotationListItemResponse) => void
  onCreateRevision: (item: QuotationListItemResponse) => void
  onMarkAccepted: (item: QuotationListItemResponse) => void
  onMarkLost: (item: QuotationListItemResponse) => void
  onRevisionHistory?: (item: QuotationListItemResponse) => void
}

interface DropdownItem {
  icon: typeof Eye
  label: string
  onClick: () => void
  danger?: boolean
}

function RowActionDropdown({ items }: { items: DropdownItem[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null)

  const handleToggle = () => {
    if (!isOpen) {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        // Menu cao ~150px, nếu đáy màn hình không đủ chỗ thì bung ngược lên trên
        const openUpward = spaceBelow < 180 && rect.top > 180
        setMenuPos({
          top: openUpward ? undefined : rect.bottom + 4,
          bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
          right: window.innerWidth - rect.right,
        })
      }
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    function handleScrollOrResize() {
      if (isOpen) setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen])

  if (items.length === 0) return null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        title="Thao tác khác"
        className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shrink-0 shadow-2xs"
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      {isOpen &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuPos.top !== undefined ? `${menuPos.top}px` : undefined,
              bottom: menuPos.bottom !== undefined ? `${menuPos.bottom}px` : undefined,
              right: `${menuPos.right}px`,
              zIndex: 9999,
            }}
            className="w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg focus:outline-hidden"
          >
            {items.map((item, idx) => {
              const Icon = item.icon
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsOpen(false)
                    item.onClick()
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                    item.danger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>,
          document.body
        )}
    </>
  )
}

/**
 * Bảng con hiển thị danh sách các phiên bản đàm phán nhánh của một mã báo giá
 */
function QuotationRevisionSubTable({
  quotationCode,
  currentRevisionNo,
  fallbackItems,
  onView,
  formatMoney,
}: {
  quotationCode: string
  currentRevisionNo: number
  fallbackItems: QuotationListItemResponse[]
  onView: (item: QuotationListItemResponse) => void
  formatMoney: (val?: number) => string
}) {
  const { data, isLoading } = useGetRevisionHistoryQuery(quotationCode)

  const revisions = data && data.length > 0 ? data : fallbackItems

  return (
    <div className="px-6 py-3.5 bg-slate-50/95 border-y border-slate-200/90 space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <GitBranch className="w-4 h-4 text-sky-700 shrink-0" />
          <span>Cây lịch sử đàm phán ({quotationCode})</span>
          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-[10px] font-semibold text-sky-800 border border-sky-200">
            {revisions.length} phiên bản
          </span>
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-sky-600 animate-spin" />}
        </div>
        <span className="text-[11px] text-slate-500">
          Phiên bản mới nhất đang hiển thị trên dòng chính của bảng
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-2xs">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200">
              <th className="py-2.5 px-3 w-40">Phiên bản</th>
              <th className="py-2.5 px-3">Tên dự án</th>
              <th className="py-2.5 px-3 w-28">Ngày lập</th>
              <th className="py-2.5 px-3 w-32 text-right">Tổng tiền</th>
              <th className="py-2.5 px-3 w-32 text-center">Trạng thái</th>
              <th className="py-2.5 px-3 w-24 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {revisions.map((rev) => {
              const isCurrent = rev.revisionNo === currentRevisionNo

              return (
                <tr
                  key={rev.quotationId}
                  className={`transition-colors ${
                    isCurrent ? 'bg-sky-50/50 font-medium' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <td className="py-2 px-3">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded bg-sky-100 text-[11px] font-bold text-sky-800 border border-sky-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0" />
                        rev.{rev.revisionNo} (Hiện tại)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-[11px] font-medium text-slate-600 border border-slate-200">
                        <span className="text-slate-400">└─</span>
                        rev.{rev.revisionNo} (Bản cũ)
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <span className="truncate max-w-[200px] block" title={rev.projectName}>
                      {rev.projectName}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-600 tabular-nums">{rev.quotationDate}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                    {formatMoney(rev.totalAmount)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <QuotationStatusBadge status={rev.status} />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => onView(rev)}
                      title={`Xem chi tiết rev.${rev.revisionNo}`}
                      className="inline-flex h-6.5 w-14 items-center justify-center gap-1 rounded border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Eye className="h-3 w-3 text-slate-500" />
                      <span>Xem</span>
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface QuotationGroup {
  quotationCode: string
  latestItem: QuotationListItemResponse
  revisions: QuotationListItemResponse[]
  hasMultipleRevisions: boolean
}

export function QuotationTable({
  items,
  isLoading,
  isAdmin = false,
  onView,
  onEdit,
  onDelete,
  onSubmitApproval,
  onApprove,
  onReject,
  onSend,
  onCreateRevision,
  onMarkAccepted,
  onMarkLost,
  onRevisionHistory,
}: QuotationTableProps) {
  // Trạng thái mở rộng các nhánh phiên bản của từng báo giá
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(new Set())

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  const formatMoney = (val?: number) => {
    if (val === undefined || isNaN(val)) return '0 đ'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  // Gom nhóm danh sách theo Mã Báo Giá (quotationCode)
  const groups: QuotationGroup[] = useMemo(() => {
    const map = new Map<string, QuotationListItemResponse[]>()

    for (const item of items) {
      const list = map.get(item.quotationCode) || []
      list.push(item)
      map.set(item.quotationCode, list)
    }

    const result: QuotationGroup[] = []
    for (const [code, list] of map.entries()) {
      // Sắp xếp bản mới nhất (revisionNo cao nhất) lên đầu
      list.sort((a, b) => b.revisionNo - a.revisionNo)
      const latestItem = list[0]
      const hasMultipleRevisions = latestItem.revisionNo > 1 || list.length > 1

      result.push({
        quotationCode: code,
        latestItem,
        revisions: list,
        hasMultipleRevisions,
      })
    }

    return result
  }, [items])

  return (
    <div className="overflow-x-auto" role="region" aria-labelledby="quotation-list" tabIndex={0}>
      <table aria-labelledby="quotation-list" className="min-w-full divide-y divide-gray-200 text-xs">
        <thead className="bg-gray-50 font-medium text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3 text-left w-56">Mã Báo Giá</th>
            <th scope="col" className="px-4 py-3 text-left">Dự án / Khách hàng</th>
            <th scope="col" className="px-4 py-3 text-left w-32">Ngày lập / Hạn</th>
            <th scope="col" className="px-4 py-3 text-right w-36">Tổng tiền</th>
            <th scope="col" className="px-4 py-3 text-left w-36">Trạng thái</th>
            <th scope="col" className="px-4 py-3 text-right w-48 pr-4">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-gray-600">
          {groups.map((group) => {
            const row = group.latestItem
            const isExpanded = expandedCodes.has(group.quotationCode)
            const revisionCount = Math.max(group.revisions.length, row.revisionNo)

            const moreItems: DropdownItem[] = []

            let actionButton: {
              label: string
              icon: typeof Eye
              onClick: () => void
              className: string
            } | null = null

            switch (row.status) {
              case 'DRAFT': {
                if (row.requiresApproval === false) {
                  actionButton = {
                    label: 'Gửi khách',
                    icon: Send,
                    onClick: () => onSend(row),
                    className: 'border-sky-800 bg-sky-700 hover:bg-sky-800 text-white',
                  }
                  moreItems.push({
                    icon: Pencil,
                    label: 'Chỉnh sửa báo giá',
                    onClick: () => onEdit(row),
                  })
                } else {
                  if (isAdmin) {
                    actionButton = {
                      label: 'Duyệt',
                      icon: ShieldCheck,
                      onClick: () => onApprove(row),
                      className: 'border-sky-800 bg-sky-700 hover:bg-sky-800 text-white',
                    }
                    moreItems.push({
                      icon: Pencil,
                      label: 'Chỉnh sửa báo giá',
                      onClick: () => onEdit(row),
                    })
                  } else {
                    actionButton = {
                      label: 'Sửa',
                      icon: Pencil,
                      onClick: () => onEdit(row),
                      className: 'border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800',
                    }
                  }
                }
                if (row.revisionNo === 1) {
                  moreItems.push({
                    icon: Trash2,
                    label: 'Xóa vĩnh viễn báo giá',
                    onClick: () => onDelete(row),
                    danger: true,
                  })
                }
                break
              }

              case 'PENDING_APPROVAL': {
                if (isAdmin) {
                  actionButton = {
                    label: 'Duyệt',
                    icon: ShieldCheck,
                    onClick: () => onApprove(row),
                    className: 'border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white',
                  }
                  moreItems.push({
                    icon: XCircle,
                    label: 'Từ chối phê duyệt',
                    onClick: () => onReject(row),
                    danger: true,
                  })
                }
                break
              }

              case 'APPROVED': {
                actionButton = {
                  label: 'Gửi khách',
                  icon: Send,
                  onClick: () => onSend(row),
                  className: 'border-sky-800 bg-sky-700 hover:bg-sky-800 text-white',
                }
                moreItems.push({
                  icon: GitBranch,
                  label: 'Tạo bản Revision mới',
                  onClick: () => onCreateRevision(row),
                })
                break
              }

              case 'SENT': {
                actionButton = {
                  label: 'Chốt đơn',
                  icon: CheckCircle2,
                  onClick: () => onMarkAccepted(row),
                  className: 'border-emerald-700 bg-emerald-600 hover:bg-emerald-700 text-white',
                }
                moreItems.push({
                  icon: GitBranch,
                  label: 'Tạo bản Revision mới',
                  onClick: () => onCreateRevision(row),
                })
                moreItems.push({
                  icon: XCircle,
                  label: 'Ghi nhận mất dự án',
                  onClick: () => onMarkLost(row),
                  danger: true,
                })
                break
              }

              case 'REJECTED': {
                actionButton = {
                  label: 'Sửa',
                  icon: Pencil,
                  onClick: () => onEdit(row),
                  className: 'border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800',
                }
                moreItems.push({
                  icon: ShieldCheck,
                  label: 'Trình duyệt lại',
                  onClick: () => onSubmitApproval(row),
                })
                break
              }

              case 'ACCEPTED': {
                // Đã chốt đơn thành công -> Không cho phép tạo revision nữa
                break
              }

              case 'LOST': {
                // Mất dự án -> Cho phép tạo bản revision mới để tái đàm phán / hồi sinh dự án
                moreItems.push({
                  icon: GitBranch,
                  label: 'Tạo bản Revision mới',
                  onClick: () => onCreateRevision(row),
                })
                break
              }

              case 'SUPERSEDED':
              default: {
                break
              }
            }

            if (onRevisionHistory) {
              moreItems.push({
                icon: History,
                label: 'Lịch sử phiên bản',
                onClick: () => onRevisionHistory(row),
              })
            }

            return (
              <Fragment key={group.quotationCode}>
                <tr className={`hover:bg-slate-50/70 transition ${isExpanded ? 'bg-sky-50/20' : ''}`}>
                  {/* Cột 1: Mã Báo Giá + Nút xổ nhánh */}
                  <td className="whitespace-nowrap px-4 py-3 text-left">
                    <div className="flex items-center gap-1.5">
                      {group.hasMultipleRevisions ? (
                        <button
                          type="button"
                          onClick={() => toggleExpand(group.quotationCode)}
                          title={isExpanded ? 'Thu gọn các nhánh' : `Mở xem ${revisionCount} phiên bản`}
                          className="p-1 -ml-1 rounded hover:bg-slate-200/80 text-slate-500 hover:text-slate-900 transition cursor-pointer shrink-0"
                        >
                          <ChevronRight
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isExpanded ? 'rotate-90 text-sky-700' : 'text-slate-400'
                            }`}
                          />
                        </button>
                      ) : (
                        <div className="w-5 h-4 shrink-0" aria-hidden="true" />
                      )}

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sky-800 text-xs tracking-tight">
                            {row.quotationCode}
                          </span>
                          <span className="inline-block px-1.5 py-0.2 rounded bg-sky-50 text-[10px] font-semibold text-sky-700 border border-sky-200">
                            rev.{row.revisionNo}
                          </span>
                          {group.hasMultipleRevisions && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(group.quotationCode)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-purple-50 text-[10px] font-semibold text-purple-700 border border-purple-200 hover:bg-purple-100 transition cursor-pointer"
                              title="Bấm để xổ danh sách các phiên bản"
                            >
                              <GitBranch className="w-2.5 h-2.5" />
                              <span>{revisionCount} bản</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Cột 2: Dự án / Khách hàng */}
                  <td className="whitespace-nowrap px-4 py-3 text-left">
                    <div className="flex flex-col gap-0.5 max-w-[200px] xl:max-w-xs">
                      <span className="font-semibold text-slate-800 text-xs truncate" title={row.projectName}>
                        {row.projectName}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate" title={row.customerName}>
                        {row.customerName || 'Khách vãng lai'}
                      </span>
                    </div>
                  </td>

                  {/* Cột 3: Ngày lập / Hạn */}
                  <td className="whitespace-nowrap px-4 py-3 text-left">
                    <div className="flex flex-col gap-0.5 text-xs text-slate-700">
                      <span className="font-medium text-slate-800">{row.quotationDate}</span>
                      <span className="text-[11px] text-slate-400">Hạn: {row.validUntil || '---'}</span>
                    </div>
                  </td>

                  {/* Cột 4: Tổng tiền */}
                  <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-xs text-slate-900 tabular-nums">
                    {formatMoney(row.totalAmount)}
                  </td>

                  {/* Cột 5: Trạng thái */}
                  <td className="whitespace-nowrap px-4 py-3 text-left">
                    <QuotationStatusBadge status={row.status} />
                  </td>

                  {/* Cột 6: Thao tác */}
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                      {/* Nút 1: Xem luôn cố định ở vị trí đầu tiên */}
                      <button
                        type="button"
                        onClick={() => onView(row)}
                        title="Xem chi tiết báo giá"
                        className="inline-flex h-7 w-14 items-center justify-center gap-1 rounded border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                        <span>Xem</span>
                      </button>

                      {/* Nút 2: Hành động chính cố định chính xác w-[92px] để các nút bằng nhau 100% */}
                      {actionButton ? (
                        <button
                          type="button"
                          onClick={actionButton.onClick}
                          title={actionButton.label}
                          className={`inline-flex h-7 w-[92px] items-center justify-center gap-1.5 rounded border text-xs font-medium transition-colors cursor-pointer shrink-0 shadow-2xs ${actionButton.className}`}
                        >
                          <actionButton.icon className="h-3.5 w-3.5 shrink-0" />
                          <span>{actionButton.label}</span>
                        </button>
                      ) : (
                        <div className="w-[92px] h-7 shrink-0" aria-hidden="true" />
                      )}

                      {/* Nút 3: Menu thao tác khác (...) qua Portal thoát khỏi overflow bảng */}
                      {moreItems.length > 0 ? (
                        <RowActionDropdown items={moreItems} />
                      ) : (
                        <div className="w-7 h-7 shrink-0" aria-hidden="true" />
                      )}
                    </div>
                  </td>
                </tr>

                {/* Hàng xổ xuống hiển thị cây các phiên bản đàm phán nhánh */}
                {isExpanded && (
                  <tr>
                    <td colSpan={6} className="p-0 border-b border-slate-200">
                      <QuotationRevisionSubTable
                        quotationCode={group.quotationCode}
                        currentRevisionNo={row.revisionNo}
                        fallbackItems={group.revisions}
                        onView={onView}
                        formatMoney={formatMoney}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}

          {groups.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-600">
                {isLoading ? 'Đang tải danh sách báo giá...' : 'Chưa có báo giá nào phù hợp.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
