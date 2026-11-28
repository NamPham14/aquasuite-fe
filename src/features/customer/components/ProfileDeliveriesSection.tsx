import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Camera,
  Check,
  MapPin,
  PackageCheck,
  RefreshCw,
  Truck,
  UserCheck,
} from 'lucide-react'
import { formatDateTime, formatVnd } from '../../../shared/lib/money.ts'
import type { DeliveryStatus } from '../../fulfillment/types/delivery.types.ts'
import { CustomerEditorialModal } from '../../servicedesk/components/CustomerEditorialModal.tsx'
import {
  useGetMyCustomerDeliveriesQuery,
  useGetMyCustomerDeliveryPhotoQuery,
} from '../api/customerTrackingApi.ts'
import type { CustomerDeliveryTracking } from '../types/tracking.types.ts'

const STATUS_META: Record<
  DeliveryStatus,
  { label: string; step: number; badgeClass: string }
> = {
  DRAFT: {
    label: 'Chờ xuất kho',
    step: 0,
    badgeClass: 'bg-[#FAF9F6] text-[#78736A] border-[#D6D1C7]',
  },
  DISPATCHED: {
    label: 'Đã xuất kho · Chờ điều phối',
    step: 1,
    badgeClass: 'bg-[#FAF9F6] text-[#8C6D46] border-[#C5B091]/70',
  },
  ASSIGNED: {
    label: 'Đã phân công shipper',
    step: 2,
    badgeClass: 'bg-[#FAF9F6] text-[#171614] border-[#171614]/35',
  },
  IN_TRANSIT: {
    label: 'Đang vận chuyển',
    step: 3,
    badgeClass: 'bg-[#171614] text-[#FAF9F6] border-[#171614]',
  },
  RESCHEDULED: {
    label: 'Hẹn giao lại',
    step: 2,
    badgeClass: 'bg-[#FAF9F6] text-[#8C6D46] border-[#8C6D46]/60',
  },
  DELIVERED: {
    label: 'Đã giao thành công',
    step: 4,
    badgeClass: 'bg-[#F3F8F5] text-[#14532D] border-[#14532D]/30',
  },
  FAILED: {
    label: 'Giao không thành công',
    step: 0,
    badgeClass: 'bg-[#FEF2F2] text-[#991B1B] border-[#991B1B]/30',
  },
  CANCELLED: {
    label: 'Đã hủy chuyến giao',
    step: 0,
    badgeClass: 'bg-[#F5F2EC] text-[#78736A] border-[#D6D1C7]',
  },
}

const PROGRESS_STEPS = [
  'Xuất kho',
  'Phân công',
  'Đang giao',
  'Hoàn tất bàn giao',
] as const

type DeliveryFilter = 'ALL' | 'ACTIVE' | 'DELIVERED' | 'EXCEPTION'

function formatDeliveryNote(note?: string | null): string | null {
  if (!note || !note.trim()) return null
  const lines = note
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const reasonIdx = line.lastIndexOf('reason:')
      if (reasonIdx >= 0) {
        return line.slice(reasonIdx + 'reason:'.length).trim()
      }
      return line
    })
  return lines.length > 0 ? lines.join(' · ') : null
}

