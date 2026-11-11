import { useState } from 'react'
import { HandCoins } from 'lucide-react'
import { ManagementPageHeader, ManagementFilterBar, ManagementSearch } from '../../../shared/ui/ManagementPage'
import { ManagementTable } from '../../../shared/ui/ManagementTable'
import { normalizeApiError } from '../../../shared/api/apiError'
import { useReservationOrdersQuery } from '../api/reservationApi'
import { money, secondaryButton } from '../lib/deposit'
import { ReservationDetails } from './ReservationDetails'

export function DepositManagement() {
  const [keyword, setKeyword] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const orders = useReservationOrdersQuery({ page, keyword: search }, { refetchOnMountOrArgChange: true })
  return <div className="space-y-5 text-sm leading-relaxed text-slate-900">
    <ManagementPageHeader title="Đặt cọc & Giữ hàng" breadcrumb="Đặt cọc & Giữ hàng" group="Bán hàng" description="Chọn đơn đã có để chốt phần hàng giữ và theo dõi cọc theo thỏa thuận" icon={<HandCoins />} />
    <p className="text-sm text-slate-600">Danh sách gồm đơn CONFIRMED hoặc PROCESSING có mức cọc cần thu, kể cả đơn chưa chốt yêu cầu giữ. Báo giá có tỷ lệ cọc khi chuyển thành đơn sẽ được hệ thống tự đăng ký giữ toàn bộ hàng tại kho chính; chỉ phân bổ khi đủ cọc đã xác minh.</p>
    <form onSubmit={(event) => { event.preventDefault(); setSearch(keyword.trim()); setPage(0) }}><ManagementFilterBar>
      <ManagementSearch id="deposit-search" label="Tìm đơn hàng" placeholder="Mã đơn hoặc số điện thoại khách..." value={keyword} onChange={setKeyword} />
      <button type="submit" className={secondaryButton}>Tìm kiếm</button>
      <button type="button" className={secondaryButton} disabled={orders.isFetching} onClick={() => void orders.refetch()}>Tải lại</button>
    </ManagementFilterBar></form>
    {orders.error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{normalizeApiError(orders.error).message}</p>}
    <section aria-labelledby="deposit-list" aria-busy={orders.isFetching} className="rounded-lg border border-slate-200 bg-white p-4 [&_thead]:bg-slate-50 [&_thead]:font-semibold [&_thead]:text-slate-600 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:whitespace-normal [&_th]:leading-5 [&_td]:py-3 [&_tbody]:text-slate-700">
      <h2 id="deposit-list" className="mb-4 text-base font-semibold">Đơn hàng</h2>
      {orders.isFetching ? <p role="status">Đang tải đơn hàng...</p> : !orders.error && <ManagementTable rows={orders.currentData?.content ?? []} rowKey={(order) => order.orderId} labelledBy="deposit-list" emptyMessage="Không có đơn hàng phù hợp." columns={[
        { key: 'code', header: 'Mã đơn', cellClassName: 'font-mono text-xs font-bold text-sky-700', cell: (order) => order.orderCode },
        { key: 'customer', header: 'Khách hàng', cell: (order) => <span className="block w-40 whitespace-normal break-words font-semibold text-slate-900">{order.customerName}</span> },
        { key: 'total', header: 'Tổng đơn', align: 'right', cellClassName: 'font-bold tabular-nums text-sm text-slate-900', cell: (order) => money(order.totalAmount) },
        { key: 'deposit', header: 'Cọc thỏa thuận', align: 'right', cell: (order) => order.payment ? money(order.payment.depositRequired) : '—' },
        { key: 'verified', header: 'Đã xác minh', align: 'right', cell: (order) => order.payment ? money(order.payment.verifiedPaid) : '—' },
        { key: 'pending', header: 'Chờ xác minh', align: 'right', cell: (order) => order.payment ? money(order.payment.pendingAmount) : '—' },
        { key: 'shortfall', header: 'Thiếu cọc', align: 'right', cell: (order) => order.payment ? money(Math.max(0, order.payment.depositRequired - order.payment.verifiedPaid)) : '—' },
        { key: 'depositStatus', header: 'Trạng thái cọc', cell: (order) => order.depositStatus === 'SATISFIED' ? 'Đủ cọc' : order.depositStatus === 'AWAITING_DEPOSIT' ? 'Chưa đủ cọc' : '—' },
        { key: 'status', header: 'Trạng thái đơn', cell: (order) => order.orderStatus },
        { key: 'action', header: 'Thao tác', cell: (order) => <button type="button" className={secondaryButton} aria-label={`Xem cọc và giữ hàng đơn ${order.orderCode}`} onClick={() => setSelected(order.orderId)}>Xem cọc & giữ hàng</button> },
      ]} />}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>Trang {page + 1} / {Math.max(1, orders.currentData?.totalPages ?? 0)} · {orders.currentData?.totalElements ?? 0} đơn</span>
        <div className="flex gap-2"><button type="button" className={secondaryButton} disabled={orders.isFetching || page === 0} onClick={() => setPage(page - 1)}>Trước</button><button type="button" className={secondaryButton} disabled={orders.isFetching || !orders.currentData || page + 1 >= orders.currentData.totalPages} onClick={() => setPage(page + 1)}>Sau</button></div>
      </div>
    </section>
    {selected && <ReservationDetails key={selected} orderId={selected} onClose={() => { setSelected(null); void orders.refetch() }} />}
  </div>
}
