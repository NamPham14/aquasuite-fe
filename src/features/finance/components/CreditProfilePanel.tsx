import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { useSubmitCreditProfileRequestMutation } from '../api/customerDebtApi.ts'
export interface CreditProfileSubject {
  customerId: string
  customerType?: string
  creditLimit?: number
  creditTermDays?: number
}

const maxLimit = 500_000_000

/** Submits the policy-governed credit request; no owner password is ever collected. */
export function CreditProfilePanel({ customer, onDone }: { customer: CreditProfileSubject; onDone: () => void }) {
  const [submitRequest, { isLoading }] = useSubmitCreditProfileRequestMutation()
  const [limit, setLimit] = useState(String(customer.creditLimit ?? ''))
  const [term, setTerm] = useState(String(customer.creditTermDays ?? ''))
  const [reason, setReason] = useState('')
  const [identityDocumentNumber, setIdentityDocumentNumber] = useState('')
  const [residentialAddress, setResidentialAddress] = useState('')
  const [worksiteAddress, setWorksiteAddress] = useState('')
  const [error, setError] = useState('')
  const needsEvidence = ['INSTALLER', 'CONTRACTOR', 'PROJECT_CUSTOMER'].includes(customer.customerType ?? '')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const creditLimit = Number(limit); const creditTermDays = Number(term)
    if (!Number.isFinite(creditLimit) || creditLimit <= 0 || creditLimit > maxLimit || !Number.isInteger(creditTermDays) || creditTermDays < 1 || creditTermDays > 30 || !reason.trim()) { setError('Nhập hạn mức từ 1 đến 500.000.000 VND, kỳ hạn 1–30 ngày và lý do.'); return }
    try {
      setError('')
      const result = await submitRequest({ customerId: customer.customerId, data: { creditLimit, creditTermDays, reason: reason.trim(), identityDocumentNumber: identityDocumentNumber.trim() || undefined, residentialAddress: residentialAddress.trim() || undefined, worksiteAddress: worksiteAddress.trim() || undefined } }).unwrap()
      toast.success(result.appliedImmediately ? 'Đã áp dụng hồ sơ tín dụng.' : 'Đã gửi yêu cầu để Chủ cửa hàng duyệt.')
      onDone()
    } catch (apiError) { setError(normalizeApiError(apiError).message) }
  }

  return <form className="space-y-4" onSubmit={submit} noValidate><p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">Hệ thống xét lịch sử mua hàng để áp dụng ngay hoặc đưa vào hàng chờ Chủ cửa hàng duyệt. Không cần nhập mật khẩu Chủ cửa hàng.</p>{error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Hạn mức tín dụng (VND) *<input type="number" min="1" max={maxLimit} value={limit} onChange={(event) => setLimit(event.target.value)} className={managementFieldClass} disabled={isLoading} /></label><label className="text-sm font-medium text-slate-700">Kỳ hạn nợ (ngày) *<input type="number" min="1" max="30" value={term} onChange={(event) => setTerm(event.target.value)} className={managementFieldClass} disabled={isLoading} /></label></div><label className="block text-sm font-medium text-slate-700">Lý do / ghi chú *<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className={`${managementFieldClass} min-h-20`} disabled={isLoading} /></label>{needsEvidence && <fieldset className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-2"><legend className="px-1 text-sm font-semibold text-slate-800">Hồ sơ thợ / nhà thầu / dự án</legend><p className="sm:col-span-2 text-xs text-slate-500">Đủ CCCD/CMND, địa chỉ nhà riêng và địa chỉ công trình là điều kiện áp dụng tự động cho nhóm này. Thiếu thông tin vẫn gửi Chủ cửa hàng duyệt.</p><label className="text-sm font-medium text-slate-700">CCCD / CMND<input value={identityDocumentNumber} onChange={(event) => setIdentityDocumentNumber(event.target.value)} maxLength={32} className={managementFieldClass} disabled={isLoading} /></label><label className="text-sm font-medium text-slate-700">Địa chỉ nhà riêng<input value={residentialAddress} onChange={(event) => setResidentialAddress(event.target.value)} maxLength={500} className={managementFieldClass} disabled={isLoading} /></label><label className="text-sm font-medium text-slate-700 sm:col-span-2">Địa chỉ công trình<input value={worksiteAddress} onChange={(event) => setWorksiteAddress(event.target.value)} maxLength={500} className={managementFieldClass} disabled={isLoading} /></label></fieldset>}<div className="flex justify-end"><button type="submit" disabled={isLoading} className="inline-flex min-h-10 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50">{isLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}</button></div></form>
}
