import { Search, RotateCcw, Calendar, X } from 'lucide-react'
import { ManagementFilterCard, filterControlClass } from '../../../shared/ui/ManagementPage'
import { Button } from '../../../shared/ui/Button'
import type {
  OrderChannel,
  OrderStatus,
  OrderType,
  PaymentStatus,
} from '../types/salesOrder.types'

interface OrderFilterBarProps {
  keyword: string
  onChangeKeyword: (val: string) => void
  orderStatus?: OrderStatus
  onChangeOrderStatus: (val: OrderStatus | undefined) => void
  paymentStatus?: PaymentStatus
  onChangePaymentStatus: (val: PaymentStatus | undefined) => void
  orderType?: OrderType
  onChangeOrderType: (val: OrderType | undefined) => void
  orderChannel?: OrderChannel
  onChangeOrderChannel: (val: OrderChannel | undefined) => void
  fromDate: string
  onChangeFromDate: (val: string) => void
  toDate: string
  onChangeToDate: (val: string) => void
  hasActiveFilters: boolean
  onResetFilters: () => void
}

export function OrderFilterBar({
  keyword,
  onChangeKeyword,
  orderStatus,
  onChangeOrderStatus,
  paymentStatus,
  onChangePaymentStatus,
  orderType,
  onChangeOrderType,
  orderChannel,
  onChangeOrderChannel,
  fromDate,
  onChangeFromDate,
  toDate,
  onChangeToDate,
  hasActiveFilters,
  onResetFilters,
}: OrderFilterBarProps) {
  return (
    <ManagementFilterCard
      headingId="orders-filter-heading"
      title="Tìm và lọc đơn hàng"
      description="Lọc theo mã đơn, khách hàng, kênh bán, loại đơn, trạng thái và khoảng thời gian."
      hasActiveFilters={hasActiveFilters}
      onReset={onResetFilters}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12">
          {/* Tìm kiếm từ khóa đa năng */}
          <div className="relative md:col-span-2 lg:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-aqs-ink-faint" />
            <input
              type="text"
              placeholder="Tìm mã đơn, SĐT, tên KH..."
              value={keyword}
              onChange={(e) => onChangeKeyword(e.target.value)}
              className={`${filterControlClass} pl-9 pr-8`}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => onChangeKeyword('')}
                aria-label="Xóa từ khóa"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-aqs-ink-faint hover:text-aqs-ink"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Lọc kênh bán */}
          <div className="lg:col-span-2">
            <select
              value={orderChannel || ''}
              onChange={(e) =>
                onChangeOrderChannel((e.target.value as OrderChannel) || undefined)
              }
              className={filterControlClass}
            >
              <option value="">Tất cả kênh bán</option>
              <option value="ONLINE">Đơn Online (ONLINE)</option>
              <option value="COUNTER">Tại quầy (COUNTER)</option>
              <option value="DIRECT_SALES">Dự án (DIRECT_SALES)</option>
            </select>
          </div>

          {/* Lọc loại đơn */}
          <div className="lg:col-span-2">
            <select
              value={orderType || ''}
              onChange={(e) => onChangeOrderType((e.target.value as OrderType) || undefined)}
              className={filterControlClass}
            >
              <option value="">Tất cả loại đơn</option>
              <option value="RETAIL">Bán lẻ (RETAIL)</option>
              <option value="PROJECT">Công trình (PROJECT)</option>
            </select>
          </div>

          {/* Lọc trạng thái đơn */}
          <div className="lg:col-span-2">
            <select
              value={orderStatus || ''}
              onChange={(e) => onChangeOrderStatus((e.target.value as OrderStatus) || undefined)}
              className={filterControlClass}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING_CONFIRMATION">Chờ xác nhận (Online)</option>
              <option value="DRAFT">Nháp - Chờ duyệt nợ</option>
              <option value="PROCESSING">Đang xử lý</option>
              <option value="COMPLETED">Hoàn tất</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          {/* Lọc trạng thái thanh toán */}
          <div className="lg:col-span-2">
            <select
              value={paymentStatus || ''}
              onChange={(e) => onChangePaymentStatus((e.target.value as PaymentStatus) || undefined)}
              className={filterControlClass}
            >
              <option value="">Tất cả thanh toán</option>
              <option value="UNPAID">Chưa thanh toán (UNPAID)</option>
              <option value="PARTIALLY_PAID">Thanh toán một phần</option>
              <option value="PAID">Đã thanh toán (PAID)</option>
            </select>
          </div>
        </div>

        {/* Dòng phụ: Khoảng ngày & Nút reset */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-aqs-divider pt-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-aqs-ink-muted">
              <Calendar className="h-3.5 w-3.5 text-aqs-ink-faint" aria-hidden="true" />
              <span>Từ:</span>
            </div>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onChangeFromDate(e.target.value)}
              className="h-9 rounded-control border border-aqs-border-strong bg-aqs-surface px-2.5 text-xs text-aqs-ink focus:border-aqs-focus focus:outline-none"
            />
            <span className="ml-1 text-xs font-medium text-aqs-ink-muted">Đến:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onChangeToDate(e.target.value)}
              className="h-9 rounded-control border border-aqs-border-strong bg-aqs-surface px-2.5 text-xs text-aqs-ink focus:border-aqs-focus focus:outline-none"
            />
          </div>

          {hasActiveFilters && (
            <Button variant="secondary" size="sm" onClick={onResetFilters}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Đặt lại bộ lọc
            </Button>
          )}
        </div>
      </div>
    </ManagementFilterCard>
  )
}
