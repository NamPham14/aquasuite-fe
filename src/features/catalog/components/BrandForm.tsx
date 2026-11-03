import { useState, type FormEvent } from 'react'
import {
  ManagementForm,
  ManagementFormField,
  managementFieldClass,
} from '../../../shared/ui/ManagementDialog'
import { brandSchema, type BrandFormValues, type ValidBrandFormValues } from '../schemas/brand.schema'
import type { Brand, CatalogDialogMode } from '../types'

type FieldErrors = Partial<Record<keyof BrandFormValues, string>>

/** Chuyển lỗi schema thành thông báo theo tên trường để hiển thị cạnh input. */
function validationErrors(result: ReturnType<typeof brandSchema.safeParse>): FieldErrors {
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  ) as FieldErrors
}

/** Form tạo, sửa hoặc xem thương hiệu; mã chỉ được nhập khi tạo mới. */
export function BrandForm({
  mode,
  brand,
  pending,
  apiError,
  apiFieldErrors,
  onClose,
  onSubmit,
}: {
  mode: Exclude<CatalogDialogMode, 'delete'>
  brand?: Brand
  pending: boolean
  apiError?: string
  apiFieldErrors?: Record<string, string>
  onClose: () => void
  onSubmit: (values: ValidBrandFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<BrandFormValues>({
    code: brand?.code ?? '',
    name: brand?.name ?? '',
    description: brand?.description ?? '',
    status: brand?.status ?? 'ACTIVE',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const readOnly = mode === 'view'

  /** Kiểm tra dữ liệu trước khi chuyển giá trị đã chuẩn hóa cho màn hình lưu. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || readOnly) return
    const result = brandSchema.safeParse(values)
    const nextErrors = validationErrors(result)
    setErrors(nextErrors)
    if (!result.success) return
    await onSubmit(result.data)
  }

  /** Ưu tiên lỗi kiểm tra cục bộ, sau đó đến lỗi trường do BE trả về. */
  const fieldError = (field: keyof BrandFormValues) => errors[field] || apiFieldErrors?.[field]
  return (
    <ManagementForm
      onSubmit={submit}
      onClose={onClose}
      readOnly={readOnly}
      submitDisabled={pending}
      closeDisabled={pending}
      submitLabel={pending ? 'Đang lưu...' : mode === 'create' ? 'Tạo thương hiệu' : 'Lưu thay đổi'}
    >
      {apiError && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{apiError}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <ManagementFormField
          id="brand-code"
          label="Mã thương hiệu *"
          error={fieldError('code')}
          hint={mode === 'create' ? 'Tối đa 50 ký tự; chỉ dùng A-Z, số và dấu gạch dưới.' : 'Mã là khóa ổn định và không thể thay đổi.'}
        >
          <input
            id="brand-code"
            className={managementFieldClass}
            value={values.code}
            maxLength={50}
            disabled={mode !== 'create' || pending}
            autoComplete="off"
            onChange={(event) => setValues({ ...values, code: event.target.value.toUpperCase() })}
            aria-invalid={!!fieldError('code')}
            aria-describedby={fieldError('code') ? 'brand-code-error' : 'brand-code-hint'}
          />
        </ManagementFormField>
        <ManagementFormField id="brand-name" label="Tên thương hiệu *" error={fieldError('name')}>
          <input
            id="brand-name"
            className={managementFieldClass}
            value={values.name}
            maxLength={100}
            disabled={readOnly || pending}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
            aria-invalid={!!fieldError('name')}
            aria-describedby={fieldError('name') ? 'brand-name-error' : undefined}
          />
        </ManagementFormField>
        <ManagementFormField id="brand-status" label="Trạng thái *" error={fieldError('status')}>
          <select
            id="brand-status"
            className={managementFieldClass}
            value={values.status}
            disabled={readOnly || pending}
            onChange={(event) => setValues({ ...values, status: event.target.value as BrandFormValues['status'] })}
            aria-invalid={!!fieldError('status')}
            aria-describedby={fieldError('status') ? 'brand-status-error' : undefined}
          >
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </ManagementFormField>
      </div>
      <ManagementFormField
        id="brand-description"
        label="Mô tả"
        error={fieldError('description')}
        hint="Không bắt buộc, tối đa 5000 ký tự."
      >
        <textarea
          id="brand-description"
          className={managementFieldClass}
          rows={5}
          maxLength={5000}
          value={values.description}
          disabled={readOnly || pending}
          onChange={(event) => setValues({ ...values, description: event.target.value })}
          aria-invalid={!!fieldError('description')}
          aria-describedby={fieldError('description') ? 'brand-description-error' : 'brand-description-hint'}
        />
      </ManagementFormField>
    </ManagementForm>
  )
}
