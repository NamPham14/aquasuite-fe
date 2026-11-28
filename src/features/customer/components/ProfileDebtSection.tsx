import { useState } from 'react'
import {
  AlertCircle,
  FileSpreadsheet,
  RefreshCw,
  ShieldAlert,
  Wallet,
} from 'lucide-react'
import { useGetMyCustomerDebtQuery } from '../../finance/api/customerDebtApi.ts'
import { formatDateTime, formatVnd } from '../../../shared/lib/money.ts'

type DebtLedgerTab = 'invoices' | 'orders'

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status
    return typeof status === 'number' ? status : undefined
  }
  return undefined
}

function dateLabel(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Customer-only debt overview backed by the minimized self-service response.
 */
export function ProfileDebtSection() {
  const { data, isLoading, isFetching, isError, error, refetch } = useGetMyCustomerDebtQuery()
  const [ledgerTab, setLedgerTab] = useState<DebtLedgerTab>('invoices')
  const errorStatus = getHttpStatus(error)

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4 border border-[#E6E2DA] bg-white p-6 sm:p-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
            Credit &amp; Receivables
          </p>
          <h2 className="mt-1 font-editorial text-2xl font-normal text-[#171614]">
            Công nợ của tôi
          </h2>
          <p className="mt-1 text-xs text-[#6B6760]">
            Theo dõi dư nợ và các đơn hàng, hóa đơn liên quan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex h-9 cursor-pointer items-center gap-2 border border-[#D6D1C7] bg-[#FAF9F6] px-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#171614] transition-colors hover:border-[#171614] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Làm mới</span>
        </button>
      </section>

      {isLoading ? (
        <div className="animate-pulse space-y-3 border border-[#E6E2DA] bg-white p-8" aria-label="Đang tải công nợ">
          <div className="h-24 bg-[#171614]/10" />
          <div className="h-36 bg-[#FAF9F6]" />
        </div>
      ) : isError ? (
        <section className="space-y-3 border border-[#E6E2DA] bg-white p-10 text-center" role="alert">
          {errorStatus === 404 ? (
            <>
              <Wallet className="mx-auto h-9 w-9 stroke-[1.3] text-[#8C6D46]" aria-hidden="true" />
              <p className="font-editorial text-xl text-[#171614]">Chưa liên kết hồ sơ khách hàng</p>
              <p className="mx-auto max-w-md text-xs leading-relaxed text-[#78736A]">
                Hiện chưa thể tra cứu công nợ cho tài khoản này. Vui lòng liên hệ AquaSuite để được hỗ trợ.
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="mx-auto h-8 w-8 text-[#991B1B]" aria-hidden="true" />
              <p className="text-sm text-[#991B1B]">
                Không thể tải dữ liệu công nợ lúc này. Vui lòng thử lại.
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="h-9 cursor-pointer border border-[#171614] bg-[#171614] px-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FAF9F6]"
              >
                Tải lại
              </button>
            </>
          )}
        </section>
      ) : data ? (
        <>
          <section className="space-y-5 border border-[#171614] bg-[#171614] p-6 text-[#FAF9F6]">
            <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#A8A298]">Tổng dư nợ</p>
                <p className="mt-1 font-editorial text-2xl tabular-nums text-white">
                  {formatVnd(data.outstandingBalance)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#C5B091]">Dư nợ quá hạn</p>
                <p className={`mt-1 font-editorial text-2xl tabular-nums ${data.overdueBalance > 0 ? 'text-[#FCA5A5]' : 'text-white'}`}>
                  {formatVnd(data.overdueBalance)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#A8A298]">Dư hóa đơn đã phát hành</p>
                <p className="mt-1 font-editorial text-2xl tabular-nums text-white">
                  {formatVnd(data.issuedInvoiceReceivable)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#A8A298]">Khoản thu chưa đối trừ</p>
                <p className="mt-1 font-editorial text-2xl tabular-nums text-[#C5B091]">
                  {formatVnd(data.unallocatedAdvanceAmount)}
                </p>
              </div>
            </div>
            {data.nearestDueDate && (
              <p className="border-t border-white/10 pt-4 text-xs text-[#D6D1C7]">
                Hạn thanh toán gần nhất: <span className="font-semibold text-white">{dateLabel(data.nearestDueDate)}</span>
              </p>
            )}
          </section>

          {data.overdueBalance > 0 && (
            <div className="flex items-start gap-2.5 border border-[#991B1B]/30 bg-[#FEF2F2] px-5 py-3.5 text-xs text-[#991B1B]" role="status">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>
                Bạn hiện có khoản công nợ quá hạn{' '}
                <strong className="tabular-nums">{formatVnd(data.overdueBalance)}</strong>.
              </p>
            </div>
          )}

          <section className="border border-[#E6E2DA] bg-white">
            <div className="flex flex-wrap border-b border-[#E6E2DA] bg-[#FAF9F6]" aria-label="Chi tiết công nợ">
              {([
                { key: 'invoices', label: `Hóa đơn (${data.invoices.length})`, icon: FileSpreadsheet },
                { key: 'orders', label: `Đơn hàng (${data.orders.length})`, icon: Wallet },
              ] as const).map((tab) => {
                const Icon = tab.icon
                const active = ledgerTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setLedgerTab(tab.key)}
                    className={`inline-flex cursor-pointer items-center gap-2 border-b-2 px-5 py-3.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-[#171614] bg-white text-[#171614]'
                        : 'border-transparent text-[#6B6760] hover:text-[#171614]'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {ledgerTab === 'invoices' && (
              <div className="overflow-x-auto">
                {data.invoices.length === 0 ? (
                  <p className="p-8 text-center text-xs text-[#78736A]">Chưa có hóa đơn phát sinh công nợ.</p>
                ) : (
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="border-b border-[#E6E2DA] bg-[#FAF9F6] text-[10px] uppercase tracking-[0.14em] text-[#78736A]">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">Hóa đơn / Đơn hàng</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Ngày phát hành</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Hạn thanh toán</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Tổng tiền</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Đã trả</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Còn nợ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2DA]">
                      {data.invoices.map((invoice) => (
                        <tr key={invoice.invoiceId}>
                          <td className="px-4 py-3 font-mono font-semibold text-[#171614]">
                            {invoice.invoiceCode}
                            <span className="block font-sans text-[10px] font-normal text-[#78736A]">{invoice.orderCode}</span>
                          </td>
                          <td className="px-4 py-3 text-[#57534E]">{formatDateTime(invoice.issueDate)}</td>
                          <td className="px-4 py-3 font-medium text-[#171614]">{dateLabel(invoice.dueDate)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatVnd(invoice.totalAmount)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-[#14532D]">{formatVnd(invoice.verifiedPaidAmount)}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#171614]">{formatVnd(invoice.outstandingAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {ledgerTab === 'orders' && (
              <div className="overflow-x-auto">
                {data.orders.length === 0 ? (
                  <p className="p-8 text-center text-xs text-[#78736A]">Chưa có đơn hàng ghi nợ.</p>
                ) : (
                  <table className="w-full min-w-[640px] text-left text-xs">
                    <thead className="border-b border-[#E6E2DA] bg-[#FAF9F6] text-[10px] uppercase tracking-[0.14em] text-[#78736A]">
                      <tr>
                        <th scope="col" className="px-4 py-3 font-semibold">Mã đơn</th>
                        <th scope="col" className="px-4 py-3 font-semibold">Trạng thái</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Giá trị đơn</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Đã trả</th>
                        <th scope="col" className="px-4 py-3 text-right font-semibold">Còn nợ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E2DA]">
                      {data.orders.map((order) => (
                        <tr key={order.orderId}>
                          <td className="px-4 py-3 font-mono font-semibold text-[#171614]">{order.orderCode}</td>
                          <td className="px-4 py-3 text-[#57534E]">{order.orderStatus}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatVnd(order.totalAmount)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-[#14532D]">{formatVnd(order.verifiedPaidAmount)}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-[#171614]">{formatVnd(order.outstandingAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
