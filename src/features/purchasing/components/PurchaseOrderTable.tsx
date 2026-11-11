import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle2,
  XCircle,
  FileDown,
  AlertCircle,
} from 'lucide-react'
import type { PurchaseOrderListItemResponse } from '../types/purchaseOrder.types'
import { PurchaseOrderStatusBadge } from './PurchaseOrderStatusBadge'

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
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left cursor-pointer transition-colors ${
                    item.danger
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${item.danger ? 'text-rose-500' : 'text-slate-400'}`} />
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

interface PurchaseOrderTableProps {
  items: PurchaseOrderListItemResponse[]
  isLoading?: boolean
  onConfirm: (po: PurchaseOrderListItemResponse) => void
  onCancel: (po: PurchaseOrderListItemResponse) => void
  onClosePo: (po: PurchaseOrderListItemResponse) => void
  onExportPdf: (po: PurchaseOrderListItemResponse) => void
}

export function PurchaseOrderTable({
  items,
  isLoading,
  onConfirm,
  onCancel,
  onClosePo,
  onExportPdf,
}: PurchaseOrderTableProps) {
  const navigate = useNavigate()

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-12 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-3"></div>
        <p className="text-sm">Đang tải danh sách đơn mua hàng...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <FileDown className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-slate-700">Không có đơn mua hàng nào</p>
        <p className="text-xs text-slate-500 mt-1">
          Chưa có đơn mua hàng hoặc không khớp với bộ lọc hiện tại.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-xs">
        <thead className="bg-gray-50 font-medium text-gray-500">
          <tr>
            <th scope="col" className="px-4 py-3 text-left w-44">Mã PO</th>
            <th scope="col" className="px-4 py-3 text-left">Nhà cung cấp</th>
            <th scope="col" className="px-4 py-3 text-left w-32">Kho nhận</th>
            <th scope="col" className="px-4 py-3 text-left w-36">Ngày lập / Dự kiến</th>
            <th scope="col" className="px-4 py-3 text-center w-20">Số dòng</th>
            <th scope="col" className="px-4 py-3 text-right w-36">Tổng tiền</th>
            <th scope="col" className="px-4 py-3 text-left w-36">Trạng thái</th>
            <th scope="col" className="px-4 py-3 text-right w-56 pr-4">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 text-gray-600">
          {items.map((po) => {
            const isDraft = po.status === 'DRAFT'
            const isConfirmed = po.status === 'CONFIRMED'
            const isPartiallyReceived = po.status === 'PARTIALLY_RECEIVED'
            const hasPrice = (po.totalAmount ?? 0) > 0

            const moreItems: DropdownItem[] = []

            let actionButton: {
              label: string
              icon: typeof Eye
              onClick: () => void
              className: string
            } | null = null

            if (isDraft) {
              if (hasPrice) {
                actionButton = {
                  label: 'Xác nhận',
                  icon: CheckCircle2,
                  onClick: () => onConfirm(po),
                  className: 'bg-sky-600 hover:bg-sky-700 text-white border-sky-600',
                }
                moreItems.push({
                  icon: Edit,
                  label: 'Sửa / Nhập giá',
                  onClick: () => navigate(`/app/purchase-orders/${po.purchaseOrderId}/edit`),
                })
              } else {
                actionButton = {
                  label: 'Nhập giá',
                  icon: Edit,
                  onClick: () => navigate(`/app/purchase-orders/${po.purchaseOrderId}/edit`),
                  className: 'border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800',
                }
                moreItems.push({
                  icon: CheckCircle2,
                  label: 'Xác nhận đơn PO',
                  onClick: () => onConfirm(po),
                })
              }
              moreItems.push({
                icon: FileDown,
                label: 'Xuất file PDF',
                onClick: () => onExportPdf(po),
              })
              moreItems.push({
                icon: XCircle,
                label: 'Hủy đơn PO',
                onClick: () => onCancel(po),
                danger: true,
              })
            } else if (isConfirmed) {
              actionButton = {
                label: 'Xuất PDF',
                icon: FileDown,
                onClick: () => onExportPdf(po),
                className: 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700',
              }
              moreItems.push({
                icon: XCircle,
                label: 'Hủy đơn PO',
                onClick: () => onCancel(po),
                danger: true,
              })
            } else if (isPartiallyReceived) {
              actionButton = {
                label: 'Đóng PO',
                icon: AlertCircle,
                onClick: () => onClosePo(po),
                className: 'border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800',
              }
              moreItems.push({
                icon: FileDown,
                label: 'Xuất file PDF',
                onClick: () => onExportPdf(po),
              })
            } else {
              actionButton = {
                label: 'Xuất PDF',
                icon: FileDown,
                onClick: () => onExportPdf(po),
                className: 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700',
              }
            }

            return (
              <tr key={po.purchaseOrderId} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-4 py-3 font-mono font-semibold">
                  <button
                    type="button"
                    onClick={() => navigate(`/app/purchase-orders/${po.purchaseOrderId}`)}
                    className="text-sky-600 hover:text-sky-800 hover:underline cursor-pointer text-left"
                  >
                    {po.poCode}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-800 line-clamp-1">
                    {po.supplierName || '—'}
                  </div>
                  {po.supplierCode && (
                    <div className="text-[11px] font-mono text-slate-400">
                      {po.supplierCode}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                    {po.warehouseCode || 'WH_MAIN'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <div className="font-medium text-slate-800">{po.orderDate}</div>
                  {po.expectedDate && (
                    <div className="text-[11px] text-slate-400 mt-0.5">Dự kiến: {po.expectedDate}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-center font-medium text-slate-700">
                  {po.totalItems}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                  {formatCurrency(po.totalAmount)}
                </td>
                <td className="px-4 py-3 text-left">
                  <PurchaseOrderStatusBadge status={po.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                    {/* Nút 1: Xem luôn cố định */}
                    <button
                      type="button"
                      onClick={() => navigate(`/app/purchase-orders/${po.purchaseOrderId}`)}
                      title="Xem chi tiết đơn mua"
                      className="inline-flex h-7 w-14 items-center justify-center gap-1 rounded border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      <span>Xem</span>
                    </button>

                    {/* Nút 2: Action chính cố định w-[92px] */}
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
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
