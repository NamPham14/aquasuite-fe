import { useState, type FormEvent } from 'react'
import { Image as ImageIcon, Plus, Trash2 } from 'lucide-react'
import {
  ManagementForm,
  ManagementFormField,
  managementFieldClass,
} from '../../../shared/ui/ManagementDialog'
import {
  productSchema,
  type ProductFormValues,
  type ValidProductFormValues,
} from '../schemas/product.schema'
import type {
  BrandOption,
  CatalogDialogMode,
  CategoryOption,
  ProductDetail,
  ProductStatus,
  ProductType,
} from '../types'

type FieldErrors = Partial<Record<keyof ProductFormValues, string>>

function validationErrors(result: ReturnType<typeof productSchema.safeParse>): FieldErrors {
  if (result.success) return {}
  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  ) as FieldErrors
}

interface SpecRow {
  key: string
  value: string
}

export function ProductForm({
  mode,
  product,
  categoryOptions,
  categoryLoading,
  brandOptions,
  brandLoading,
  pending,
  apiError,
  apiFieldErrors,
  onClose,
  onSubmit,
}: {
  mode: Exclude<CatalogDialogMode, 'delete'>
  product?: ProductDetail
  categoryOptions: CategoryOption[]
  categoryLoading: boolean
  brandOptions: BrandOption[]
  brandLoading: boolean
  pending: boolean
  apiError?: string
  apiFieldErrors?: Record<string, string>
  onClose: () => void
  onSubmit: (values: ValidProductFormValues) => Promise<void>
}) {
  const readOnly = mode === 'view'

  // Initialize values
  const [productCode, setProductCode] = useState(product?.productCode ?? '')
  const [productName, setProductName] = useState(product?.productName ?? '')
  const [categoryId, setCategoryId] = useState(product?.category?.categoryId ?? '')
  const [brandId, setBrandId] = useState(product?.brand?.brandId ?? '')
  const [productType, setProductType] = useState<ProductType>(product?.productType ?? 'NORMAL')
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? 'DRAFT')
  const [description, setDescription] = useState(product?.description ?? '')

  // Images state
  const initialImages: string[] = product?.images?.map((img) => img.imageUrl) ?? []
  const [imageUrls, setImageUrls] = useState<string[]>(initialImages)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [imageUrlError, setImageUrlError] = useState('')

  // Specifications state
  const initialSpecs: SpecRow[] = product?.specifications
    ? Object.entries(product.specifications).map(([key, val]) => ({
        key,
        value: String(val ?? ''),
      }))
    : []
  const [specs, setSpecs] = useState<SpecRow[]>(initialSpecs)
  const [newSpecKey, setNewSpecKey] = useState('')
  const [newSpecValue, setNewSpecValue] = useState('')

  const [errors, setErrors] = useState<FieldErrors>({})

  function handleAddImage() {
    setImageUrlError('')
    const trimmed = newImageUrl.trim()
    if (!trimmed) return
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setImageUrlError('URL ảnh cần bắt đầu bằng http:// hoặc https://')
      return
    }
    if (imageUrls.includes(trimmed)) {
      setImageUrlError('URL ảnh này đã tồn tại trong danh sách.')
      return
    }
    setImageUrls([...imageUrls, trimmed])
    setNewImageUrl('')
  }

  function handleRemoveImage(index: number) {
    setImageUrls(imageUrls.filter((_, idx) => idx !== index))
  }

  function handleAddSpec() {
    const k = newSpecKey.trim()
    const v = newSpecValue.trim()
    if (!k) return
    setSpecs([...specs, { key: k, value: v }])
    setNewSpecKey('')
    setNewSpecValue('')
  }

  function handleRemoveSpec(index: number) {
    setSpecs(specs.filter((_, idx) => idx !== index))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || readOnly) return

    // Convert specs list to Record<string, unknown>
    const specificationsObj: Record<string, unknown> = {}
    for (const spec of specs) {
      if (spec.key.trim()) {
        specificationsObj[spec.key.trim()] = spec.value.trim()
      }
    }

    const rawValues: ProductFormValues = {
      productCode,
      productName,
      categoryId,
      brandId: brandId || null,
      productType,
      status,
      description: description || null,
      imageUrls,
      specifications: specificationsObj,
    }

    const result = productSchema.safeParse(rawValues)
    const nextErrors = validationErrors(result)
    setErrors(nextErrors)

    if (!result.success) return
    await onSubmit(result.data)
  }

  const fieldError = (field: keyof ProductFormValues) =>
    errors[field] || apiFieldErrors?.[field]

  return (
    <ManagementForm
      onSubmit={handleSubmit}
      onClose={onClose}
      readOnly={readOnly}
      submitDisabled={pending || (mode !== 'view' && categoryLoading)}
      closeDisabled={pending}
      submitLabel={
        pending ? 'Đang lưu...' : mode === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'
      }
    >
      {apiError && (
        <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">
          {apiError}
        </p>
      )}

      {/* Basic information */}
      <div className="grid gap-4 sm:grid-cols-2">
        <ManagementFormField
          id="product-code"
          label="Mã sản phẩm *"
          error={fieldError('productCode')}
          hint={
            mode === 'create'
              ? 'Tối đa 100 ký tự; chữ HOA, số, gạch ngang/dưới.'
              : 'Mã sản phẩm không thể chỉnh sửa sau khi tạo.'
          }
        >
          <input
            id="product-code"
            className={managementFieldClass}
            value={productCode}
            maxLength={100}
            disabled={mode !== 'create' || pending}
            placeholder="Ví dụ: SP-RO-001"
            autoComplete="off"
            onChange={(e) => setProductCode(e.target.value.toUpperCase())}
            aria-invalid={!!fieldError('productCode')}
          />
        </ManagementFormField>

        <ManagementFormField
          id="product-name"
          label="Tên sản phẩm *"
          error={fieldError('productName')}
          hint="Tên định danh đầy đủ của sản phẩm (tối đa 255 ký tự)."
        >
          <input
            id="product-name"
            className={managementFieldClass}
            value={productName}
            maxLength={255}
            disabled={readOnly || pending}
            placeholder="Ví dụ: Máy lọc nước RO AquaPure 5 lõi"
            onChange={(e) => setProductName(e.target.value)}
            aria-invalid={!!fieldError('productName')}
          />
        </ManagementFormField>

        <ManagementFormField
          id="product-category"
          label="Danh mục *"
          error={fieldError('categoryId')}
          hint={categoryLoading ? 'Đang tải danh mục...' : undefined}
        >
          <select
            id="product-category"
            className={managementFieldClass}
            value={categoryId}
            disabled={readOnly || pending || categoryLoading}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-invalid={!!fieldError('categoryId')}
          >
            <option value="">-- Chọn danh mục --</option>
            {categoryOptions.map((opt) => (
              <option key={opt.categoryId} value={opt.categoryId}>
                {opt.categoryCode} — {opt.categoryName}
              </option>
            ))}
          </select>
        </ManagementFormField>

        <ManagementFormField
          id="product-brand"
          label="Thương hiệu"
          error={fieldError('brandId')}
          hint={brandLoading ? 'Đang tải thương hiệu...' : undefined}
        >
          <select
            id="product-brand"
            className={managementFieldClass}
            value={brandId}
            disabled={readOnly || pending || brandLoading}
            onChange={(e) => setBrandId(e.target.value)}
          >
            <option value="">-- Không có thương hiệu --</option>
            {brandOptions.map((opt) => (
              <option key={opt.brandId} value={opt.brandId}>
                {opt.brandCode} — {opt.brandName}
              </option>
            ))}
          </select>
        </ManagementFormField>

        <ManagementFormField
          id="product-type"
          label="Loại sản phẩm"
          error={fieldError('productType')}
        >
          <select
            id="product-type"
            className={managementFieldClass}
            value={productType}
            disabled={readOnly || pending}
            onChange={(e) => setProductType(e.target.value as ProductType)}
          >
            <option value="NORMAL">Sản phẩm thông thường</option>
            <option value="BUNDLE">Gói combo thiết bị</option>
          </select>
        </ManagementFormField>

        <ManagementFormField
          id="product-status"
          label="Trạng thái"
          error={fieldError('status')}
        >
          <select
            id="product-status"
            className={managementFieldClass}
            value={status}
            disabled={readOnly || pending}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
          >
            <option value="DRAFT">Bản nháp</option>
            <option value="ACTIVE">Đang kinh doanh</option>
            <option value="DISCONTINUED">Ngừng kinh doanh</option>
          </select>
        </ManagementFormField>
      </div>

      {/* Description */}
      <ManagementFormField
        id="product-description"
        label="Mô tả chi tiết"
        error={fieldError('description')}
        hint="Tối đa 5.000 ký tự."
      >
        <textarea
          id="product-description"
          rows={3}
          className={managementFieldClass}
          value={description}
          maxLength={5000}
          disabled={readOnly || pending}
          placeholder="Mô tả đặc điểm nổi bật, ứng dụng của sản phẩm..."
          onChange={(e) => setDescription(e.target.value)}
        />
      </ManagementFormField>

      {/* Image URLs manager */}
      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <label className="text-sm font-medium text-slate-800">
          Hình ảnh sản phẩm ({imageUrls.length})
        </label>

        {!readOnly && (
          <div className="space-y-1">
            <div className="flex gap-2">
              <input
                type="url"
                className={managementFieldClass}
                placeholder="Nhập URL ảnh (https://...)"
                value={newImageUrl}
                disabled={pending}
                onChange={(e) => {
                  setNewImageUrl(e.target.value)
                  setImageUrlError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddImage()
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddImage}
                disabled={pending || !newImageUrl.trim()}
                className="mt-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Thêm ảnh
              </button>
            </div>
            {imageUrlError && (
              <p className="text-xs text-rose-600">{imageUrlError}</p>
            )}
          </div>
        )}

        {imageUrls.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 py-6 text-center text-xs text-slate-500">
            <ImageIcon className="mb-1 h-6 w-6 text-slate-400" />
            <span>Chưa có hình ảnh nào cho sản phẩm này.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {imageUrls.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="group relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs"
              >
                <div className="aspect-square w-full overflow-hidden bg-slate-100">
                  <img
                    src={url}
                    alt={`Ảnh ${idx + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      // Fallback when broken link
                      ;(e.target as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>'
                    }}
                  />
                </div>
                <div className="p-2">
                  <p className="truncate text-[11px] text-slate-600" title={url}>
                    {url}
                  </p>
                  {idx === 0 && (
                    <span className="mt-1 inline-block rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-800">
                      Ảnh đại diện
                    </span>
                  )}
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    disabled={pending}
                    aria-label={`Xóa ảnh ${idx + 1}`}
                    className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition-opacity hover:bg-rose-600 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Specifications */}
      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
        <label className="text-sm font-medium text-slate-800">
          Thông số kỹ thuật ({specs.length})
        </label>

        {!readOnly && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Tên thông số (VD: Công suất)"
              className={managementFieldClass}
              value={newSpecKey}
              disabled={pending}
              onChange={(e) => setNewSpecKey(e.target.value)}
            />
            <input
              type="text"
              placeholder="Giá trị (VD: 50W, 220V)"
              className={managementFieldClass}
              value={newSpecValue}
              disabled={pending}
              onChange={(e) => setNewSpecValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddSpec()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddSpec}
              disabled={pending || !newSpecKey.trim()}
              className="mt-1 inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Thêm
            </button>
          </div>
        )}

        {specs.length === 0 ? (
          <p className="text-xs text-slate-500 italic">Chưa có thông số kỹ thuật nào.</p>
        ) : (
          <div className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {specs.map((item, idx) => (
              <div
                key={`${item.key}-${idx}`}
                className="flex items-center justify-between px-3 py-2 text-xs"
              >
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <span className="font-medium text-slate-700">{item.key}</span>
                  <span className="text-slate-900">{item.value || '—'}</span>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSpec(idx)}
                    disabled={pending}
                    aria-label={`Xóa thuộc tính ${item.key}`}
                    className="ml-2 rounded p-1 text-slate-400 hover:text-rose-600 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Read-only variants preview (View mode only) */}
      {readOnly && product?.variants && product.variants.length > 0 && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-800">
              Danh sách biến thể hiện có ({product.variants.length})
            </span>
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Mã SKU</th>
                  <th className="px-3 py-2 font-medium">Tên biến thể</th>
                  <th className="px-3 py-2 font-medium text-right">Giá bán</th>
                  <th className="px-3 py-2 font-medium text-center">Tồn kho</th>
                  <th className="px-3 py-2 font-medium">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {product.variants.map((v) => (
                  <tr key={v.variantId}>
                    <td className="px-3 py-2 font-mono font-medium text-slate-900">{v.sku}</td>
                    <td className="px-3 py-2 text-slate-800">{v.variantName}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-900">
                      {v.sellingPrice?.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="px-3 py-2 text-center text-slate-700">
                      {v.stockQuantity ?? 0}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            * Cấu hình SKU, giá sỉ/lẻ và tồn kho biến thể được quản lý chi tiết tại màn hình Quản lý biến thể & SKU.
          </p>
        </div>
      )}
    </ManagementForm>
  )
}
