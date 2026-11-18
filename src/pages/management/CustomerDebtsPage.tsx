import { useMemo, useState, type ReactNode } from 'react'
import { BadgeAlert, Bell, Eye, History, Landmark, Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ActivityLogPanel } from '../../features/audit'
import { type CustomerDebtSummary, type DebtStatus, useGetCustomerDebtStatsQuery, useGetCustomerDebtsQuery } from '../../features/finance'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { normalizeApiError } from '../../shared/api/apiError.ts'

const pageSize = 15
const money = (value?: number) => value == null ? '—' : `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value)} ₫`
const date = (value?: string) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(new Date(value)) : '—'
const secondaryButton = 'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50'
const iconButton = 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-40'
const statusLabel = (status: DebtStatus) => ({ COD_REVIEW: 'Chờ đối soát COD', NO_CREDIT: 'Không có tín dụng', WITHIN_TERM: 'Trong hạn', OVERDUE: 'Quá hạn', CREDIT_BLOCKED: 'Chặn tín dụng', BLACKLISTED: 'Danh sách đen', BLOCKED: 'Đã khóa' } as const)[status]
const statusClass = (status: DebtStatus) => status === 'WITHIN_TERM' ? 'bg-emerald-100 text-emerald-700' : status === 'OVERDUE' || status === 'CREDIT_BLOCKED' || status === 'COD_REVIEW' ? 'bg-amber-100 text-amber-700' : status === 'NO_CREDIT' ? 'bg-slate-200 text-slate-600' : 'bg-rose-100 text-rose-700'
const customerTypeLabel = (value?: string) => ({ RETAIL: 'Khách lẻ', CONTRACTOR: 'Nhà thầu', INSTALLER: 'Thợ lắp đặt', PROJECT_CUSTOMER: 'Khách dự án' } as Record<string, string>)[value ?? ''] ?? value ?? '—'

