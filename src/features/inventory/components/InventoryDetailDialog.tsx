import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ExternalLink,
  PackageCheck,
  Plus,
  Truck,
} from 'lucide-react'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import { ManagementTable, type ManagementTableColumn } from '../../../shared/ui/ManagementTable'
import { Button } from '../../../shared/ui/Button'
import { CodeChip, Notice, StatusBadge, type StatusTone } from '../../../shared/ui/Badge'
import { useGetStockMovementsQuery } from '../api/inventoryApi'
import {
  useGetReadableStockMovementsQuery,
  useGetVariantPurchaseOrdersQuery,
} from '../api/inboundTrackingApi'
import type { InventoryListItem, StockMovement } from '../types/inventory.types'
import type {
  MovementGroupFilter,
  PurchaseOrderTrackingItem,
  ReadableStockMovementResponse,
} from '../types/inboundTracking.types'

export type InventoryDetailTab = 'history' | 'po'

interface InventoryDetailDialogProps {
  item: InventoryListItem
  initialTab?: InventoryDetailTab
  canReceiveStock?: boolean
  onClose: () => void
  onOpenReceivePo?: (po: { purchaseOrderId: string; poCode: string }) => void
}

const MOVEMENT_LABEL: Record<string, string> = {
  INITIAL_IMPORT: 'Khởi tạo đầu kỳ',
  GOODS_RECEIPT: 'Nhập mua hàng',
  STOCK_DISPATCH: 'Xuất kho',
  RETURN_IN: 'Khách trả hàng',
  SUPPLIER_RETURN: 'Trả hàng NCC',
  ADJUSTMENT_IN: 'Điều chỉnh tăng',
  ADJUSTMENT_OUT: 'Điều chỉnh giảm',
}

const GROUP_OPTIONS: readonly { value: MovementGroupFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'INBOUND', label: 'Nhập mua hàng' },
  { value: 'OUTBOUND', label: 'Xuất kho' },
  { value: 'ADJUSTMENT', label: 'Điều chỉnh & Kiểm kê' },
]

function formatShortDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('vi-VN')
}

function poStatusTone(status: string): StatusTone {
  switch (status) {
    case 'COMPLETED':
      return 'positive'
    case 'PARTIALLY_RECEIVED':
      return 'warning'
    case 'CONFIRMED':
      return 'accent'
    case 'CANCELLED':
      return 'danger'
    default:
      return 'neutral'
  }
}

/** Fallback làm sạch chuỗi JSON nội bộ ở client nếu server BE chưa kịp khởi động lại. */
function mapFallbackMovement(m: StockMovement): ReadableStockMovementResponse {
  const rawNote = m.note?.trim() ?? ''
  let displayNote = rawNote || (MOVEMENT_LABEL[m.movementType] ?? m.movementType)
  let documentCode = m.referenceId?.trim() || m.referenceType || '—'
  let deliveryId: string | null = null
  let orderId: string | null = null

  if (rawNote.startsWith('{') && rawNote.endsWith('}')) {
    try {
      const parsed = JSON.parse(rawNote) as { deliveryId?: string; orderId?: string }
      deliveryId = parsed.deliveryId ?? m.referenceId ?? null
      orderId = parsed.orderId ?? null
    } catch {
      deliveryId = m.referenceId ?? null
    }
    const shortDel = deliveryId ? `Phiếu xuất #${deliveryId.slice(0, 8)}` : 'Xuất giao hàng'
    documentCode = shortDel
    displayNote = `Xuất kho giao đơn hàng (${shortDel})`
  } else if (m.movementType === 'GOODS_RECEIPT' && m.referenceId) {
    documentCode = m.referenceId
  }

  return {
    movementId: m.movementId,
    createdAt: m.createdAt,
    movementType: m.movementType,
    movementTypeLabel: MOVEMENT_LABEL[m.movementType] ?? m.movementType,
    quantity: m.quantity,
    balanceAfter: m.balanceAfter,
    referenceType: m.referenceType,
    documentCode,
    deliveryId,
    orderId,
    displayNote,
  }
}

