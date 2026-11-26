import { Link } from 'react-router-dom'
import { Plus, ShoppingCart } from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth'
import { useGetSalesOrdersQuery } from '../../features/sales/api/salesOrderApi'
import { useSalesOrderFilters } from '../../features/sales/hooks/useSalesOrderFilters'
import { OrderFilterBar } from '../../features/sales/components/OrderFilterBar'
import { OrderTable } from '../../features/sales/components/OrderTable'
import { ManagementPageHeader, ManagementPageShell, ManagementPanel } from '../../shared/ui/ManagementPage'
import { Button } from '../../shared/ui/Button'

export function OrdersPage() {
  const { user } = useAuth()
  const canCreatePOS = user?.roles.some((r) => ['SALES_STAFF', 'SHOP_OWNER'].includes(r))

  const filters = useSalesOrderFilters()
  const { data: pageData, isLoading, isFetching } = useGetSalesOrdersQuery(filters.filterParams)

  const orders = pageData?.items || []
  const total = pageData?.totalElements || 0
  const totalPages = pageData?.totalPages || 1

  return (
    <ManagementPageShell>
      {/* Header trang */}
      <ManagementPageHeader
        group="Bán hàng & Đơn hàng"
        breadcrumb="Đơn hàng"
        title="Quản lý đơn hàng"
        description="Theo dõi, tra cứu và xử lý đơn hàng bán lẻ POS, đơn hàng Online và đơn hàng dự án."
        icon={<ShoppingCart className="h-5 w-5" />}
        actions={
          canCreatePOS ? (
            <Link
              to="/app/orders/pos"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-aqs-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-aqs-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-focus"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Tạo đơn tại quầy (POS)</span>
            </Link>
          ) : undefined
        }
      />

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
        orderChannel={filters.orderChannel}
        onChangeOrderChannel={filters.setOrderChannel}
        fromDate={filters.fromDate}
        onChangeFromDate={filters.setFromDate}
        toDate={filters.toDate}
        onChangeToDate={filters.setToDate}
        hasActiveFilters={filters.hasActiveFilters}
        onResetFilters={filters.resetFilters}
      />

      {/* Bảng đơn hàng */}
      <ManagementPanel
        headingId="orders-list-heading"
        title="Danh sách đơn hàng"
        description={`Tổng số ${total} đơn hàng khớp bộ lọc hiện tại.`}
        refreshing={isFetching && !isLoading}
        busy={isFetching}
      >
        <OrderTable orders={orders} isLoading={isLoading || isFetching} />

        {/* Phân trang */}
        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-aqs-border bg-aqs-surface-subtle/60 px-5 py-3 text-xs text-aqs-ink-muted">
            <div>
              Hiển thị <span className="font-semibold tabular-nums text-aqs-ink">{orders.length}</span> /{' '}
              <span className="font-semibold tabular-nums text-aqs-ink">{total}</span> đơn hàng
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => filters.setPage(filters.page - 1)}
              >
                Trước
              </Button>
              <span className="px-1 font-medium tabular-nums text-aqs-ink">
                Trang {filters.page} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={filters.page >= totalPages}
                onClick={() => filters.setPage(filters.page + 1)}
              >
                Tiếp
              </Button>
            </div>
          </div>
        )}
      </ManagementPanel>
    </ManagementPageShell>
  )
}
