import { useState, type FormEvent } from 'react'
import { categorySchema, type CategoryFormValues } from '../schemas/category.schema'

interface CategoryFormProps {
  initialValues?: CategoryFormValues
  submitting?: boolean
  onSubmit: (values: CategoryFormValues) => void | Promise<void>
}

const emptyValues: CategoryFormValues = {
  name: '',
  slug: '',
  description: '',
  active: true,
}

export function CategoryForm({ initialValues, submitting, onSubmit }: CategoryFormProps) {
  const [values, setValues] = useState(initialValues ?? emptyValues)
  const [error, setError] = useState<string>()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = categorySchema.safeParse(values)

    if (!result.success) {
      setError(result.error.issues[0]?.message)
      return
    }

    setError(undefined)
    await onSubmit(result.data)
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Tên danh mục
        <input
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
        />
      </label>
      <label>
        Slug
        <input
          value={values.slug}
          onChange={(event) => setValues({ ...values, slug: event.target.value })}
        />
      </label>
      <label>
        Mô tả
        <textarea
          value={values.description ?? ''}
          onChange={(event) => setValues({ ...values, description: event.target.value })}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={values.active}
          onChange={(event) => setValues({ ...values, active: event.target.checked })}
        />
        Đang hoạt động
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>
        {submitting ? 'Đang lưu...' : 'Lưu danh mục'}
      </button>
    </form>
  )
}