/** Màn hình danh sách công nợ khách hàng. */
export function CustomerDebtsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isOwner = user?.roles.some((role) => ['SHOP_OWNER', 'ROLE_SHOP_OWNER'].includes(role.toUpperCase())) ?? false
  const canRemind = isOwner || (user?.roles.some((role) => ['ACCOUNTANT', 'ROLE_ACCOUNTANT', 'SALES_STAFF', 'ROLE_SALES_STAFF'].includes(role.toUpperCase())) ?? false)
  const [keyword, setKeyword] = useState('')
  const [customerType, setCustomerType] = useState('')
  const [debtStatus, setDebtStatus] = useState<DebtStatus | ''>('')
  const [sortBy, setSortBy] = useState('')
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const query = useMemo(() => ({ keyword: keyword.trim() || undefined, customerType: customerType || undefined, debtStatus: debtStatus || undefined, sortBy: sortBy || undefined, direction: sortBy ? direction : undefined, page, size: pageSize }), [keyword, customerType, debtStatus, sortBy, direction, page])
  const list = useGetCustomerDebtsQuery(query)
  const stats = useGetCustomerDebtStatsQuery()
  const rows = list.data?.content ?? []
  const error = list.isError ? normalizeApiError(list.error).message : ''

  function openDetail(customerId: string, action?: 'credit' | 'reminder') { const path = `/app/customer-debts/${encodeURIComponent(customerId)}`; navigate(action ? `${path}?action=${action}` : path) }
  function changeStatus(status: DebtStatus | '') { setDebtStatus(status); setPage(0) }
  function reset() { setKeyword(''); setCustomerType(''); changeStatus(''); setSortBy(''); setDirection('desc') }
  function scrollToLog() { document.getElementById('customer-debt-activity')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }

  return <main className="mx-auto w-full max-w-[1200px] space-y-3 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div>
        <nav aria-label="Breadcrumb" className="mb-1 text-xs text-slate-500">Bán hàng <span className="mx-1.5 text-slate-300">/</span><span className="font-semibold text-sky-700">Quản lý công nợ</span></nav>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900">Quản lý công nợ khách hàng</h1>
        <p className="mt-1 text-[13px] text-slate-500">Theo dõi dư nợ, kiểm tra tín dụng và nhắc nợ khách hàng bán chịu.</p>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={secondaryButton} onClick={scrollToLog}><History className="h-4 w-4" />Nhật ký hoạt động</button>
        {isOwner && <Link to="/app/customer-debts/credit-approvals" className={secondaryButton}><ShieldCheck className="h-4 w-4" />Duyệt hạn mức</Link>}
      </div>
    </header>

    {stats.isError && <ErrorBanner message={`Không thể tải thống kê: ${normalizeApiError(stats.error).message}`} retry={() => void stats.refetch()} />}

    <section aria-label="Tổng quan công nợ" className="grid gap-3 sm:grid-cols-3">
      <StatisticCard label="Tổng dư nợ" value={money(stats.data?.totalOutstanding)} note="Tổng nghĩa vụ chưa thanh toán" icon={<Landmark className="h-4 w-4" />} active={debtStatus === ''} onClick={() => changeStatus('')} />
      <StatisticCard label="Quá hạn" value={`${stats.data?.overdueCustomerCount ?? '—'} khách`} note="Có hóa đơn đến hạn chưa thanh toán" icon={<BadgeAlert className="h-4 w-4" />} active={debtStatus === 'OVERDUE'} onClick={() => changeStatus('OVERDUE')} />
      <StatisticCard label="Đang bị chặn tín dụng" value={`${stats.data?.creditBlockedCustomerCount ?? '—'} khách`} note="Vượt hạn mức, danh sách đen hoặc bị khóa" icon={<ShieldAlert className="h-4 w-4" />} />
    </section>

    <section role="search" aria-label="Tìm kiếm và lọc công nợ" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="min-w-0 lg:col-span-2"><span className="mb-1 block text-[11px] font-semibold text-slate-600">Tìm kiếm</span><span className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="search" value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(0) }} placeholder="Tìm theo mã khách, tên, số điện thoại…" disabled={list.isLoading} className="h-8 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-sky-700 focus:ring-1 focus:ring-sky-700 disabled:bg-slate-50" /></span></label>
        <Field label="Loại khách"><select value={customerType} onChange={(event) => { setCustomerType(event.target.value); setPage(0) }} disabled={list.isLoading}><option value="">Mọi loại khách</option><option value="CONTRACTOR">Nhà thầu</option><option value="PROJECT_CUSTOMER">Khách dự án</option><option value="RETAIL">Khách lẻ</option><option value="INSTALLER">Thợ lắp đặt</option></select></Field>
        <Field label="Trạng thái nợ"><select value={debtStatus} onChange={(event) => changeStatus(event.target.value as DebtStatus | '')} disabled={list.isLoading}><option value="">Mọi trạng thái nợ</option><option value="WITHIN_TERM">Trong hạn</option><option value="OVERDUE">Quá hạn — cần nhắc nợ</option><option value="CREDIT_BLOCKED">Chặn tín dụng</option><option value="BLACKLISTED">Danh sách đen</option><option value="NO_CREDIT">Không công nợ / không tín dụng</option><option value="COD_REVIEW">Chờ đối soát COD</option><option value="BLOCKED">Đã khóa</option></select></Field>
        <Field label="Sắp xếp theo"><select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(0) }} disabled={list.isLoading}><option value="">Mặc định</option><option value="outstandingBalance">Dư nợ</option><option value="overdueBalance">Nợ quá hạn</option><option value="nearestDueDate">Ngày tới hạn</option><option value="customerName">Tên khách</option></select></Field>
        <Field label="Chiều sắp xếp"><select value={direction} onChange={(event) => { setDirection(event.target.value as 'asc' | 'desc'); setPage(0) }} disabled={list.isLoading || !sortBy}><option value="desc">Giảm dần</option><option value="asc">Tăng dần</option></select></Field>
        <div className="flex items-end"><button type="button" className={`${secondaryButton} w-full sm:w-auto`} onClick={reset} disabled={list.isFetching}>Đặt lại lọc</button></div>
      </div>
    </section>

    <section aria-label="Danh sách khách hàng có công nợ" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-busy={list.isFetching}>
      {error && <div className="p-3"><ErrorBanner message={error} retry={() => void list.refetch()} /></div>}
      <DebtTable rows={rows} loading={list.isLoading} error={Boolean(error)} owner={isOwner} canRemind={canRemind} onOpen={openDetail} />
      <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-2.5"><Pagination page={list.data?.page ?? page} totalPages={list.data?.totalPages ?? 0} total={list.data?.totalElements ?? 0} disabled={list.isFetching} onChange={setPage} /></div>
    </section>

    <div id="customer-debt-activity"><ActivityLogPanel entityType="CUSTOMER" description="Các thay đổi hồ sơ tín dụng, nhắc nợ, ghi nhận cuộc gọi và thao tác công nợ." /></div>
  </main>
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="min-w-0"><span className="mb-1 block text-[11px] font-semibold text-slate-600">{label}</span><span className="block [&>select]:h-8 [&>select]:w-full [&>select]:rounded-lg [&>select]:border [&>select]:border-slate-300 [&>select]:bg-white [&>select]:px-2.5 [&>select]:text-xs [&>select]:text-slate-900 [&>select]:outline-none [&>select]:focus:border-sky-700 [&>select]:focus:ring-1 [&>select]:focus:ring-sky-700 [&>select]:disabled:bg-slate-50">{children}</span></label> }

