import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Banknote,
  Building2,
  Calendar,
  MapPin,
  Package,
  QrCode,
  RefreshCw,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { formatDateTime, formatVnd } from '../../../shared/lib/money.ts'
import { useGetMyOnlineOrdersQuery } from '../../sales/api/onlineCheckoutApi.ts'
import type { OnlineOrderCheckoutResponse } from '../../sales/types/onlineCheckout.types.ts'
import type { SalesOrderSummaryResponse } from '../../sales/types/salesOrder.types.ts'
import { CustomerEditorialModal } from '../../servicedesk/components/CustomerEditorialModal.tsx'
import { CustomerOrderModificationRequestDialog } from './CustomerOrderModificationRequestDialog.tsx'
import {
  useGetMyActiveOrderModificationRequestsQuery,
  useGetMyAllOrdersQuery,
  useGetMyOrderDetailQuery,
} from '../api/customerTrackingApi.ts'

const REQUEST_TYPE_LABEL: Record<string, string> = {
  ADDRESS_CHANGE: 'đổi địa chỉ',
  ITEM_CHANGE: 'đổi sản phẩm',
  FULL_CANCELLATION: 'hủy đơn',
}

const ORDER_STATUS_META: Record<string, { label: string; cls: string }> = {
  DRAFT: {
    label: 'Chờ duyệt tín dụng',
    cls: 'bg-[#FAF5EB] text-[#854D0E] border-[#E6D3B3]',
  },
  PENDING_CONFIRMATION: {
    label: 'Chờ xác nhận',
    cls: 'bg-[#FAF5EB] text-[#854D0E] border-[#E6D3B3]',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    cls: 'bg-[#F2EFE9] text-[#171614] border-[#D6D1C7]',
  },
  PROCESSING: {
    label: 'Đang xử lý',
    cls: 'bg-[#FAF9F6] text-[#57534E] border-[#D6D1C7]',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    cls: 'bg-[#EEF5F1] text-[#245C42] border-[#C6DDD0]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    cls: 'bg-[#FEF2F2] text-[#991B1B] border-[#E5B8B8]',
  },
}

const PAYMENT_STATUS_META: Record<string, { label: string; cls: string }> = {
  UNPAID: {
    label: 'Chưa thanh toán',
    cls: 'bg-[#FAF5EB] text-[#854D0E] border-[#E6D3B3]',
  },
  PARTIALLY_PAID: {
    label: 'Thanh toán một phần',
    cls: 'bg-[#F2EFE9] text-[#57534E] border-[#D6D1C7]',
  },
  PARTIAL: {
    label: 'Thanh toán một phần',
    cls: 'bg-[#F2EFE9] text-[#57534E] border-[#D6D1C7]',
  },
  PAID: {
    label: 'Đã thanh toán',
    cls: 'bg-[#EEF5F1] text-[#245C42] border-[#C6DDD0]',
  },
}

const CHANNEL_LABEL: Record<string, string> = {
  ONLINE: 'Đơn trực tuyến',
  COUNTER: 'Mua tại quầy',
  POS: 'Mua tại quầy POS',
  DIRECT_SALES: 'Đơn dự án / Công trình',
}

type ChannelFilter = 'ALL' | 'ONLINE' | 'COUNTER' | 'PROJECT'

interface ProfileOrdersSectionProps {
  onTrackDelivery?: (orderCode: string) => void
}

/**
 * Tab Lịch sử toàn bộ đơn hàng của khách hàng (Online, Tại quầy & Dự án công trình).
 */
export function ProfileOrdersSection({ onTrackDelivery }: ProfileOrdersSectionProps) {
  const {
    data: allOrders = [],
    isLoading: isLoadingAll,
    isFetching: isFetchingAll,
    refetch: refetchAll,
  } = useGetMyAllOrdersQuery()

  const {
    data: onlineOrders = [],
    isLoading: isLoadingOnline,
    isFetching: isFetchingOnline,
    refetch: refetchOnline,
  } = useGetMyOnlineOrdersQuery()

  const {
    data: activeModificationRequests = [],
    isLoading: isLoadingActiveRequests,
    isError: isActiveRequestsError,
    isFetching: isFetchingActiveRequests,
    refetch: refetchActiveRequests,
  } = useGetMyActiveOrderModificationRequestsQuery()

  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)

  const {
    currentData: orderDetail,
    isFetching: isLoadingDetail,
    isError: isDetailError,
    refetch: refetchOrderDetail,
  } = useGetMyOrderDetailQuery(
    selectedOrderId ?? '',
    { skip: !selectedOrderId },
  )
  const [orderDialogMode, setOrderDialogMode] = useState<'details' | 'request'>('details')

  const onlineMap = useMemo(() => {
    const map = new Map<string, OnlineOrderCheckoutResponse>()
    for (const o of onlineOrders) {
      map.set(o.orderId, o)
    }
    return map
  }, [onlineOrders])

  const activeRequestByOrderId = useMemo(
    () => new Map(activeModificationRequests.map((request) => [request.orderId, request])),
    [activeModificationRequests],
  )

  const mergedOrders: SalesOrderSummaryResponse[] = useMemo(() => {
    if (allOrders.length > 0) return allOrders
    return onlineOrders.map((o) => ({
      orderId: o.orderId,
      orderCode: o.orderCode,
      customerId: o.customerId,
      customerName: null,
      customerPhone: null,
      quotationId: null,
      quotationCode: null,
      projectName: null,
      depositPercent: null,
      depositAmount: null,
      creditTermDays: null,
      remainingDebtAmount: null,
      salesStaffId: null,
      salesStaffName: null,
      orderType: 'RETAIL',
      orderChannel: 'ONLINE',
      orderStatus: o.orderStatus as SalesOrderSummaryResponse['orderStatus'],
      paymentStatus: o.paymentStatus as SalesOrderSummaryResponse['paymentStatus'],
      orderDate: o.createdAt,
      dueDate: null,
      subtotal: o.totalAmount,
      discountAmount: 0,
      totalAmount: o.totalAmount,
      deliveryAddress: o.deliveryAddress,
      itemCount: o.items.length,
      createdAt: o.createdAt,
    }))
  }, [allOrders, onlineOrders])

  const filteredOrders = useMemo(() => {
    return mergedOrders.filter((order) => {
      if (channelFilter === 'ONLINE') return order.orderChannel === 'ONLINE'
      if (channelFilter === 'COUNTER') {
        return order.orderChannel === 'COUNTER' || order.orderChannel === 'POS'
      }
      if (channelFilter === 'PROJECT') {
        return order.orderType === 'PROJECT' || order.orderChannel === 'DIRECT_SALES'
      }
      return true
    })
  }, [mergedOrders, channelFilter])

  const isLoading = isLoadingAll && isLoadingOnline
  const isFetching = isFetchingAll || isFetchingOnline || isFetchingActiveRequests

  const handleRefresh = () => {
    void refetchAll()
    void refetchOnline()
    void refetchActiveRequests()
  }

  return (
    <div className="border border-[#E6E2DA] bg-white p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
            Lịch sử giao dịch đồng bộ
          </p>
          <h2 className="font-editorial text-xl font-normal text-[#171614] mt-0.5">
            Đơn hàng của tôi ({mergedOrders.length})
          </h2>
          <p className="text-xs text-[#6B6760] mt-1">
            Theo dõi đơn đặt trực tuyến, đơn mua tại Showroom, đơn dự án công trình và trạng thái thanh toán.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isFetching}
          className="h-9 inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-3.5 text-[11px] uppercase tracking-[0.14em] font-medium text-[#171614] hover:border-[#171614] disabled:opacity-50 cursor-pointer transition-colors"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Bộ lọc kênh đơn hàng */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { key: 'ALL', label: 'Tất cả' },
            { key: 'ONLINE', label: 'Trực tuyến' },
            { key: 'COUNTER', label: 'Tại Showroom' },
            { key: 'PROJECT', label: 'Dự án / Công trình' },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setChannelFilter(item.key)}
            className={`h-8 px-3 border text-[11px] uppercase tracking-[0.12em] font-semibold transition-colors cursor-pointer ${
              channelFilter === item.key
                ? 'border-[#171614] bg-[#171614] text-[#FAF9F6]'
                : 'border-[#E6E2DA] bg-[#FAF9F6] text-[#57534E] hover:border-[#171614]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs text-[#78736A]">
          Đang tải danh sách đơn hàng...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="border border-dashed border-[#D6D1C7] bg-[#FAF9F6] p-12 text-center space-y-3">
          <ShoppingBag className="h-8 w-8 text-[#8C6D46] mx-auto" aria-hidden="true" />
          <p className="font-editorial text-xl text-[#171614]">
            {mergedOrders.length === 0
              ? 'Bạn chưa có đơn hàng nào'
              : 'Không có đơn hàng thuộc phân loại đã chọn'}
          </p>
          <p className="text-xs text-[#6B6760] max-w-md mx-auto leading-relaxed">
            Khám phá thiết bị vệ sinh chính hãng tại Showroom và đặt hàng trực tuyến qua VietQR PayOS hoặc COD.
          </p>
          <Link
            to="/storefront#catalog"
            className="inline-flex items-center gap-1.5 border border-[#171614] bg-[#171614] px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-transparent hover:text-[#171614] transition-colors"
          >
            <span>Mua sắm ngay</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const onlineMeta = onlineMap.get(order.orderId)
            const orderMeta = ORDER_STATUS_META[order.orderStatus] ?? {
              label: order.orderStatus,
              cls: 'bg-[#FAF9F6] text-[#57534E] border-[#E6E2DA]',
            }
            const payMeta = PAYMENT_STATUS_META[order.paymentStatus] ?? {
              label: order.paymentStatus,
              cls: 'bg-[#FAF9F6] text-[#57534E] border-[#E6E2DA]',
            }
            const needsPayos =
              Boolean(onlineMeta) &&
              onlineMeta?.paymentMethod === 'BANK_TRANSFER' &&
              order.paymentStatus !== 'PAID' &&
              order.orderStatus !== 'CANCELLED'
            const trackableDelivery =
              order.orderStatus === 'PROCESSING' || order.orderStatus === 'COMPLETED'
            const activeModificationRequest = activeRequestByOrderId.get(order.orderId)

            return (
              <article
                key={order.orderId}
                className="border border-[#E6E2DA] bg-white p-5 hover:border-[#B5AFA5] transition-colors space-y-4"
              >
                {/* Header đơn hàng */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-[#E6E2DA]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#171614] bg-[#FAF9F6] border border-[#E6E2DA] px-2.5 py-1">
                      {order.orderCode}
                    </span>
                    <span className="border border-[#D6D1C7] bg-white px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] font-medium text-[#78736A]">
                      {CHANNEL_LABEL[order.orderChannel] ?? order.orderChannel}
                    </span>
                    <span className={`border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] font-medium ${orderMeta.cls}`}>
                      {orderMeta.label}
                    </span>
                    <span className={`border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] font-medium ${payMeta.cls}`}>
                      {payMeta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-[#78736A]">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{formatDateTime(order.orderDate || order.createdAt)}</span>
                  </div>
                </div>

                {/* Thông tin tóm tắt dự án / sản phẩm online */}
                {order.projectName && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#171614] bg-[#FAF9F6] border border-[#E6E2DA] px-3 py-2">
                    <Building2 className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
                    <span className="font-medium">Công trình: {order.projectName}</span>
                    {order.quotationCode && (
                      <span className="font-mono text-[11px] text-[#78736A]">
                        (Từ báo giá {order.quotationCode})
                      </span>
                    )}
                  </div>
                )}

                {onlineMeta && onlineMeta.items.length > 0 ? (
                  <div className="divide-y divide-[#F0EDE6]">
                    {onlineMeta.items.map((item) => (
                      <div
                        key={item.orderItemId}
                        className="flex items-center justify-between gap-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="h-3.5 w-3.5 text-[#8C6D46] shrink-0" aria-hidden="true" />
                          <span className="font-medium text-[#171614] truncate">
                            {item.comboId && item.variantName
                              ? `${item.productName} · ${item.variantName}`
                              : item.productName}
                          </span>
                          {item.comboId && (
                            <span className="border border-[#D6D1C7] bg-[#FAF9F6] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] font-semibold text-[#8C6D46] shrink-0">
                              Combo
                            </span>
                          )}
                          <span className="text-[11px] font-mono text-[#78736A] shrink-0">
                            &times; {item.quantity}
                          </span>
                        </div>
                        <span className="font-semibold text-[#171614] tabular-nums shrink-0">
                          {formatVnd(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#57534E]">
                    Số lượng mặt hàng trong đơn:{' '}
                    <strong className="text-[#171614] tabular-nums">{order.itemCount}</strong>
                    {order.depositAmount != null && order.depositAmount > 0 && (
                      <>
                        {' · '}Tiền cọc yêu cầu:{' '}
                        <strong className="text-[#8C6D46] tabular-nums">
                          {formatVnd(order.depositAmount)}
                        </strong>
                      </>
                    )}
                  </p>
                )}

                {/* Footer địa chỉ & hành động */}
                <div className="pt-3 border-t border-[#E6E2DA] flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    {order.deliveryAddress && (
                      <div className="flex items-start gap-1.5 text-[11px] text-[#6B6760]">
                        <MapPin className="h-3.5 w-3.5 text-[#8C867C] shrink-0 mt-0.5" aria-hidden="true" />
                        <span className="line-clamp-1">{order.deliveryAddress}</span>
                      </div>
                    )}
                    {onlineMeta ? (
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#171614]">
                        {onlineMeta.paymentMethod === 'BANK_TRANSFER' ? (
                          <>
                            <QrCode className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
                            <span>Chuyển khoản VietQR PayOS</span>
                          </>
                        ) : (
                          <>
                            <Banknote className="h-3.5 w-3.5 text-[#245C42]" aria-hidden="true" />
                            <span>Thanh toán tiền mặt (COD)</span>
                          </>
                        )}
                      </div>
                    ) : (
                      order.dueDate && (
                        <p className="text-[11px] text-[#78736A]">
                          Hạn thanh toán: <span className="text-[#171614] font-medium">{order.dueDate}</span>
                        </p>
                      )
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="text-right mr-1">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-[#78736A] block">
                        Tổng thanh toán
                      </span>
                      <span className="text-base font-semibold text-[#171614] tabular-nums">
                        {formatVnd(order.totalAmount)}
                      </span>
                    </div>

                    {trackableDelivery && onTrackDelivery && (
                      <button
                        type="button"
                        onClick={() => onTrackDelivery(order.orderCode)}
                        className="inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-[#FAF9F6] px-3.5 py-2 text-[11px] uppercase tracking-[0.12em] font-semibold text-[#171614] hover:border-[#171614] transition-colors cursor-pointer"
                      >
                        <Truck className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
                        <span>Theo dõi giao</span>
                      </button>
                    )}

                    {(order.orderStatus === 'PROCESSING' || order.orderStatus === 'PENDING_CONFIRMATION')
                      && activeModificationRequest && (
                        <span
                          role="status"
                          className="inline-flex items-center gap-1.5 border border-[#E6D3B3] bg-[#FAF5EB] px-3.5 py-2 text-[11px] font-semibold text-[#854D0E]"
                        >
                          {activeModificationRequest.requestStatus === 'PENDING_CANCEL'
                            ? 'Đang xử lý yêu cầu'
                            : 'Yêu cầu đang chờ duyệt'}
                          {': '}
                          {REQUEST_TYPE_LABEL[activeModificationRequest.requestType] ?? 'đổi / hủy đơn'}
                        </span>
                      )}

                    {(order.orderStatus === 'PROCESSING' || order.orderStatus === 'PENDING_CONFIRMATION')
                      && !activeModificationRequest && isLoadingActiveRequests && (
                        <span className="border border-[#D6D1C7] bg-[#FAF9F6] px-3.5 py-2 text-[11px] text-[#78736A]" role="status">
                          Đang kiểm tra yêu cầu...
                        </span>
                      )}

                    {(order.orderStatus === 'PROCESSING' || order.orderStatus === 'PENDING_CONFIRMATION')
                      && !activeModificationRequest && isActiveRequestsError && !isLoadingActiveRequests && (
                        <span className="border border-[#E5B8B8] bg-[#FEF2F2] px-3.5 py-2 text-[11px] text-[#991B1B]" role="alert">
                          Không thể kiểm tra trạng thái yêu cầu
                        </span>
                      )}

                    {(order.orderStatus === 'PROCESSING' || order.orderStatus === 'PENDING_CONFIRMATION')
                      && !activeModificationRequest && !isLoadingActiveRequests && !isActiveRequestsError && (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderDialogMode('request')
                          setSelectedOrderId(order.orderId)
                        }}
                        className="inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-[#FAF9F6] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#171614] transition-colors hover:border-[#171614]"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
                        <span>Yêu cầu đổi / hủy</span>
                      </button>
                    )}

                    {needsPayos ? (
                      <Link
                        to={`/checkout/result?orderId=${encodeURIComponent(order.orderId)}`}
                        className="inline-flex items-center gap-1.5 border border-[#171614] bg-[#171614] px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] transition-colors"
                      >
                        <span>Thanh toán PayOS</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    ) : onlineMeta ? (
                      <Link
                        to={`/checkout/result?orderId=${encodeURIComponent(order.orderId)}`}
                        className="inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] hover:border-[#171614] transition-colors"
                      >
                        <span>Chi tiết đơn</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setOrderDialogMode('details')
                          setSelectedOrderId(order.orderId)
                        }}
                        className="inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] hover:border-[#171614] transition-colors cursor-pointer"
                      >
                        <span>Chi tiết đơn</span>
                      </button>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Modal chi tiết đơn tại quầy / dự án */}
      {selectedOrderId && orderDialogMode === 'details' && (
        <CustomerEditorialModal
          eyebrow="Hồ sơ đơn hàng AquaSuite"
          title={orderDetail ? `Đơn hàng ${orderDetail.orderCode}` : 'Đang tải chi tiết đơn...'}
          onClose={() => setSelectedOrderId(null)}
          maxWidthClass="w-[min(95vw,840px)]"
        >
          <div className="p-6 space-y-5">
            {isDetailError ? (
              <div className="space-y-3 py-10 text-center" role="alert">
                <p className="text-xs text-[#991B1B]">Không thể tải chi tiết đơn hàng.</p>
                <button
                  type="button"
                  onClick={() => void refetchOrderDetail()}
                  className="border border-[#171614] px-4 py-2 text-xs font-semibold"
                >
                  Thử tải lại
                </button>
              </div>
            ) : isLoadingDetail || !orderDetail ? (
              <div className="py-10 text-center text-xs text-[#78736A]">
                Đang tải dữ liệu chi tiết đơn hàng...
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-[#E6E2DA] bg-[#FAF9F6] p-4 text-xs">
                  <div className="space-y-1">
                    <p>
                      <span className="text-[#78736A]">Kênh đặt:</span>{' '}
                      <span className="font-medium text-[#171614]">
                        {CHANNEL_LABEL[orderDetail.orderChannel] ?? orderDetail.orderChannel}
                      </span>
                    </p>
                    <p>
                      <span className="text-[#78736A]">Ngày tạo:</span>{' '}
                      <span className="font-medium text-[#171614]">
                        {formatDateTime(orderDetail.orderDate || orderDetail.createdAt)}
                      </span>
                    </p>
                    {orderDetail.salesStaffName && (
                      <p>
                        <span className="text-[#78736A]">Nhân viên phụ trách:</span>{' '}
                        <span className="font-medium text-[#171614]">
                          {orderDetail.salesStaffName}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    {orderDetail.deliveryAddress && (
                      <p>
                        <span className="text-[#78736A]">Địa chỉ giao:</span>{' '}
                        <span className="font-medium text-[#171614]">
                          {orderDetail.deliveryAddress}
                        </span>
                      </p>
                    )}
                    {orderDetail.deliverySchedule && (
                      <p>
                        <span className="text-[#78736A]">Lịch giao:</span>{' '}
                        <span className="font-medium text-[#171614]">
                          {orderDetail.deliverySchedule}
                        </span>
                      </p>
                    )}
                    {orderDetail.dueDate && (
                      <p>
                        <span className="text-[#78736A]">Hạn thanh toán:</span>{' '}
                        <span className="font-medium text-[#171614]">{orderDetail.dueDate}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Sản phẩm */}
                <div className="border border-[#E6E2DA] overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF9F6] text-[10px] uppercase tracking-[0.14em] text-[#78736A] border-b border-[#E6E2DA]">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">SKU &amp; Sản phẩm</th>
                        <th className="py-2.5 px-3 font-semibold text-right">SL</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2DA]">
                      {(orderDetail.displayItems && orderDetail.displayItems.length > 0
                        ? orderDetail.displayItems.map((entry, idx) => ({
                            key: `${entry.sku ?? entry.comboId ?? idx}`,
                            title: entry.productName,
                            sku: entry.sku,
                            isCombo: entry.itemType === 'COMBO',
                            qty: entry.quantity ?? entry.item?.quantity ?? 1,
                            unitPrice: entry.unitPrice ?? entry.item?.unitPrice ?? 0,
                            lineTotal: entry.lineTotal,
                          }))
                        : orderDetail.items.map((item) => ({
                            key: item.orderItemId,
                            title: item.productName,
                            sku: item.sku,
                            isCombo: Boolean(item.comboId),
                            qty: item.quantity,
                            unitPrice: item.unitPrice,
                            lineTotal: item.lineTotal,
                          }))
                      ).map((row) => (
                        <tr key={row.key}>
                          <td className="py-2.5 px-3">
                            <p className="font-medium text-[#171614]">
                              {row.title}
                              {row.isCombo && (
                                <span className="ml-2 border border-[#D6D1C7] bg-[#FAF9F6] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] font-semibold text-[#8C6D46]">
                                  Combo
                                </span>
                              )}
                            </p>
                            {row.sku && (
                              <p className="font-mono text-[10px] text-[#78736A]">{row.sku}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{row.qty}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">
                            {formatVnd(row.unitPrice)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                            {formatVnd(row.lineTotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mốc thanh toán dự án */}
                {orderDetail.milestones && orderDetail.milestones.length > 0 && (
                  <div className="border border-[#E6E2DA] bg-[#FAF9F6] p-4 space-y-2 text-xs">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#78736A] font-semibold">
                      Mốc thanh toán hợp đồng
                    </p>
                    <ul className="divide-y divide-[#E6E2DA] border border-[#E6E2DA] bg-white">
                      {orderDetail.milestones.map((m) => (
                        <li
                          key={m.milestoneId}
                          className="px-3 py-2 flex items-center justify-between"
                        >
                          <span>{m.stageName}</span>
                          <span className="font-semibold tabular-nums">
                            {m.percent}% &middot; {formatVnd(m.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="border-t border-[#E6E2DA] pt-4 flex flex-col items-end space-y-1 text-xs">
                  <div className="w-full sm:w-72 flex justify-between text-[#57534E]">
                    <span>Tạm tính</span>
                    <span className="tabular-nums">{formatVnd(orderDetail.subtotal)}</span>
                  </div>
                  {orderDetail.discountAmount > 0 && (
                    <div className="w-full sm:w-72 flex justify-between text-[#8C6D46]">
                      <span>Chiết khấu</span>
                      <span className="tabular-nums">-{formatVnd(orderDetail.discountAmount)}</span>
                    </div>
                  )}
                  <div className="w-full sm:w-72 flex justify-between pt-2 border-t border-[#E6E2DA] text-sm font-semibold text-[#171614]">
                    <span>Tổng giá trị đơn</span>
                    <span className="tabular-nums">{formatVnd(orderDetail.totalAmount)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </CustomerEditorialModal>
      )}
      {selectedOrderId && orderDialogMode === 'request' && (
        <CustomerOrderModificationRequestDialog
          order={orderDetail}
          isLoading={isLoadingDetail}
          isError={isDetailError}
          onRetry={() => void refetchOrderDetail()}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  )
}
