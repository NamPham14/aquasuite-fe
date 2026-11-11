import { Link } from 'react-router-dom'
import { useAuth } from '../../iam'
import { useGetCodBalanceQuery } from '../api/codApi.ts'
import { formatVnd } from '../../../shared/lib/money.ts'
import { codButton } from '../lib/cod.ts'

export function OrderCodPanel({ orderId }: { orderId: string }) {
  const { user } = useAuth()
  const allowed = (user?.roles ?? []).some((role) => ['ACCOUNTANT', 'SALES_STAFF', 'SHOP_OWNER'].includes(role))
  const balance = useGetCodBalanceQuery(orderId, { skip: !allowed })
  if (!allowed) return null
  return <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold">Đối soát COD</h2><Link className={codButton} to={`/app/cod-collections?orderId=${orderId}`}>Khoản thu & lịch sử bàn giao</Link></div>
    {balance.isFetching ? <p role="status">Đang tải số dư COD...</p> : balance.isError ? <p role="alert">Không tải được số dư COD. <button className={codButton} onClick={() => void balance.refetch()}>Thử lại</button></p> : balance.data && <>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
        ['Cửa hàng chưa nhận', balance.data.storeOutstanding], ['Shipper còn giữ', balance.data.shipperHeld], ['Khách còn phải trả', balance.data.customerCollectible], ['Khai thu chờ kiểm tra', balance.data.pendingClaimAmount],
      ].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-semibold">{formatVnd(Number(value))}</dd></div>)}</dl>
      {(balance.data.shipperHeld > 0 || balance.data.pendingClaimAmount > 0) && <p className="text-amber-800">COD đang đối soát. Tiền shipper còn giữ chưa được tính đã thanh toán; không yêu cầu khách trả lại phần đã xác minh.</p>}
    </>}
  </section>
}
