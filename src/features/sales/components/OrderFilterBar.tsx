import { Search, RotateCcw, Calendar, X } from 'lucide-react'
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
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs space-y-2.5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-2">
        {/* Tìm kiếm từ khóa đa năng */}
        <div className="relative md:col-span-2 lg:col-span-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm mã đơn, SĐT, tên KH..."
            value={keyword}
            onChange={(e) => onChangeKeyword(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-sky-500 bg-slate-50/50"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => onChangeKeyword('')}
              aria-label="Xóa từ khóa"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
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
            className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-sky-500 bg-white text-slate-700"
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
            className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-sky-500 bg-white text-slate-700"
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
            className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-sky-500 bg-white text-slate-700"
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
            className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-sky-500 bg-white text-slate-700"
          >
            <option value="">Tất cả thanh toán</option>
            <option value="UNPAID">Chưa thanh toán (UNPAID)</option>
            <option value="PARTIALLY_PAID">Thanh toán một phần</option>
            <option value="PAID">Đã thanh toán (PAID)</option>
          </select>
        </div>
      </div>

      {/* Dòng phụ: Khoảng ngày & Nút reset */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-slate-500 text-[11px]">
            <Calendar className="w-3.5 h-3.5" />
            <span>Từ:</span>
          </div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onChangeFromDate(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-sky-500"
          />
          <div className="flex items-center gap-1 text-slate-500 text-[11px] ml-1">
            <span>Đến:</span>
          </div>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onChangeToDate(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-sky-500"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>
    </div>
  )
}