/**
 * Hộp thoại xem chi tiết tồn kho một SKU (UC-17.1 Bước 6 + mở rộng theo dõi Đơn mua PO & Phiếu nhập GRN).
 * Giữ nguyên tiêu đề, 4 ô số liệu gốc và bảng 6 cột của UC-17.1; bổ sung ô Đang chờ nhập (PO) và Tab PO.
 */
export function InventoryDetailDialog({
  item,
  initialTab = 'history',
  canReceiveStock = false,
  onClose,
  onOpenReceivePo,
}: InventoryDetailDialogProps) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<InventoryDetailTab>(initialTab)
  const [movementGroup, setMovementGroup] = useState<MovementGroupFilter>('ALL')
  const [includeCompletedPo, setIncludeCompletedPo] = useState(false)

  const {
    data: poDetail,
    isLoading: isPoLoading,
    isError: isPoError,
  } = useGetVariantPurchaseOrdersQuery({
    variantId: item.variantId,
    includeCompleted: includeCompletedPo,
  })

  const {
    data: readablePage,
    isLoading: isReadableLoading,
    isError: isReadableError,
  } = useGetReadableStockMovementsQuery({
    variantId: item.variantId,
    group: movementGroup,
    page: 1,
    size: 20,
  })

  const { data: legacyPage, isLoading: isLegacyLoading } = useGetStockMovementsQuery(
    { variantId: item.variantId, page: 1, size: 20 },
    { skip: !isReadableError },
  )

  const movements: ReadableStockMovementResponse[] = useMemo(() => {
    if (!isReadableError) {
      return readablePage?.items ?? []
    }
    const raw = legacyPage?.items ?? []
    return raw.map(mapFallbackMovement).filter((m) => {
      if (movementGroup === 'ALL') return true
      if (movementGroup === 'INBOUND') {
        return ['GOODS_RECEIPT', 'INITIAL_IMPORT', 'RETURN_IN'].includes(m.movementType)
      }
      if (movementGroup === 'OUTBOUND') {
        return ['STOCK_DISPATCH', 'SUPPLIER_RETURN'].includes(m.movementType)
      }
      return ['ADJUSTMENT_IN', 'ADJUSTMENT_OUT'].includes(m.movementType)
    })
  }, [isReadableError, readablePage, legacyPage, movementGroup])

  const incomingQty = poDetail?.incomingQty ?? 0
  const projectedAvailable = poDetail?.projectedAvailableQty ?? item.availableQty + incomingQty
  const openPoCount = poDetail?.openPoCount ?? 0
  const purchaseOrders = poDetail?.purchaseOrders ?? []
  const isMovementsLoading = isReadableLoading || (isReadableError && isLegacyLoading)

  const handleNavigatePo = (purchaseOrderId: string) => {
    onClose()
    navigate(`/app/purchase-orders/${purchaseOrderId}`)
  }

  const handleNavigateOrder = (orderId: string) => {
    onClose()
    navigate(`/app/orders/${orderId}`)
  }

  const movementColumns: readonly ManagementTableColumn<ReadableStockMovementResponse>[] = [
    {
      key: 'createdAt',
      header: 'Thời gian',
      cellClassName: 'whitespace-nowrap tabular-nums text-xs text-aqs-ink-muted',
      cell: (m) => new Date(m.createdAt).toLocaleString('vi-VN'),
    },
    {
      key: 'type',
      header: 'Loại',
      cell: (m) => (
        <span className="font-medium text-aqs-ink">
          {m.movementTypeLabel || MOVEMENT_LABEL[m.movementType] || m.movementType}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Số lượng',
      align: 'right',
      cellClassName: 'tabular-nums font-bold',
      cell: (m) => (
        <span className={m.quantity >= 0 ? 'text-aqs-positive' : 'text-aqs-danger'}>
          {m.quantity >= 0 ? `+${m.quantity}` : m.quantity}
        </span>
      ),
    },
    {
      key: 'balanceAfter',
      header: 'Tồn sau',
      align: 'right',
      cellClassName: 'tabular-nums font-semibold text-aqs-ink',
      cell: (m) => m.balanceAfter,
    },
    {
      key: 'reference',
      header: 'Chứng từ',
      cell: (m) => {
        if (m.purchaseOrderId) {
          return (
            <div className="flex flex-col items-start gap-1">
              <button
                type="button"
                onClick={() => handleNavigatePo(m.purchaseOrderId!)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-chip border border-aqs-accent-border bg-aqs-accent-soft px-2 py-0.5 text-xs font-bold text-aqs-accent-hover hover:bg-aqs-surface-active"
                title="Mở chi tiết đơn mua hàng"
              >
                {m.documentCode}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </button>
              {m.poCode && (
                <button
                  type="button"
                  onClick={() => setActiveTab('po')}
                  className="cursor-pointer text-[11px] font-semibold text-aqs-ink-muted hover:text-aqs-accent-hover hover:underline"
                >
                  Đơn: {m.poCode}
                </button>
              )}
            </div>
          )
        }
        if (m.orderId) {
          return (
            <button
              type="button"
              onClick={() => handleNavigateOrder(m.orderId!)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-chip border border-aqs-border bg-aqs-surface-subtle px-2 py-0.5 text-xs font-bold text-aqs-ink hover:border-aqs-accent-border hover:text-aqs-accent-hover"
              title="Mở chi tiết đơn bán hàng"
            >
              {m.documentCode}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </button>
          )
        }
        return <CodeChip tone="neutral">{m.documentCode}</CodeChip>
      },
    },
    {
      key: 'note',
      header: 'Ghi chú',
      cell: (m) => (
        <div>
          <p className="text-[13px] text-aqs-ink">{m.displayNote || '—'}</p>
          {m.actorName && (
            <p className="mt-0.5 text-[11.5px] text-aqs-ink-faint">
              Người thực hiện: <span className="font-medium text-aqs-ink-muted">{m.actorName}</span>
            </p>
          )}
        </div>
      ),
    },
  ]

  return (
    <ManagementDialog
      title={`Chi tiết tồn kho — ${item.sku ?? item.productName ?? 'SKU'}`}
      onClose={onClose}
      size="wide"
    >
      <div className="space-y-5 p-5 sm:p-6">
        {/* Khối 5 ô số liệu tồn kho + hàng đang chờ nhập */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Metric label="Tồn thực tế" value={item.onHandQty} unit={item.unit} />
          <Metric label="Đang giữ" value={item.reservedQty} unit={item.unit} />
          <Metric label="Khả dụng" value={item.availableQty} unit={item.unit} tone="accent" />
          <Metric label="Ngưỡng tối thiểu" value={item.minimumQty} unit={item.unit} />
          <Metric
            label="Đang chờ nhập (PO)"
            value={incomingQty}
            prefix={incomingQty > 0 ? '+' : ''}
            unit={item.unit}
            tone={incomingQty > 0 ? 'positive' : 'default'}
            subtext={
              incomingQty > 0
                ? `Dự kiến sau nhập: ${projectedAvailable} ${item.unit ?? ''}`
                : 'Chưa có PO đang về'
            }
          />
        </div>

        {/* Thanh chuyển Tab */}
        <div
          role="tablist"
          aria-label="Chế độ xem chi tiết tồn kho"
          className="flex flex-wrap gap-2 border-b border-aqs-border"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
            className={`cursor-pointer border-b-2 px-3.5 py-2.5 text-[13.5px] font-bold transition-colors ${
              activeTab === 'history'
                ? 'border-aqs-accent text-aqs-accent-hover'
                : 'border-transparent text-aqs-ink-muted hover:text-aqs-ink'
            }`}
          >
            Lịch sử thẻ kho gần nhất
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'po'}
            onClick={() => setActiveTab('po')}
            className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-3.5 py-2.5 text-[13.5px] font-bold transition-colors ${
              activeTab === 'po'
                ? 'border-aqs-accent text-aqs-accent-hover'
                : 'border-transparent text-aqs-ink-muted hover:text-aqs-ink'
            }`}
          >
            <Truck className="h-4 w-4" aria-hidden="true" />
            Đơn mua đang chờ nhập (PO)
            <span className="rounded-chip border border-aqs-accent-border bg-aqs-accent-soft px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-aqs-accent-hover">
              {openPoCount > 0 ? `${openPoCount} đơn · +${incomingQty}` : '0'}
            </span>
          </button>
        </div>

        {/* TAB 1: Lịch sử thẻ kho gần nhất */}
        {activeTab === 'history' && (
          <div role="tabpanel" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="movements-title" className="m-0 text-sm font-bold text-aqs-ink">
                Lịch sử thẻ kho gần nhất
              </h3>
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Lọc nhanh loại biến động">
                {GROUP_OPTIONS.map((opt) => {
                  const selected = movementGroup === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setMovementGroup(opt.value)}
                      className={`cursor-pointer rounded-chip border px-2.5 py-1 text-xs font-semibold transition-colors ${
                        selected
                          ? 'border-aqs-accent bg-aqs-accent text-white'
                          : 'border-aqs-border bg-aqs-surface text-aqs-ink-muted hover:bg-aqs-surface-subtle hover:text-aqs-ink'
                      }`}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <ManagementTable
              columns={movementColumns}
              rows={movements}
              rowKey={(m) => m.movementId}
              labelledBy="movements-title"
              emptyMessage={
                isMovementsLoading ? 'Đang tải lịch sử…' : 'Chưa có biến động tồn kho nào.'
              }
            />
          </div>
        )}

        {/* TAB 2: Đơn mua đang chờ nhập (PO) */}
        {activeTab === 'po' && (
          <div role="tabpanel" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="m-0 text-xs text-aqs-ink-muted">
                Theo dõi tiến độ giao hàng từ Nhà cung cấp và nhập kho từng đợt cho mã{' '}
                <strong className="text-aqs-ink">{item.sku ?? item.productName}</strong>.
              </p>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-aqs-ink-muted">
                <input
                  type="checkbox"
                  checked={includeCompletedPo}
                  onChange={(e) => setIncludeCompletedPo(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-aqs-border-strong accent-aqs-accent"
                />
                Hiện cả đơn đã hoàn thành
              </label>
            </div>

            {isPoError ? (
              <Notice tone="warning" title="Chưa tải được danh sách đơn mua hàng">
                Vui lòng khởi động lại server Backend (<code>aquasuite-be</code>) để kích hoạt API theo dõi tiến độ PO mới.
              </Notice>
            ) : isPoLoading ? (
              <div className="rounded-card border border-aqs-border bg-aqs-surface-subtle p-6 text-center text-sm text-aqs-ink-muted">
                Đang tải danh sách đơn mua hàng…
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-aqs-border bg-aqs-surface-subtle/60 px-5 py-8 text-center">
                <p className="m-0 text-sm font-semibold text-aqs-ink">
                  Hiện chưa có đơn mua hàng nào đang chờ nhập cho mã này.
                </p>
                <p className="m-0 max-w-md text-xs text-aqs-ink-faint">
                  Nếu mặt hàng sắp hết, bạn có thể lập đơn mua hàng mới gửi Nhà cung cấp ngay tại đây.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus />}
                  onClick={() => {
                    onClose()
                    navigate('/app/purchase-orders/new')
                  }}
                >
                  Tạo đơn mua hàng (PO)
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {purchaseOrders.map((po) => (
                  <PurchaseOrderProgressCard
                    key={po.purchaseOrderItemId}
                    po={po}
                    skuLabel={item.sku ?? item.productName ?? 'SKU'}
                    canReceiveStock={canReceiveStock}
                    onNavigatePo={handleNavigatePo}
                    onReceiveNow={
                      onOpenReceivePo
                        ? () => {
                            onClose()
                            onOpenReceivePo({
                              purchaseOrderId: po.purchaseOrderId,
                              poCode: po.poCode,
                            })
                          }
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end border-t border-aqs-divider pt-4">
          <Button variant="secondary" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </ManagementDialog>
  )
}

function PurchaseOrderProgressCard({
  po,
  skuLabel,
  canReceiveStock,
  onNavigatePo,
  onReceiveNow,
}: {
  po: PurchaseOrderTrackingItem
  skuLabel: string
  canReceiveStock: boolean
  onNavigatePo: (purchaseOrderId: string) => void
  onReceiveNow?: () => void
}) {
  const isReceivable =
    (po.status === 'CONFIRMED' || po.status === 'PARTIALLY_RECEIVED') && po.remainingQty > 0

  return (
    <div className="rounded-card border border-aqs-accent-border bg-aqs-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigatePo(po.purchaseOrderId)}
              className="inline-flex cursor-pointer items-center gap-1 text-[15px] font-bold text-aqs-accent-hover hover:underline"
            >
              {po.poCode}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <StatusBadge tone={poStatusTone(po.status)}>{po.statusLabel}</StatusBadge>
            {po.overdue && (
              <StatusBadge tone="danger">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Trễ hẹn giao
              </StatusBadge>
            )}
          </div>
          <p className="text-xs text-aqs-ink-muted">
            Nhà cung cấp: <strong className="text-aqs-ink">{po.supplierName ?? '—'}</strong> · Ngày đặt:{' '}
            <span className="tabular-nums">{formatShortDate(po.orderDate)}</span> · Hẹn giao:{' '}
            <strong className={`tabular-nums ${po.overdue ? 'text-aqs-danger' : 'text-aqs-ink'}`}>
              {formatShortDate(po.expectedDate)}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isReceivable && canReceiveStock && onReceiveNow && (
            <Button variant="primary" size="sm" icon={<PackageCheck />} onClick={onReceiveNow}>
              Nhập kho đợt tiếp
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => onNavigatePo(po.purchaseOrderId)}>
            Mở đơn PO
          </Button>
        </div>
      </div>

      {/* Thanh tiến độ nhận riêng cho SKU này */}
      <div className="mt-3 space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
          <span className="text-aqs-ink">
            Tiến độ nhận <span className="text-aqs-accent-ink">{skuLabel}</span>: Đã nhập{' '}
            <strong className="tabular-nums">{po.receivedQty}</strong> /{' '}
            <span className="tabular-nums">{po.orderedQty}</span> {po.unit ?? ''} ({po.progressPercent}%)
          </span>
          {po.remainingQty > 0 ? (
            <span className="tabular-nums text-aqs-accent-hover">
              Còn phải nhận: +{po.remainingQty} {po.unit ?? ''}
            </span>
          ) : (
            <span className="text-aqs-positive">Đã nhận đủ</span>
          )}
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-aqs-surface-hover">
          <div
            className="h-full rounded-full bg-aqs-accent transition-[width] duration-300"
            style={{ width: `${Math.min(100, Math.max(0, po.progressPercent))}%` }}
          />
        </div>
      </div>

      {/* Các phiếu GRN đã nhận thuộc PO này */}
      {po.receipts.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-aqs-divider pt-2.5 text-xs text-aqs-ink-muted">
          <span>Đã nhận qua phiếu:</span>
          {po.receipts.map((gr) => (
            <button
              key={gr.goodsReceiptId}
              type="button"
              onClick={() => onNavigatePo(po.purchaseOrderId)}
              className="inline-flex cursor-pointer items-center gap-1 rounded-chip border border-aqs-border bg-aqs-surface-subtle px-2 py-0.5 font-semibold tabular-nums text-aqs-ink hover:border-aqs-accent-border hover:text-aqs-accent-hover"
              title={gr.confirmedByName ? `Người xác nhận: ${gr.confirmedByName}` : undefined}
            >
              {gr.receiptCode} (+{gr.receivedQty} {po.unit ?? ''} · {formatShortDate(gr.receiptDate)})
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  prefix = '',
  unit,
  tone = 'default',
  subtext,
}: {
  label: string
  value: number
  prefix?: string
  unit?: string | null
  tone?: 'default' | 'accent' | 'positive'
  subtext?: string
}) {
  const boxClass =
    tone === 'accent'
      ? 'border-aqs-accent-border bg-aqs-accent-soft'
      : tone === 'positive'
        ? 'border-aqs-positive-border bg-aqs-positive-soft'
        : 'border-aqs-border bg-aqs-surface'
  const valClass =
    tone === 'accent'
      ? 'text-aqs-accent-ink'
      : tone === 'positive'
        ? 'text-aqs-positive-ink'
        : 'text-aqs-ink'

  return (
    <div className={`rounded-card border p-3 ${boxClass}`}>
      <p className="text-xs font-medium text-aqs-ink-muted">{label}</p>
      <p className={`mt-1 text-lg font-bold tabular-nums ${valClass}`}>
        {prefix}
        {value}{' '}
        <span className="text-xs font-normal text-aqs-ink-muted">{unit ?? ''}</span>
      </p>
      {subtext && <p className="mt-1 text-[11px] font-semibold text-aqs-ink-muted">{subtext}</p>}
    </div>
  )
}
