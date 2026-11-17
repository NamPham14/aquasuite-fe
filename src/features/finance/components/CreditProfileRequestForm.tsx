import { useEffect, useState, type FormEvent } from 'react'
import { ImagePlus } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { useSubmitCreditProfileRequestMutation, useUploadCreditProfileEvidenceMutation } from '../api/customerDebtApi.ts'

export interface CreditProfileSubject { customerId: string; customerType?: string; creditLimit?: number; creditTermDays?: number }

const maxLimit = 500_000_000
const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const fieldClass = 'mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-700 focus:ring-1 focus:ring-sky-700 disabled:bg-slate-50'

/** Demo-aligned credit-profile form. A new object key is returned only after private MinIO upload succeeds. */
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

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])
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

  return <form className="space-y-4" onSubmit={submit} noValidate>
    <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-900">Hệ thống xét lịch sử mua hàng để áp dụng ngay hoặc đưa vào hàng chờ Chủ cửa hàng duyệt. Không cần nhập mật khẩu Chủ cửa hàng.</p>
    {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Hạn mức tín dụng (VND) *"><input type="number" min="1" max={maxLimit} value={limit} onChange={(event) => setLimit(event.target.value)} className={fieldClass} disabled={pending} /></Field><Field label="Kỳ hạn nợ (ngày) *"><input type="number" min="1" max="30" value={term} onChange={(event) => setTerm(event.target.value)} className={fieldClass} disabled={pending} /></Field></div>
    <div className="flex flex-wrap gap-2"><QuickValue value={2_000_000} onClick={setLimit} /><QuickValue value={10_000_000} onClick={setLimit} /><QuickValue value={30} onClick={(value) => setTerm(String(value))} suffix="ngày" /></div>
    <Field label="Lý do / ghi chú *"><textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className={`${fieldClass} h-24 py-2`} disabled={pending} /></Field>
    {needsEvidence && <fieldset className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 sm:grid-cols-2"><legend className="px-1 text-sm font-bold text-slate-800">Hồ sơ thợ / nhà thầu / dự án</legend><p className="sm:col-span-2 text-xs text-slate-500">Tải ảnh CCCD/CMND, địa chỉ nhà riêng và địa chỉ công trình để đủ điều kiện áp dụng tự động đến 10.000.000 ₫.</p><Field label="Ảnh CCCD / CMND"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => selectIdentityFile(event.target.files?.[0])} className={`${fieldClass} h-auto py-1.5 text-xs file:mr-3 file:rounded file:border-0 file:bg-sky-50 file:px-2 file:py-1 file:text-sky-800`} disabled={pending} /></Field>{previewUrl && <div className="rounded-lg border border-slate-200 bg-white p-2"><p className="mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700"><ImagePlus className="h-4 w-4" />{identityFile?.name}</p><img src={previewUrl} alt="Xem trước ảnh CCCD hoặc CMND" className="max-h-40 rounded border border-slate-200 object-contain" /></div>}<Field label="Địa chỉ nhà riêng"><input value={residentialAddress} onChange={(event) => setResidentialAddress(event.target.value)} maxLength={500} className={fieldClass} disabled={pending} /></Field><Field label="Địa chỉ công trình"><input value={worksiteAddress} onChange={(event) => setWorksiteAddress(event.target.value)} maxLength={500} className={fieldClass} disabled={pending} /></Field></fieldset>}
    <p className="text-xs text-slate-500">Thay đổi chỉ có hiệu lực sau khi hệ thống áp dụng hoặc Chủ cửa hàng phê duyệt.</p>
    <div className="flex justify-end gap-2 border-t border-slate-200 pt-3"><button type="button" className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50" disabled={pending} onClick={onCancel}>Hủy</button><button type="submit" disabled={pending} className="inline-flex h-8 items-center rounded-lg bg-sky-700 px-3 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50">{pending ? 'Đang gửi…' : 'Gửi yêu cầu'}</button></div>
  </form>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold text-slate-700">{label}{children}</label> }
function QuickValue({ value, suffix = '', onClick }: { value: number; suffix?: string; onClick: (value: string) => void }) { return <button type="button" className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-800 hover:bg-sky-50" onClick={() => onClick(String(value))}>{new Intl.NumberFormat('vi-VN').format(value)} {suffix}</button> }