function StatisticCard({ label, value, note, icon, active = false, onClick }: { label: string; value: string; note: string; icon: ReactNode; active?: boolean; onClick?: () => void }) {
  const content = <><span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">{icon}{label}</span><strong className="mt-1 block text-xl font-extrabold tabular-nums text-slate-900">{value}</strong><span className="block text-[11px] text-slate-500">{note}</span></>
  return onClick ? <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-20 rounded-xl border px-4 py-3 text-left shadow-sm transition ${active ? 'border-sky-700 bg-sky-50 ring-1 ring-sky-700' : 'border-slate-200 bg-white hover:border-sky-500'}`}>{content}</button> : <div className="min-h-20 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">{content}</div>
}

function DebtTable({ rows, loading, error, owner, canRemind, onOpen }: { rows: CustomerDebtSummary[]; loading: boolean; error: boolean; owner: boolean; canRemind: boolean; onOpen: (customerId: string, action?: 'credit' | 'reminder') => void }) {
  if (!rows.length) return <p className="px-4 py-8 text-center text-sm text-slate-500">{loading ? 'Đang tải công nợ…' : error ? 'Chưa thể tải dữ liệu.' : 'Không có khách nào khớp bộ lọc.'}</p>
  return <><div className="hidden xl:block"><table className="w-full table-fixed border-collapse text-[13px]"><thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="w-[10%] px-3 py-2.5 font-semibold">Mã khách</th><th className="w-[20%] px-3 py-2.5 font-semibold">Khách hàng</th><th className="w-[11%] px-3 py-2.5 font-semibold">Loại khách</th><th className="w-[12%] px-3 py-2.5 text-right font-semibold">Dư nợ</th><th className="w-[12%] px-3 py-2.5 text-right font-semibold">Hạn mức còn lại</th><th className="w-[11%] px-3 py-2.5 font-semibold">Tới hạn gần nhất</th><th className="w-[11%] px-3 py-2.5 font-semibold">Trạng thái nợ</th><th className="w-[13%] px-3 py-2.5 text-right font-semibold">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-200">{rows.map((row) => <tr key={row.customerId} className="align-middle transition hover:bg-slate-50"><td className="break-words px-3 py-2.5"><button type="button" className="font-semibold text-sky-800 hover:underline" onClick={() => onOpen(row.customerId)}>{row.customerCode}</button></td><td className="break-words px-3 py-2.5"><p className="font-semibold text-slate-900">{row.customerName}</p>{row.companyName && <p className="text-xs text-slate-500">{row.companyName}</p>}<p className="text-xs text-slate-500">{row.phone ?? '—'}</p></td><td className="break-words px-3 py-2.5 text-slate-700">{customerTypeLabel(row.customerType)}</td><td className="px-3 py-2.5 text-right"><p className="font-semibold tabular-nums text-slate-900">{money(row.outstandingBalance)}</p>{row.codReviewRequired && <p className="mt-1 text-[11px] text-amber-700">Khách trả {money(row.customerCollectibleAmount)}</p>}</td><td className="px-3 py-2.5 text-right font-medium tabular-nums text-slate-800">{money(row.availableCredit)}</td><td className="break-words px-3 py-2.5 text-slate-700">{row.nearestDueDate ? <><p className="tabular-nums">{date(row.nearestDueDate)}</p>{row.overdueBalance > 0 && !row.codReviewRequired && <p className="mt-1 text-[11px] text-amber-700">Quá hạn {money(row.overdueBalance)}</p>}</> : '—'}</td><td className="break-words px-3 py-2.5"><StatusBadge status={row.debtStatus} /></td><td className="px-3 py-2.5"><div className="flex flex-wrap justify-end gap-1"><ActionIcon label="Xem chi tiết" onClick={() => onOpen(row.customerId)}><Eye className="h-4 w-4" /></ActionIcon>{row.debtStatus !== 'BLACKLISTED' && row.debtStatus !== 'BLOCKED' && <ActionIcon label={owner ? 'Kiểm tra tín dụng' : 'Chỉ Chủ cửa hàng được kiểm tra tín dụng từ màn công nợ'} onClick={() => onOpen(row.customerId, 'credit')} disabled={!owner} tone="sky"><ShieldCheck className="h-4 w-4" /></ActionIcon>}{row.outstandingBalance > 0 && <ActionIcon label={canRemind ? row.debtStatus === 'WITHIN_TERM' ? 'Nhắc nợ thân thiện' : 'Nhắc nợ' : 'Chỉ Kế toán, Sales Staff hoặc Chủ cửa hàng được nhắc nợ'} onClick={() => onOpen(row.customerId, 'reminder')} disabled={!canRemind} tone="amber"><Bell className="h-4 w-4" /></ActionIcon>}</div></td></tr>)}</tbody></table></div><div className="space-y-3 p-3 xl:hidden">{rows.map((row) => <article key={row.customerId} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><div><button type="button" className="text-left font-semibold text-sky-800 hover:underline" onClick={() => onOpen(row.customerId)}>{row.customerCode} · {row.customerName}</button><p className="mt-0.5 text-xs text-slate-500">{customerTypeLabel(row.customerType)} · {row.phone ?? '—'}</p></div><StatusBadge status={row.debtStatus} /></div><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Dư nợ</dt><dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{money(row.outstandingBalance)}</dd></div><div><dt className="text-slate-500">Hạn mức còn lại</dt><dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{money(row.availableCredit)}</dd></div></dl><div className="mt-3 flex flex-wrap gap-2"><button type="button" className={secondaryButton} onClick={() => onOpen(row.customerId)}><Eye className="h-4 w-4" />Xem chi tiết</button>{row.outstandingBalance > 0 && canRemind && <button type="button" className={secondaryButton} onClick={() => onOpen(row.customerId, 'reminder')}><Bell className="h-4 w-4" />Nhắc nợ</button>}</div></article>)}</div></>
}

function StatusBadge({ status }: { status: DebtStatus }) { return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass(status)}`}>{statusLabel(status)}</span> }
function ActionIcon({ label, children, onClick, disabled = false, tone = 'slate' }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean; tone?: 'slate' | 'sky' | 'amber' | 'emerald' }) { const color = tone === 'sky' ? 'text-sky-700 hover:border-sky-300 hover:bg-sky-50' : tone === 'amber' ? 'text-amber-700 hover:border-amber-300 hover:bg-amber-50' : tone === 'emerald' ? 'text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50' : 'text-slate-700 hover:bg-slate-50'; return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`${iconButton} ${color}`}>{children}</button> }
function ErrorBanner({ message, retry }: { message: string; retry: () => void }) { return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><span>{message}</span><button type="button" className={secondaryButton} onClick={retry}>Thử lại</button></div> }
function Pagination({ page, totalPages, total, disabled, onChange }: { page: number; totalPages: number; total: number; disabled: boolean; onChange: (value: number) => void }) { if (totalPages <= 1 && total === 0) return null; return <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500"><span>Hiển thị trang {totalPages ? page + 1 : 0}/{totalPages} · {total} khách hàng</span><div className="flex gap-2"><button type="button" className={secondaryButton} disabled={disabled || page === 0} onClick={() => onChange(page - 1)}>Trước</button><button type="button" className={secondaryButton} disabled={disabled || page >= totalPages - 1} onClick={() => onChange(page + 1)}>Sau</button></div></div> }