function CustomerProofPhoto({
  deliveryId,
  photoId,
  index,
}: {
  deliveryId: string
  photoId: string
  index: number
}) {
  const [open, setOpen] = useState(false)
  const {
    data: objectUrl,
    isLoading,
    isError,
    refetch,
  } = useGetMyCustomerDeliveryPhotoQuery({ id: deliveryId, photoId })

  if (isLoading) {
    return (
      <div className="h-24 border border-[#E6E2DA] bg-[#FAF9F6] flex items-center justify-center text-[11px] text-[#78736A]">
        Đang tải ảnh {index + 1}…
      </div>
    )
  }

  if (isError || !objectUrl) {
    return (
      <div className="h-24 border border-[#E6E2DA] bg-[#FAF9F6] p-2 flex flex-col items-center justify-center gap-1 text-[11px] text-[#991B1B]">
        <span>Lỗi tải ảnh {index + 1}</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="underline text-[#171614] cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Xem ảnh bàn giao ${index + 1}`}
        className="group relative border border-[#E6E2DA] bg-[#FAF9F6] p-1 hover:border-[#171614] transition-colors cursor-pointer"
      >
        <img
          src={objectUrl}
          alt={`Ảnh bàn giao ${index + 1}`}
          className="h-24 w-full object-cover"
        />
        <span className="block py-1 text-[10px] uppercase tracking-[0.14em] text-[#6B6760] group-hover:text-[#171614]">
          Ảnh bàn giao #{index + 1}
        </span>
      </button>

      {open && (
        <CustomerEditorialModal
          eyebrow="Bằng chứng bàn giao"
          title={`Ảnh xác nhận giao hàng #${index + 1}`}
          onClose={() => setOpen(false)}
          maxWidthClass="w-[min(95vw,760px)]"
        >
          <div className="p-6 bg-[#FAF9F6]">
            <img
              src={objectUrl}
              alt={`Ảnh bàn giao ${index + 1} phóng lớn`}
              className="max-h-[75vh] w-full object-contain border border-[#E6E2DA] bg-white"
            />
          </div>
        </CustomerEditorialModal>
      )}
    </>
  )
}

function DeliveryTrackingCard({ item }: { item: CustomerDeliveryTracking }) {
  const { delivery, orderCode, shipperName, shipperPhone, items, photos } = item
  const meta = STATUS_META[delivery.deliveryStatus] ?? {
    label: delivery.deliveryStatus,
    step: 0,
    badgeClass: 'bg-[#FAF9F6] text-[#171614] border-[#E6E2DA]',
  }
  const cleanNote = formatDeliveryNote(delivery.note)
  const isException =
    delivery.deliveryStatus === 'FAILED' || delivery.deliveryStatus === 'CANCELLED'

  return (
    <article className="border border-[#E6E2DA] bg-white">
      {/* Header phiếu giao */}
      <div className="px-6 py-4 bg-[#FAF9F6] border-b border-[#E6E2DA] flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span className="font-mono font-semibold text-[#171614]">
              {delivery.deliveryCode}
            </span>
            {orderCode && (
              <span className="border border-[#D6D1C7] bg-white px-2 py-0.5 font-mono text-[11px] text-[#57534E]">
                Đơn {orderCode}
              </span>
            )}
            {delivery.batchNo != null && (
              <span className="text-[11px] uppercase tracking-[0.14em] text-[#8C6D46]">
                Đợt {delivery.batchNo}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#78736A]">
            Kho xuất: {delivery.warehouseCode || 'Showroom'} &middot; Cập nhật:{' '}
            {formatDateTime(delivery.updatedAt)}
          </p>
        </div>

        <span
          className={`px-3 py-1 border text-[10px] font-semibold uppercase tracking-[0.15em] ${meta.badgeClass}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="p-6 space-y-5">
        {/* Tiến độ giao hàng */}
        {isException ? (
          <div className="flex items-start gap-2.5 border border-[#991B1B]/25 bg-[#FEF2F2] px-4 py-3 text-xs text-[#991B1B]">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold uppercase tracking-[0.12em]">
                {meta.label}
              </p>
              {cleanNote && <p className="mt-0.5 text-[#7F1D1D]">{cleanNote}</p>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border border-[#E6E2DA] bg-[#FAF9F6] p-3.5">
            {PROGRESS_STEPS.map((label, idx) => {
              const stepNum = idx + 1
              const reached = meta.step >= stepNum
              const active = meta.step === stepNum && meta.step < 4
              return (
                <div key={label} className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 shrink-0 flex items-center justify-center border text-[11px] font-semibold ${
                      reached
                        ? 'bg-[#171614] text-[#FAF9F6] border-[#171614]'
                        : 'bg-white text-[#9C978E] border-[#D6D1C7]'
                    }`}
                  >
                    {reached && !active ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      stepNum
                    )}
                  </span>
                  <span
                    className={`text-[11px] tracking-[0.04em] ${
                      reached ? 'text-[#171614] font-semibold' : 'text-[#8A857C]'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Thông tin nhận hàng & Shipper */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border-b border-[#E6E2DA] pb-5">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#78736A] flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
              Địa chỉ nhận hàng
            </p>
            <p className="font-medium text-[#171614]">
              {delivery.recipientName} &middot; {delivery.recipientPhone}
            </p>
            <p className="text-[#57534E] leading-relaxed">{delivery.deliveryAddress}</p>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#78736A] flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
              Nhân viên giao vận
            </p>
            {shipperName ? (
              <>
                <p className="font-medium text-[#171614]">{shipperName}</p>
                <p className="text-[#57534E] font-mono">
                  {shipperPhone || 'Liên hệ qua hotline Showroom'}
                </p>
              </>
            ) : (
              <p className="text-[#78736A]">Đang sắp xếp nhân sự giao hàng</p>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#78736A]">
              Mốc thời gian &amp; COD
            </p>
            <p className="text-[#57534E]">
              Dự kiến:{' '}
              <span className="text-[#171614] font-medium">
                {delivery.scheduledDate ? formatDateTime(delivery.scheduledDate) : 'Theo lịch hẹn'}
              </span>
            </p>
            {delivery.deliveredAt && (
              <p className="text-[#14532D] font-medium">
                Bàn giao: {formatDateTime(delivery.deliveredAt)}
              </p>
            )}
            {delivery.codRequired && (delivery.codAmount ?? 0) > 0 && (
              <p className="text-[#8C6D46] font-semibold tabular-nums">
                Thu hộ COD: {formatVnd(delivery.codAmount)}
              </p>
            )}
          </div>
        </div>

        {/* Ghi chú hẹn lại nếu không phải exception */}
        {!isException && cleanNote && (
          <p className="text-xs text-[#57534E] bg-[#FAF9F6] border border-[#E6E2DA] px-3.5 py-2.5">
            <span className="font-semibold text-[#171614]">Ghi chú giao nhận:</span> {cleanNote}
          </p>
        )}

        {/* Thiết bị trong đợt giao */}
        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#78736A]">
              Thiết bị trong chuyến giao ({items.length})
            </p>
            <div className="border border-[#E6E2DA] overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-[0.14em] text-[#78736A] border-b border-[#E6E2DA]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">SKU</th>
                    <th className="py-2.5 px-3 font-semibold">Sản phẩm</th>
                    <th className="py-2.5 px-3 font-semibold text-right">SL</th>
                    <th className="py-2.5 px-3 font-semibold">Serial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6E2DA]">
                  {items.map((line) => (
                    <tr key={line.deliveryItemId}>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#57534E]">
                        {line.sku || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-[#171614] font-medium">
                        {line.productName || 'Thiết bị AquaSuite'}
                        {line.variantName ? (
                          <span className="text-[#78736A] font-normal">
                            {' '}
                            · {line.variantName}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                        {line.quantity}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#6B6760]">
                        {line.serialNumbers && line.serialNumbers.length > 0
                          ? line.serialNumbers.join(', ')
                          : 'Theo lô'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Ảnh bàn giao */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#78736A] flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
              Hình ảnh xác nhận bàn giao ({photos.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((photo, index) => (
                <CustomerProofPhoto
                  key={photo.photoId}
                  deliveryId={delivery.deliveryId}
                  photoId={photo.photoId}
                  index={index}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

/**
 * Tab Theo dõi Quá trình Giao hàng dành cho Khách hàng (/profile?tab=deliveries).
 */
export function ProfileDeliveriesSection({
  initialOrderCode = '',
}: {
  initialOrderCode?: string
}) {
  const {
    data: deliveries = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetMyCustomerDeliveriesQuery()

  const [filter, setFilter] = useState<DeliveryFilter>('ALL')
  const [orderSearch, setOrderSearch] = useState(initialOrderCode)

  const counts = useMemo(() => {
    const active = deliveries.filter((d) =>
      ['DISPATCHED', 'ASSIGNED', 'IN_TRANSIT', 'RESCHEDULED'].includes(
        d.delivery.deliveryStatus,
      ),
    ).length
    const delivered = deliveries.filter(
      (d) => d.delivery.deliveryStatus === 'DELIVERED',
    ).length
    return { total: deliveries.length, active, delivered }
  }, [deliveries])

  const filtered = useMemo(() => {
    const kw = orderSearch.trim().toLowerCase()
    return deliveries.filter((entry) => {
      const st = entry.delivery.deliveryStatus
      if (
        filter === 'ACTIVE' &&
        !['DISPATCHED', 'ASSIGNED', 'IN_TRANSIT', 'RESCHEDULED'].includes(st)
      ) {
        return false
      }
      if (filter === 'DELIVERED' && st !== 'DELIVERED') return false
      if (filter === 'EXCEPTION' && st !== 'FAILED' && st !== 'CANCELLED') {
        return false
      }
      if (!kw) return true
      return (
        entry.delivery.deliveryCode.toLowerCase().includes(kw) ||
        (entry.orderCode ?? '').toLowerCase().includes(kw)
      )
    })
  }, [deliveries, filter, orderSearch])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border border-[#E6E2DA] bg-white p-6 sm:p-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
            Logistics &amp; Handover
          </p>
          <h2 className="font-editorial text-2xl font-normal text-[#171614] mt-1">
            Theo dõi quá trình giao hàng
          </h2>
          <p className="text-xs text-[#6B6760] mt-1">
            Cập nhật trực tiếp trạng thái xuất kho, nhân viên giao vận và ảnh xác nhận bàn giao cho mọi đơn hàng.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="h-9 px-3.5 inline-flex items-center gap-2 border border-[#D6D1C7] bg-[#FAF9F6] text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] hover:border-[#171614] transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Làm mới</span>
        </button>
      </div>

      {/* KPI Bar */}
      <div className="bg-[#171614] text-[#FAF9F6] border border-[#171614] p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#A8A298]">
            Tổng chuyến giao
          </p>
          <p className="font-editorial text-2xl text-white mt-1 tabular-nums">
            {counts.total}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#C5B091]">
            Đang điều phối / Vận chuyển
          </p>
          <p className="font-editorial text-2xl text-white mt-1 tabular-nums">
            {counts.active}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#A8A298]">
            Đã bàn giao thành công
          </p>
          <p className="font-editorial text-2xl text-white mt-1 tabular-nums">
            {counts.delivered}
          </p>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="border border-[#E6E2DA] bg-white p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { key: 'ALL', label: 'Tất cả' },
              { key: 'ACTIVE', label: 'Đang xử lý giao' },
              { key: 'DELIVERED', label: 'Đã bàn giao' },
              { key: 'EXCEPTION', label: 'Cần lưu ý / Hủy' },
            ] as const
          ).map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setFilter(btn.key)}
              className={`h-8 px-3 border text-[11px] uppercase tracking-[0.12em] font-semibold transition-colors cursor-pointer ${
                filter === btn.key
                  ? 'border-[#171614] bg-[#171614] text-[#FAF9F6]'
                  : 'border-[#E6E2DA] bg-[#FAF9F6] text-[#57534E] hover:border-[#171614]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
          placeholder="Lọc theo mã giao DLV hoặc mã đơn..."
          aria-label="Lọc chuyến giao theo mã"
          className="h-9 w-full sm:w-64 border border-[#D6D1C7] bg-[#FAF9F6] px-3 text-xs text-[#171614] focus:outline-none focus:border-[#171614]"
        />
      </div>

      {/* Nội dung */}
      {isLoading ? (
        <div className="border border-[#E6E2DA] bg-white p-8 space-y-3 animate-pulse">
          <div className="h-5 w-48 bg-[#EFECE6]" />
          <div className="h-24 bg-[#FAF9F6]" />
        </div>
      ) : isError ? (
        <div className="border border-[#991B1B]/30 bg-white p-8 text-center space-y-3">
          <p className="text-sm text-[#991B1B]">
            Không tải được tiến trình giao hàng. Vui lòng thử lại.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="h-9 px-4 border border-[#171614] bg-[#171614] text-[#FAF9F6] text-[11px] uppercase tracking-[0.14em] font-semibold cursor-pointer"
          >
            Tải lại
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-[#E6E2DA] bg-white p-12 text-center space-y-3">
          {deliveries.length === 0 ? (
            <Truck className="h-9 w-9 mx-auto text-[#8C6D46] stroke-[1.3]" aria-hidden="true" />
          ) : (
            <PackageCheck className="h-9 w-9 mx-auto text-[#8C6D46] stroke-[1.3]" aria-hidden="true" />
          )}
          <p className="font-editorial text-xl text-[#171614]">
            {deliveries.length === 0
              ? 'Chưa có chuyến giao hàng nào được xuất kho'
              : 'Không có chuyến giao phù hợp bộ lọc'}
          </p>
          <p className="text-xs text-[#78736A] max-w-md mx-auto leading-relaxed">
            {deliveries.length === 0
              ? 'Khi đơn hàng được xác nhận và xuất kho điều phối giao vận, từng bước hành trình của shipper sẽ hiển thị tại đây.'
              : 'Thử xóa từ khóa hoặc chuyển sang tab Tất cả để xem toàn bộ lịch sử giao hàng.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map((item) => (
            <DeliveryTrackingCard key={item.delivery.deliveryId} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
