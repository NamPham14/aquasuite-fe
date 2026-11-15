import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, ShieldCheck, ShieldX } from 'lucide-react'
import { useGetMyWarrantiesQuery, type WarrantyLookupRecord } from '../../features/servicedesk'
import { normalizeApiError } from '../../shared/api/apiError'

const secondary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800'
const displayDate = (value?: string) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`)) : '—'

function statusBadge(status: WarrantyLookupRecord['status']) {
  return status === 'ACTIVE'
    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"><ShieldCheck className="h-3.5 w-3.5" />Còn hạn</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200"><ShieldX className="h-3.5 w-3.5" />Hết hạn</span>
}

/** UC-48: a read-only customer view. Ownership is always enforced by the backend. */
export function MyWarrantiesPage() {
  const [keyword, setKeyword] = useState('')
  const deferredKeyword = useDeferredValue(keyword)
  const query = useGetMyWarrantiesQuery({ keyword: deferredKeyword.trim() || undefined })
  const records = query.data ?? []
  const isFiltering = Boolean(keyword.trim())
  const error = query.isError ? normalizeApiError(query.error).message : ''
  const countLabel = useMemo(() => `Có ${records.length} phiếu bảo hành`, [records.length])

  return <main className="mx-auto w-full max-w-6xl space-y-5 pb-8">
    <header>
      <p className="text-sm text-slate-500">Trang chủ <span className="px-1">/</span> Bảo hành <span className="px-1">/</span> <span className="text-slate-700">Tra cứu bảo hành</span></p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">Bảo hành của tôi</h1>
      <p className="mt-1 text-sm text-slate-500">UC-48 · Tra cứu thông tin bảo hành</p>
    </header>

    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <label htmlFor="my-warranty-search" className="mb-1.5 block text-sm font-medium text-slate-700">Tìm theo serial / mã đơn</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="my-warranty-search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Nhập số serial hoặc mã đơn hàng..." className="min-h-10 w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-100" /></div>
        <button type="button" className={secondary} onClick={() => setKeyword('')} disabled={!keyword}>Xóa lọc</button>
      </div>
    </section>

    {error && <section role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>Không thể tải dữ liệu bảo hành: {error}</span><button type="button" className={secondary} onClick={() => void query.refetch()}>Thử lại</button></section>}
    {query.isLoading && <p role="status" className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Đang tải phiếu bảo hành…</p>}
    {!query.isLoading && !error && records.length === 0 && <section className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><h2 className="text-base font-semibold text-slate-900">{isFiltering ? 'Không tìm thấy phiếu bảo hành' : 'Chưa có phiếu bảo hành'}</h2><p className="mt-2 text-sm text-slate-500">{isFiltering ? 'Không có phiếu bảo hành nào khớp với thông tin đã nhập.' : 'Bạn chưa có phiếu bảo hành nào được đăng ký.'}</p></section>}
    {!query.isLoading && !error && records.length > 0 && <><p className="text-sm font-medium text-slate-700">{countLabel}</p><section className="space-y-3" aria-label="Danh sách phiếu bảo hành">{records.map((record) => <WarrantyCard key={record.warrantyRecordId} record={record} />)}</section></>}
  </main>
}

function WarrantyCard({ record }: { record: WarrantyLookupRecord }) {
  const remainingLabel = record.status === 'ACTIVE' ? `Còn ${new Intl.NumberFormat('vi-VN').format(record.remainingDays)} ngày` : '0 ngày'
  return <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-bold text-slate-950">{record.productName}{record.variantName ? ` ${record.variantName}` : ''}</h2><p className="mt-1 text-sm text-slate-500">SKU: {record.sku ?? '—'}</p></div>{statusBadge(record.status)}</div>
    <dl className="mt-5 grid gap-4 text-sm md:grid-cols-3"><Info label="Số serial" value={record.serialNumber} /><Info label="Mã đơn hàng" value={record.orderCode ?? '—'} /><Info label="Thời gian còn lại" value={remainingLabel} emphasized /></dl>
    <div className="mt-4"><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Điều khoản bảo hành</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{record.warrantyTerms || '—'}</dd></div>
    <dl className="mt-4 grid gap-4 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2"><Info label="Ngày bắt đầu" value={displayDate(record.startDate)} /><Info label="Ngày kết thúc" value={displayDate(record.endDate)} /></dl>
    <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">{record.status === 'EXPIRED' ? <p className="text-sm text-slate-500">Bảo hành đã hết hạn; không thể gửi yêu cầu bảo hành.</p> : <span />}{record.claimAllowed && <Link className={primary} to={`/app/warranty-claims/new?warrantyRecordId=${encodeURIComponent(record.warrantyRecordId)}`}>Gửi yêu cầu bảo hành</Link>}</footer>
  </article>
}

function Info({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className={`mt-1 ${emphasized ? 'font-bold text-slate-950' : 'text-slate-700'}`}>{value}</dd></div>
}
