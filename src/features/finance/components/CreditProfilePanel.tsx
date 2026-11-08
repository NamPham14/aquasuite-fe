import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { useIssueCreditApprovalGrantMutation, useUpdateCustomerCreditProfileMutation } from '../api/customerDebtApi.ts'
import type { CustomerDebtProfile } from '../types/customerDebt.types.ts'

export function CreditProfilePanel({ customer, onDone }: { customer: CustomerDebtProfile; onDone: () => void }) {
  const [limit, setLimit] = useState(String(customer.creditLimit ?? ''))
  const [term, setTerm] = useState(String(customer.creditTermDays ?? ''))
  const [reason, setReason] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [issueGrant, grantState] = useIssueCreditApprovalGrantMutation()
  const [updateProfile, updateState] = useUpdateCustomerCreditProfileMutation()
  const pending = grantState.isLoading || updateState.isLoading

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const creditLimit = Number(limit); const creditTermDays = Number(term)
    if (!Number.isFinite(creditLimit) || creditLimit <= 0 || !Number.isInteger(creditTermDays) || creditTermDays < 1 || creditTermDays > 30 || !reason.trim() || !ownerEmail.trim() || !password) {
      setError('Nhập hạn mức lớn hơn 0, kỳ hạn từ 1–30 ngày, lý do và xác thực Chủ cửa hàng.'); return
    }
    setError('')
    try {
      const grant = await issueGrant({ ownerEmail: ownerEmail.trim(), password, customerId: customer.customerId, creditLimit, creditTermDays }).unwrap()
      await updateProfile({ customerId: customer.customerId, data: { creditLimit, creditTermDays, approvalToken: grant.approvalToken, reason: reason.trim() } }).unwrap()
      setPassword('')
      toast.success('Đã cập nhật hạn mức và kỳ hạn tín dụng của khách hàng.')
      onDone()
    } catch (apiError) { setPassword(''); setError(normalizeApiError(apiError).message) }
  }

  return <form className="space-y-4" onSubmit={submit} noValidate>
    <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">Thay đổi hạn mức/kỳ hạn cần xác thực lại một tài khoản Chủ cửa hàng LOCAL đang hoạt động. Mật khẩu chỉ được gửi trong yêu cầu cấp quyền, không lưu trên trình duyệt.</div>
    {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Hạn mức tín dụng (VND) *<input type="number" min="1" step="1" value={limit} onChange={(event) => setLimit(event.target.value)} className={managementFieldClass} disabled={pending} /></label><label className="text-sm font-medium text-slate-700">Kỳ hạn nợ (ngày) *<input type="number" min="1" max="30" step="1" value={term} onChange={(event) => setTerm(event.target.value)} className={managementFieldClass} disabled={pending} /></label></div>
    <label className="block text-sm font-medium text-slate-700">Lý do thay đổi *<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className={`${managementFieldClass} min-h-20`} disabled={pending} /></label>
    <fieldset className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-2"><legend className="px-1 text-sm font-semibold text-slate-800">Xác thực Chủ cửa hàng</legend><label className="text-sm font-medium text-slate-700">Email Chủ cửa hàng *<input type="email" autoComplete="username" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} className={managementFieldClass} disabled={pending} /></label><label className="text-sm font-medium text-slate-700">Mật khẩu *<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={managementFieldClass} disabled={pending} /></label></fieldset>
    <div className="flex justify-end"><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center justify-center rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50">{pending ? 'Đang lưu...' : 'Xác thực và lưu hồ sơ'}</button></div>
  </form>
}
