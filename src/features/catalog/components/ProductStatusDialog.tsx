import { useState } from 'react'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import type { ProductDetail, ProductStatus, ProductSummary } from '../types'
import { ProductStatusBadge } from './ProductStatusBadge'

const secondaryButton =
  'min-h-10 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50'
const primaryButton =
  'min-h-10 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50'

interface ProductStatusDialogProps {
  product: ProductSummary | ProductDetail
  pending: boolean
  apiError?: string
  onClose: () => void
  onConfirm: (status: ProductStatus) => Promise<void>
}

const statusOptions: { value: ProductStatus; label: string; desc: string }[] = [
  { value: 'DRAFT', label: 'Bản nháp', desc: 'Sản phẩm đang soạn thảo, chưa hiển thị cho khách hàng.' },
  { value: 'ACTIVE', label: 'Đang kinh doanh', desc: 'Sản phẩm sẵn sàng hiển thị và tham gia giao dịch.' },
  { value: 'DISCONTINUED', label: 'Ngừng kinh doanh', desc: 'Không còn tiếp tục kinh doanh hoặc bán lẻ.' },
]

export function ProductStatusDialog({
  product,
  pending,
  apiError,
  onClose,
  onConfirm,
}: ProductStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus>(product.status)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (pending || selectedStatus === product.status) return
    await onConfirm(selectedStatus)
  }

  return (
    <ManagementDialog
      title="Cập nhật trạng thái sản phẩm"
      onClose={onClose}
      closeDisabled={pending}
    >
      <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="font-medium text-slate-900">
            {product.productCode} — {product.productName}
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <span>Trạng thái hiện tại:</span>
            <ProductStatusBadge status={product.status} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Chọn trạng thái mới</label>
          <div className="space-y-2">
            {statusOptions.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  selectedStatus === opt.value
                    ? 'border-sky-600 bg-sky-50/50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="product-status"
                  value={opt.value}
                  checked={selectedStatus === opt.value}
                  onChange={() => setSelectedStatus(opt.value)}
                  disabled={pending}
                  className="mt-1 h-4 w-4 text-sky-600 focus:ring-sky-500"
                />
                <div className="text-sm">
                  <div className="font-medium text-slate-800">{opt.label}</div>
                  <div className="text-xs text-slate-500">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {selectedStatus === 'DISCONTINUED' && (
          <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">
            Lưu ý: Chuyển sang &quot;Ngừng kinh doanh&quot; sẽ ngăn chặn sản phẩm này khỏi việc tạo mới trong báo giá và đơn hàng bán mới.
          </p>
        )}

        {apiError && (
          <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-800">
            {apiError}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            className={secondaryButton}
            disabled={pending}
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            type="submit"
            className={primaryButton}
            disabled={pending || selectedStatus === product.status}
          >
            {pending ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
          </button>
        </div>
      </form>
    </ManagementDialog>
  )
}

