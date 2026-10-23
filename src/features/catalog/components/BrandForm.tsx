import { useState, type FormEvent } from 'react'
import { brandSchema, type BrandFormValues } from '../schemas/brand.schema'

interface BrandFormProps {
  initialValues?: BrandFormValues
  submitting?: boolean
  onSubmit: (values: BrandFormValues) => void | Promise<void>
}

const emptyValues: BrandFormValues = {
  name: '',
  slug: '',
  description: '',
  logoUrl: '',
  active: true,
}

export function BrandForm({ initialValues, submitting, onSubmit }: BrandFormProps) {
  const [values, setValues] = useState(initialValues ?? emptyValues)
  const [error, setError] = useState<string>()

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const result = brandSchema.safeParse(values)

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
        Tên thương hiệu
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
        URL logo
        <input
          type="url"
          value={values.logoUrl ?? ''}
          onChange={(event) => setValues({ ...values, logoUrl: event.target.value })}
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
        {submitting ? 'Đang lưu...' : 'Lưu thương hiệu'}
      </button>
    </form>
  )
}

