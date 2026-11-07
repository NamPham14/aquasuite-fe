import { Link } from 'react-router-dom'
import { Plus, ShoppingCart } from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth'
import { useGetSalesOrdersQuery } from '../../features/sales/api/salesOrderApi'
import { useSalesOrderFilters } from '../../features/sales/hooks/useSalesOrderFilters'
import { OrderFilterBar } from '../../features/sales/components/OrderFilterBar'
import { OrderTable } from '../../features/sales/components/OrderTable'

export function OrdersPage() {
  const { user } = useAuth()
  const canCreatePOS = user?.roles.some((r) => ['SALES_STAFF', 'SHOP_OWNER'].includes(r))

  const filters = useSalesOrderFilters()
  const { data: pageData, isLoading, isFetching } = useGetSalesOrdersQuery(filters.filterParams)

  const orders = pageData?.items || []
  const total = pageData?.totalElements || 0
  const totalPages = pageData?.totalPages || 1

  return (
    <div className="space-y-4">
      {/* Header trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-sky-600" />
            <span>Quản lý đơn hàng</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi, tra cứu và xử lý các đơn hàng bán lẻ POS và đơn hàng dự án.
          </p>
        </div>

        {/* Nút hành động */}
        {canCreatePOS && (
          <div className="flex items-center gap-2">
            <Link
              to="/app/orders/pos"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md bg-sky-600 text-white hover:bg-sky-700 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo đơn tại quầy (POS)</span>
            </Link>
          </div>
        )}
      </div>

      {/* Thanh bộ lọc đa năng */}
      <OrderFilterBar
        keyword={filters.keyword}
        onChangeKeyword={filters.setKeyword}
        orderStatus={filters.orderStatus}
        onChangeOrderStatus={filters.setOrderStatus}
        paymentStatus={filters.paymentStatus}
        onChangePaymentStatus={filters.setPaymentStatus}
        orderType={filters.orderType}
        onChangeOrderType={filters.setOrderType}
        fromDate={filters.fromDate}
        onChangeFromDate={filters.setFromDate}
        toDate={filters.toDate}
        onChangeToDate={filters.setToDate}
        hasActiveFilters={filters.hasActiveFilters}
        onResetFilters={filters.resetFilters}
      />

      {/* Bảng đơn hàng 5 cột co giãn responsive */}
      <OrderTable orders={orders} isLoading={isLoading || isFetching} />

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-500">
          <div>
            Hiển thị <span className="font-semibold text-slate-700">{orders.length}</span> /{' '}
            <span className="font-semibold text-slate-700">{total}</span> đơn hàng
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={filters.page <= 1}
              onClick={() => filters.setPage(filters.page - 1)}
              className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Trước
            </button>
            <span className="px-2 py-1 font-medium text-slate-700">
              Trang {filters.page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={filters.page >= totalPages}
              onClick={() => filters.setPage(filters.page + 1)}
              className="px-2.5 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Tiếp
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
