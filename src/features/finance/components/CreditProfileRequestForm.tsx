import { useState, type FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { managementFieldClass } from '../../../shared/ui/ManagementDialog.tsx'
import { useSubmitCreditProfileRequestMutation, useUploadCreditProfileEvidenceMutation } from '../api/customerDebtApi.ts'

export interface CreditProfileSubject {
  customerId: string
  customerType?: string
  creditLimit?: number
  creditTermDays?: number
}

const maxLimit = 500_000_000
const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/** Rendered only after the user selects “Gửi yêu cầu” from the read-only profile. */
export function CreditProfileRequestForm({ customer, onDone, onCancel }: { customer: CreditProfileSubject; onDone: () => void; onCancel: () => void }) {
  const [submitRequest, submitState] = useSubmitCreditProfileRequestMutation()
  const [uploadEvidence, uploadState] = useUploadCreditProfileEvidenceMutation()
  const [limit, setLimit] = useState(String(customer.creditLimit ?? ''))
  const [term, setTerm] = useState(String(customer.creditTermDays ?? ''))
  const [reason, setReason] = useState('')
  const [identityFile, setIdentityFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [residentialAddress, setResidentialAddress] = useState('')
  const [worksiteAddress, setWorksiteAddress] = useState('')
  const [error, setError] = useState('')
  const needsEvidence = ['INSTALLER', 'CONTRACTOR', 'PROJECT_CUSTOMER'].includes(customer.customerType ?? '')
  const pending = submitState.isLoading || uploadState.isLoading

  function selectIdentityFile(file?: File) {
    if (!file) return
    if (!imageTypes.includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Ảnh CCCD/CMND phải là JPEG, PNG hoặc WEBP và không quá 5MB.'); return }
    setError(''); setIdentityFile(file); setPreviewUrl(URL.createObjectURL(file))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const creditLimit = Number(limit); const creditTermDays = Number(term)
    if (!Number.isFinite(creditLimit) || creditLimit <= 0 || creditLimit > maxLimit || !Number.isInteger(creditTermDays) || creditTermDays < 1 || creditTermDays > 30 || !reason.trim()) { setError('Nhập hạn mức từ 1 đến 500.000.000 VND, kỳ hạn 1–30 ngày và lý do.'); return }
    try {
      setError('')
      let identityDocumentObjectKey: string | undefined
      if (identityFile) { const form = new FormData(); form.append('file', identityFile); identityDocumentObjectKey = (await uploadEvidence({ customerId: customer.customerId, data: form }).unwrap()).identityDocumentObjectKey }
      const result = await submitRequest({ customerId: customer.customerId, data: { creditLimit, creditTermDays, reason: reason.trim(), identityDocumentObjectKey, residentialAddress: residentialAddress.trim() || undefined, worksiteAddress: worksiteAddress.trim() || undefined } }).unwrap()
      toast.success(result.appliedImmediately ? 'Đã áp dụng hồ sơ tín dụng.' : 'Đã gửi yêu cầu để Chủ cửa hàng duyệt.')
      onDone()
    } catch (apiError) { setError(normalizeApiError(apiError).message) }
  }

  return <form className="space-y-4" onSubmit={submit} noValidate><p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">Hệ thống xét lịch sử mua hàng để áp dụng ngay hoặc đưa vào hàng chờ Chủ cửa hàng duyệt. Không cần nhập mật khẩu Chủ cửa hàng.</p>{error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium text-slate-700">Hạn mức tín dụng (VND) *<input type="number" min="1" max={maxLimit} value={limit} onChange={(event) => setLimit(event.target.value)} className={managementFieldClass} disabled={pending} /></label><label className="text-sm font-medium text-slate-700">Kỳ hạn nợ (ngày) *<input type="number" min="1" max="30" value={term} onChange={(event) => setTerm(event.target.value)} className={managementFieldClass} disabled={pending} /></label></div><label className="block text-sm font-medium text-slate-700">Lý do / ghi chú *<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className={`${managementFieldClass} min-h-20`} disabled={pending} /></label>{needsEvidence && <fieldset className="grid gap-3 rounded-md border border-slate-200 p-3 sm:grid-cols-2"><legend className="px-1 text-sm font-semibold text-slate-800">Hồ sơ thợ / nhà thầu / dự án</legend><p className="sm:col-span-2 text-xs text-slate-500">Tải ảnh CCCD/CMND, địa chỉ nhà riêng và địa chỉ công trình để đủ điều kiện áp dụng tự động đến 10.000.000 ₫. Thiếu chứng từ vẫn có thể gửi Chủ cửa hàng xét duyệt.</p><label className="sm:col-span-2 text-sm font-medium text-slate-700">Ảnh CCCD / CMND<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectIdentityFile(event.target.files?.[0])} className={`${managementFieldClass} file:mr-3 file:rounded file:border-0 file:bg-sky-50 file:px-2 file:py-1 file:text-sky-800`} disabled={pending} /></label>{previewUrl && <div className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><ImagePlus className="h-4 w-4" />{identityFile?.name}</div><img src={previewUrl} alt="Xem trước ảnh CCCD hoặc CMND" className="max-h-48 rounded border border-slate-200 object-contain" /></div>}<label className="text-sm font-medium text-slate-700">Địa chỉ nhà riêng<input value={residentialAddress} onChange={(event) => setResidentialAddress(event.target.value)} maxLength={500} className={managementFieldClass} disabled={pending} /></label><label className="text-sm font-medium text-slate-700">Địa chỉ công trình<input value={worksiteAddress} onChange={(event) => setWorksiteAddress(event.target.value)} maxLength={500} className={managementFieldClass} disabled={pending} /></label></fieldset>}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50" disabled={pending} onClick={onCancel}>Hủy</button><button type="submit" disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50">{pending ? 'Đang gửi...' : 'Gửi yêu cầu'}</button></div></form>
}
