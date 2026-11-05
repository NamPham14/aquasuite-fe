import { useState } from 'react'
import { HandCoins, Plus } from 'lucide-react'
import { ManagementPageHeader, ManagementFilterBar, ManagementSearch, ManagementSelect } from '../../../shared/ui/ManagementPage'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import { ManagementTable } from '../../../shared/ui/ManagementTable'
import { ManagementRowActions } from '../../../shared/ui/ManagementRowActions'
import { useDepositManagement } from '../hooks/useDepositManagement'
import { money, orderStatus, primaryButton, secondaryButton, totals } from '../lib/deposit'
import type { DepositOrder } from '../types/deposit.types'
import { DepositOrderForm } from './DepositOrderForm'
import { DepositDetails } from './DepositDetails'

export function DepositManagement() {
  const m = useDepositManagement()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [dialog, setDialog] = useState<'create' | string | null>(null)
  const selected = m.orders.find((order) => order.id === dialog)
  const rows = m.orders.filter((order) => `${order.id} ${order.customer}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')) && (!status || orderStatus(order) === status))
  const open = (id: string) => { m.clearError(); setDialog(id) }
  const close = () => { if (!m.busy) { setDialog(null); m.clearError() } }
  const actions = (order: DepositOrder) => <ManagementRowActions actions={[{ variant: 'view', label: 'Xem', ariaLabel: `Xem đặt cọc đơn ${order.id}`, onClick: () => open(order.id) }]} />
  const error = m.error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{m.error}</p>
  return <div className="space-y-5">
    <ManagementPageHeader title="Đặt cọc & Giữ hàng" breadcrumb="Đặt cọc & Giữ hàng" group="Bán hàng" description="Theo dõi yêu cầu giữ, tiền cọc và lượng hàng đang chờ bổ sung" icon={<HandCoins />} />
    <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Bản demo giao diện UC 29.</strong> Dữ liệu mô phỏng trong phiên trang, tải lại trang sẽ đặt lại. Không ghi tiền hay tồn kho thật. Cọc tối thiểu 20% phần hàng yêu cầu giữ.</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Tạo đơn mới theo yêu cầu giữ của khách, không yêu cầu công trình.</p><button type="button" className={primaryButton} disabled={m.loading || m.busy} onClick={() => open('create')}><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Tạo yêu cầu giữ</button></div>
    <ManagementFilterBar><ManagementSearch id="deposit-search" label="Tìm kiếm" placeholder="Mã đơn hoặc tên khách hàng..." value={query} onChange={setQuery} /><ManagementSelect id="deposit-status" label="Trạng thái" value={status} onChange={setStatus}><option value="">Tất cả</option>{['Chờ đặt cọc', 'Chờ xác minh', 'Chưa đủ cọc', 'Chờ bổ sung hàng', 'Đã giữ đủ hàng'].map((label) => <option key={label}>{label}</option>)}</ManagementSelect><button type="button" className={secondaryButton} onClick={() => { setQuery(''); setStatus('') }}>Đặt lại bộ lọc</button></ManagementFilterBar>
    {!dialog && error}
    <section aria-labelledby="deposit-list" aria-busy={m.loading} className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="flex items-center justify-between gap-3 p-4"><h2 id="deposit-list" className="font-semibold text-slate-900">Danh sách yêu cầu giữ</h2><button type="button" className={secondaryButton} disabled={m.loading || m.busy} onClick={() => void m.reload()}>Tải lại</button></div>
      {m.loading ? <p role="status" className="p-4 text-sm text-slate-500">Đang tải dữ liệu demo...</p> : <>
        <div className="hidden sm:block"><ManagementTable rows={rows} rowKey={(order) => order.id} labelledBy="deposit-list" emptyMessage="Không có yêu cầu phù hợp. Hãy đổi bộ lọc hoặc tạo yêu cầu mới." columns={[
          { key: 'id', header: 'Mã đơn', cell: (order) => order.id }, { key: 'customer', header: 'Khách hàng', cell: (order) => order.customer },
          { key: 'required', header: 'Cọc tối thiểu', cell: (order) => money(totals(order).required), align: 'right' },
          { key: 'paid', header: 'Đã xác minh', cell: (order) => money(totals(order).verified), align: 'right' },
          { key: 'status', header: 'Trạng thái', cell: (order) => <span className="rounded-md bg-sky-50 px-2 py-1 text-xs text-sky-800">{orderStatus(order)}</span> },
          { key: 'actions', header: 'Thao tác', cell: actions },
        ]} /></div>
        <div className="divide-y divide-slate-100 sm:hidden">{rows.length ? rows.map((order) => <article key={order.id} className="space-y-3 p-4"><div><h3 className="font-semibold">{order.id}</h3><p className="break-words text-sm text-slate-600">{order.customer}</p></div><p className="text-sm">{orderStatus(order)}</p><p className="text-sm">Cọc tối thiểu: {money(totals(order).required)}</p><p className="text-sm">Đã xác minh: {money(totals(order).verified)}</p>{actions(order)}</article>) : <p className="p-4 text-sm text-slate-500">Không có yêu cầu phù hợp. Hãy đổi bộ lọc hoặc tạo yêu cầu mới.</p>}</div>
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">{rows.length} / {m.orders.length} yêu cầu demo</p>
      </>}
    </section>
    {dialog && <ManagementDialog title={dialog === 'create' ? 'Tạo đơn & yêu cầu giữ hàng' : `Đặt cọc · ${dialog}`} size="wide" closeDisabled={m.busy} onClose={close}>
      {error && <div className="px-5 pt-4 sm:px-6">{error}</div>}
      {dialog === 'create' ? <DepositOrderForm busy={m.busy} onClose={close} onSave={async (input) => { let id = ''; const ok = await m.run(async (port) => { const order = await port.create(input); id = order.id }); if (ok) setDialog(id) }} /> : selected && <DepositDetails key={selected.id} order={selected} busy={m.busy} run={m.run} />}
    </ManagementDialog>}
  </div>
}
