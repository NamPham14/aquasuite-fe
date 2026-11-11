import { useState, type FormEvent } from 'react'
import { ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { bundleDefinition, bundleSchema, type BundleFormValues } from '../schemas/bundle.schema'
import { bundleMoney, localDateInput } from '../lib/bundle'
import type { Bundle, BundleDefinition, BundleSelectedItem } from '../types/bundle.types'
import { BundleSkuPicker } from './BundleSkuPicker'
import { BundleItemsTable } from './BundleItemsTable'

export function BundleForm({ bundle, pending, blocked, error, fieldErrors, onSubmit, onClose }: {
  bundle?: Bundle; pending: boolean; blocked: boolean; error: string; fieldErrors: Record<string, string>
  onSubmit: (definition: BundleDefinition) => Promise<void>; onClose: () => void
}) {
  const [values, setValues] = useState({ productCode: bundle?.productCode ?? '', name: bundle?.name ?? '', description: bundle?.description ?? '', packagePrice: bundle ? String(bundle.packagePrice) : '', validFrom: localDateInput(bundle?.validFrom), validUntil: localDateInput(bundle?.validUntil, true) })
  const [items, setItems] = useState<BundleSelectedItem[]>(bundle?.items ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const disabled = pending || blocked
  const total = items.every((item) => item.sellingPrice != null) ? items.reduce((sum, item) => sum + (item.sellingPrice ?? 0) * (Number.isFinite(item.quantity) ? item.quantity : 0), 0) : null
  const price = Number(values.packagePrice)
  const saving = total != null && price > 0 && price <= total ? total - price : null
  function change(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: '' }))
  }
  function changeItems(update: (current: BundleSelectedItem[]) => BundleSelectedItem[]) {
    setItems(update)
    setErrors((current) => ({ ...current, items: '' }))
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (disabled) return
    const result = bundleSchema.safeParse({ ...values, items: items.map(({ variantId, quantity }) => ({ variantId, quantity })) })
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])))
      const field = result.error.issues[0]?.path[0]
      document.getElementById(field === 'items' ? 'combo-sku-search' : `combo-${String(field)}`)?.focus()
      return
    }
    if (total != null && (total > 9999999999999.99 || price > total)) { setErrors({ packagePrice: 'Giá gói không được vượt tổng giá lẻ; tổng tiền tối đa 9.999.999.999.999,99.' }); return }
    if (items.some((item) => !item.sellable)) { setErrors({ items: 'Loại bỏ SKU không còn kinh doanh trước khi lưu.' }); return }
    setErrors({})
    await onSubmit(bundleDefinition(result.data))
  }
  const errorFor = (field: keyof BundleFormValues) => errors[field] || fieldErrors[field]
  const inputProps = (field: keyof typeof values) => ({ id: `combo-${field}`, className: field === 'productCode' && bundle ? `${managementFieldClass} read-only:bg-slate-50 read-only:text-slate-500` : managementFieldClass, value: values[field], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => change(field, event.target.value), 'aria-invalid': Boolean(errorFor(field)), 'aria-describedby': errorFor(field) ? `combo-${field}-error` : undefined })
  return <ManagementForm onSubmit={submit} onClose={onClose} submitDisabled={disabled} closeDisabled={pending} submitLabel={pending ? 'Đang lưu...' : bundle ? 'Lưu thay đổi' : 'Tạo bản nháp'}>
    {error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    <fieldset disabled={disabled} className="grid min-w-0 items-start gap-5 disabled:opacity-70 lg:grid-cols-[minmax(0,1fr)_300px]">
      <legend className="sr-only">Cấu hình combo</legend><div className="min-w-0 space-y-5">
      <section aria-labelledby="combo-info-heading" className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 id="combo-info-heading" className="text-sm font-semibold text-slate-900">Thông tin combo</h3>
        <div className="grid gap-4 sm:grid-cols-2">
        <ManagementFormField id="combo-productCode" label={bundle ? 'Mã combo * · Chỉ đọc' : 'Mã combo *'} error={errorFor('productCode')}><input {...inputProps('productCode')} maxLength={100} readOnly={Boolean(bundle)} /></ManagementFormField>
        <ManagementFormField id="combo-name" label="Tên combo *" error={errorFor('name')}><input {...inputProps('name')} maxLength={255} /></ManagementFormField>
        </div>
        <ManagementFormField id="combo-description" label="Mô tả" error={errorFor('description')}><textarea {...inputProps('description')} rows={3} maxLength={10000} /></ManagementFormField>
      </section>
      <section className="min-w-0 space-y-4 rounded-lg border border-slate-200 p-4">
        <BundleItemsTable items={items} error={errorFor('items')} onQuantityChange={(variantId, quantity) => changeItems((current) => current.map((item) => item.variantId === variantId ? { ...item, quantity } : item))} onRemove={(variantId) => changeItems((current) => current.filter((item) => item.variantId !== variantId))} />
        <BundleSkuPicker selected={items} onAdd={(item) => changeItems((current) => current.length < 100 && !current.some((line) => line.variantId === item.variantId) ? [...current, item] : current)} />
      </section>
      </div><aside aria-label="Giá và hiệu lực combo" className="min-w-0 space-y-5 lg:sticky lg:top-5"><section aria-labelledby="combo-price-heading" className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 id="combo-price-heading" className="text-sm font-semibold text-slate-900">Giá combo</h3>
        <div className="grid gap-4">
        <ManagementFormField id="combo-retail-total" label="Tổng giá lẻ tạm tính"><input id="combo-retail-total" className={`${managementFieldClass} read-only:bg-slate-50`} readOnly value={bundleMoney(total)} /></ManagementFormField>
        <ManagementFormField id="combo-packagePrice" label="Giá gói (VND) *" error={errorFor('packagePrice')}><input {...inputProps('packagePrice')} inputMode="decimal" aria-describedby={errorFor('packagePrice') ? 'combo-packagePrice-error combo-price-note' : 'combo-price-note'} /></ManagementFormField>
        <ManagementFormField id="combo-saving" label="Tiết kiệm tạm tính"><input id="combo-saving" className={`${managementFieldClass} read-only:bg-sky-50 read-only:text-sky-800`} readOnly value={`${bundleMoney(saving)}${saving != null && total != null && total > 0 ? ` (${(saving / total * 100).toFixed(1)}%)` : ''}`} /></ManagementFormField>
        </div>
        <p id="combo-price-note" className="text-xs text-slate-500">Máy chủ kiểm tra giá hiện hành khi lưu. Nhập giá bằng số, tối đa 2 chữ số thập phân.</p>
        <span role="status" className="sr-only">Tổng giá lẻ {bundleMoney(total)}. Tiết kiệm {bundleMoney(saving)}.</span>
      </section>
      <section aria-labelledby="combo-dates-heading" className="space-y-4 rounded-lg border border-slate-200 p-4">
        <h3 id="combo-dates-heading" className="text-sm font-semibold text-slate-900">Hiệu lực</h3>
        <div className="grid gap-4"><ManagementFormField id="combo-validFrom" label="Bắt đầu" error={errorFor('validFrom')}><input {...inputProps('validFrom')} type="date" /></ManagementFormField><ManagementFormField id="combo-validUntil" label="Kết thúc" error={errorFor('validUntil')}><input {...inputProps('validUntil')} type="date" /></ManagementFormField></div>
        <p className="text-xs text-slate-500">Hiệu lực trọn ngày theo múi giờ trình duyệt ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Bản nháp có thể để trống cả hai mốc.</p>
      </section>
    </aside></fieldset>
  </ManagementForm>
}
