import { useState } from 'react'
import { HandCoins, RefreshCw } from 'lucide-react'
import {
  ManagementFilterCard,
  ManagementPageHeader,
  ManagementPageShell,
  ManagementPanel,
  ManagementSearch,
} from '../../../shared/ui/ManagementPage'
import { ManagementPagination, ManagementTable, ManagementTableSkeleton } from '../../../shared/ui/ManagementTable'
import { Button } from '../../../shared/ui/Button'
import { CodeChip, StatusBadge } from '../../../shared/ui/Badge'
import { ErrorState } from '../../../shared/ui/FeedbackStates'
import { normalizeApiError } from '../../../shared/api/apiError'
import { useReservationOrdersQuery } from '../api/reservationApi'
import { money } from '../lib/deposit'
import { ReservationDetails } from './ReservationDetails'

export function DepositManagement() {
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const orders = useReservationOrdersQuery({ page, keyword: search }, { refetchOnMountOrArgChange: true })
  const rows = orders.currentData?.content ?? []
  const totalElements = orders.currentData?.totalElements ?? 0

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title="Đặt cọc & Giữ hàng"
        breadcrumb="Đặt cọc & Giữ hàng"
        group="Bán hàng"
        description="Chọn đơn đã có để chốt phần hàng giữ và theo dõi cọc theo thỏa thuận. Danh sách gồm đơn CONFIRMED hoặc PROCESSING có mức cọc cần thu."
        icon={<HandCoins className="h-5 w-5" />}
        actions={
          <Button
            variant="secondary"
            disabled={orders.isFetching}
            onClick={() => void orders.refetch()}
          >
            <RefreshCw
              className={`h-4 w-4 ${orders.isFetching ? 'animate-spin motion-reduce:animate-none' : ''}`}
              aria-hidden="true"
            />
            Tải lại
          </Button>
        }
      />

      <ManagementFilterCard
        headingId="deposit-filters"
        title="Tìm kiếm đơn hàng đặt cọc"
        description="Báo giá có tỷ lệ cọc khi chuyển thành đơn sẽ tự đăng ký giữ hàng tại kho chính; chỉ phân bổ khi đủ cọc đã xác minh."
        resultCount={orders.isFetching && !orders.currentData ? 'Đang tải...' : `${totalElements} đơn`}
        hasActiveFilters={Boolean(search)}
        onReset={() => {
          setKeyword('')
          setSearch('')
          setPage(0)
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(keyword.trim())
            setPage(0)
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
        >
          <ManagementSearch
            id="deposit-search"
            label="Tìm đơn hàng"
            placeholder="Mã đơn hoặc số điện thoại khách..."
            value={keyword}
            onChange={setKeyword}
          />
          <Button type="submit" variant="secondary">
            Tìm kiếm
          </Button>
        </form>
      </ManagementFilterCard>

      <ManagementPanel
        headingId="deposit-list"
        title="Danh sách đơn hàng"
        description={`Tổng số ${totalElements} đơn hàng cần theo dõi đặt cọc và giữ hàng.`}
        refreshing={orders.isFetching && rows.length > 0}
        busy={orders.isFetching}
      >
        {orders.error ? (
          <div className="p-5">
            <ErrorState
              sectionLabel="Danh sách đơn hàng đặt cọc"
              title="Không thể tải danh sách đơn hàng"
              message={normalizeApiError(orders.error).message}
              onRetry={() => void orders.refetch()}
              retrying={orders.isFetching}
            />
          </div>
        ) : orders.isFetching && !rows.length ? (
          <ManagementTableSkeleton columns={9} rows={5} />
        ) : (
          <ManagementTable
            rows={rows}
            rowKey={(order) => order.orderId}
            labelledBy="deposit-list"
            emptyMessage="Không có đơn hàng phù hợp."
            columns={[
              {
                key: 'code',
                header: 'Mã đơn',
                cell: (order) => <CodeChip>{order.orderCode}</CodeChip>,
              },
              {
                key: 'customer',
                header: 'Khách hàng',
                cell: (order) => (
                  <span className="block w-40 whitespace-normal break-words font-semibold text-aqs-ink">
                    {order.customerName}
                  </span>
                ),
              },
              {
                key: 'total',
                header: 'Tổng đơn',
                align: 'right',
                cellClassName: 'font-bold tabular-nums text-sm text-aqs-ink',
                cell: (order) => money(order.totalAmount),
              },
              {
                key: 'deposit',
                header: 'Cọc thỏa thuận',
                align: 'right',
                cellClassName: 'tabular-nums',
                cell: (order) => (order.payment ? money(order.payment.depositRequired) : '—'),
              },
              {
                key: 'verified',
                header: 'Đã xác minh',
                align: 'right',
                cellClassName: 'tabular-nums text-aqs-positive font-medium',
                cell: (order) => (order.payment ? money(order.payment.verifiedPaid) : '—'),
              },
              {
                key: 'pending',
                header: 'Chờ xác minh',
                align: 'right',
                cellClassName: 'tabular-nums',
                cell: (order) => (order.payment ? money(order.payment.pendingAmount) : '—'),
              },
              {
                key: 'shortfall',
                header: 'Thiếu cọc',
                align: 'right',
                cellClassName: 'tabular-nums text-aqs-warning font-medium',
                cell: (order) =>
                  order.payment
                    ? money(Math.max(0, order.payment.depositRequired - order.payment.verifiedPaid))
                    : '—',
              },
              {
                key: 'depositStatus',
                header: 'Trạng thái cọc',
                align: 'center',
                cell: (order) =>
                  order.depositStatus === 'SATISFIED' ? (
                    <StatusBadge tone="positive">Đủ cọc</StatusBadge>
                  ) : order.depositStatus === 'AWAITING_DEPOSIT' ? (
                    <StatusBadge tone="warning">Chưa đủ cọc</StatusBadge>
                  ) : (
                    <span className="text-aqs-ink-faint">—</span>
                  ),
              },
              {
                key: 'action',
                header: 'Thao tác',
                align: 'center',
                cell: (order) => (
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`Xem cọc và giữ hàng đơn ${order.orderCode}`}
                    onClick={() => setSelected(order.orderId)}
                  >
                    Xem cọc & giữ hàng
                  </Button>
                ),
              },
            ]}
          />
        )}
        <ManagementPagination
          page={page}
          totalPages={orders.currentData?.totalPages ?? 0}
          totalElements={totalElements}
          noun="đơn"
          disabled={orders.isFetching}
          onPageChange={setPage}
        />
      </ManagementPanel>

      {selected && (
        <ReservationDetails
          key={selected}
          orderId={selected}
          onClose={() => {
            setSelected(null)
          }}
        />
      )}
    </ManagementPageShell>
  )
}
