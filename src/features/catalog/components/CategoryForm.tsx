import { useState, type FormEvent } from 'react'
import {
  ManagementForm,
  ManagementFormField,
  managementFieldClass,
} from '../../../shared/ui/ManagementDialog'
import {
  categorySchema,
  type CategoryFormValues,
  type ValidCategoryFormValues,
} from '../schemas/category.schema'
import type { CatalogDialogMode, Category, CategoryOption } from '../types'

type FieldErrors = Partial<Record<keyof CategoryFormValues, string>>

/** Chuyển lỗi schema thành thông báo theo tên trường để hiển thị cạnh input. */
function validationErrors(result: ReturnType<typeof categorySchema.safeParse>): FieldErrors {
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  ) as FieldErrors
}

/** Form tạo, sửa hoặc xem danh mục và lựa chọn danh mục cha theo dữ liệu BE. */
export function CategoryForm({
  mode,
  category,
  options,
  optionsLoading,
  pending,
  apiError,
  apiFieldErrors,
  onClose,
  onSubmit,
}: {
  mode: Exclude<CatalogDialogMode, 'delete'>
  category?: Category
  options: CategoryOption[]
  optionsLoading: boolean
  pending: boolean
  apiError?: string
  apiFieldErrors?: Record<string, string>
  onClose: () => void
  onSubmit: (values: ValidCategoryFormValues) => Promise<void>
}) {
  const [values, setValues] = useState<CategoryFormValues>({
    code: category?.code ?? '',
    name: category?.name ?? '',
    description: category?.description ?? '',
    status: category?.status ?? 'ACTIVE',
    parentId: category?.parentId ?? '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const readOnly = mode === 'view'
  const selectableOptions = options.filter((option) => option.categoryId !== category?.id)
  const currentParentMissing = !!category?.parentId && !options.some(
    (option) => option.categoryId === category.parentId,
  )

  /** Kiểm tra dữ liệu trước khi chuyển giá trị đã chuẩn hóa cho màn hình lưu. */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || readOnly) return
    const result = categorySchema.safeParse(values)
    const nextErrors = validationErrors(result)
    setErrors(nextErrors)
    if (!result.success) return
    await onSubmit(result.data)
  }

  /** Ưu tiên lỗi kiểm tra cục bộ, sau đó đến lỗi trường do BE trả về. */
  const fieldError = (field: keyof CategoryFormValues) => errors[field] || apiFieldErrors?.[field]
  return (
    <ManagementForm
      onSubmit={submit}
      onClose={onClose}
      readOnly={readOnly}
      submitDisabled={pending || (mode !== 'view' && optionsLoading)}
      closeDisabled={pending}
      submitLabel={pending ? 'Đang lưu...' : mode === 'create' ? 'Tạo danh mục' : 'Lưu thay đổi'}
    >
      {apiError && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">{apiError}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <ManagementFormField
          id="category-code"
          label="Mã danh mục *"
          error={fieldError('code')}
          hint={mode === 'create' ? 'Tối đa 50 ký tự; chỉ dùng A-Z, số và dấu gạch dưới.' : 'Mã là khóa ổn định và không thể thay đổi.'}
        >
          <input
            id="category-code"
            className={managementFieldClass}
            value={values.code}
            maxLength={50}
            disabled={mode !== 'create' || pending}
            autoComplete="off"
            onChange={(event) => setValues({ ...values, code: event.target.value.toUpperCase() })}
            aria-invalid={!!fieldError('code')}
            aria-describedby={fieldError('code') ? 'category-code-error' : 'category-code-hint'}
          />
        </ManagementFormField>
        <ManagementFormField id="category-name" label="Tên danh mục *" error={fieldError('name')}>
          <input
            id="category-name"
            className={managementFieldClass}
            value={values.name}
            maxLength={100}
            disabled={readOnly || pending}
            onChange={(event) => setValues({ ...values, name: event.target.value })}
            aria-invalid={!!fieldError('name')}
            aria-describedby={fieldError('name') ? 'category-name-error' : undefined}
          />
        </ManagementFormField>
        <ManagementFormField
          id="category-parent"
          label="Danh mục cha"
          error={fieldError('parentId')}
          hint="Để trống nếu đây là danh mục gốc. Máy chủ sẽ kiểm tra vòng lặp phân cấp."
        >
          <select
            id="category-parent"
            className={managementFieldClass}
            value={values.parentId}
            disabled={readOnly || pending || optionsLoading}
            onChange={(event) => setValues({ ...values, parentId: event.target.value })}
            aria-invalid={!!fieldError('parentId')}
            aria-describedby={fieldError('parentId') ? 'category-parent-error' : 'category-parent-hint'}
          >
            <option value="">Danh mục gốc</option>
            {currentParentMissing && category?.parentId && (
              <option value={category.parentId}>Danh mục cha hiện tại (không hoạt động)</option>
            )}
            {selectableOptions.map((option) => (
              <option key={option.categoryId} value={option.categoryId}>
                {option.categoryCode} — {option.categoryName}
              </option>
            ))}
          </select>
        </ManagementFormField>
        <ManagementFormField id="category-status" label="Trạng thái *" error={fieldError('status')}>
          <select
            id="category-status"
            className={managementFieldClass}
            value={values.status}
            disabled={readOnly || pending}
            onChange={(event) => setValues({ ...values, status: event.target.value as CategoryFormValues['status'] })}
            aria-invalid={!!fieldError('status')}
            aria-describedby={fieldError('status') ? 'category-status-error' : undefined}
          >
            <option value="ACTIVE">Hoạt động</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </ManagementFormField>
      </div>
      <ManagementFormField
        id="category-description"
        label="Mô tả"
        error={fieldError('description')}
        hint="Không bắt buộc, tối đa 5000 ký tự."
      >
        <textarea
          id="category-description"
          className={managementFieldClass}
          rows={5}
          maxLength={5000}
          value={values.description}
          disabled={readOnly || pending}
          onChange={(event) => setValues({ ...values, description: event.target.value })}
          aria-invalid={!!fieldError('description')}
          aria-describedby={fieldError('description') ? 'category-description-error' : 'category-description-hint'}
        />
      </ManagementFormField>
    </ManagementForm>
  )
}
