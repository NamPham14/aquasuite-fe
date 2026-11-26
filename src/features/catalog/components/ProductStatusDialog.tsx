import { useState } from 'react'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import { Button } from '../../../shared/ui/Button'
import { Notice } from '../../../shared/ui/Badge'
import type { ProductDetail, ProductStatus, ProductSummary } from '../types'
import { ProductStatusBadge } from './ProductStatusBadge'

interface ProductStatusDialogProps {
  product: ProductSummary | ProductDetail
  pending: boolean
  apiError?: string
  onClose: () => void
  onConfirm: (status: ProductStatus) => Promise<void>
  operational?: boolean
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
    <ManagementDialog title="Cập nhật trạng thái sản phẩm" onClose={onClose} closeDisabled={pending}>
      <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
        <div>
          <p className="font-semibold text-aqs-ink">
            {product.productCode} — {product.productName}
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm text-aqs-ink-muted">
            <span>Trạng thái hiện tại:</span>
            <ProductStatusBadge status={product.status} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[13px] font-semibold text-aqs-ink-muted">Chọn trạng thái mới</label>
          <div className="space-y-2">
            {statusOptions.map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-control border p-3 transition-colors ${
                  selectedStatus === opt.value
                    ? 'border-aqs-accent bg-aqs-accent-soft'
                    : 'border-aqs-border hover:bg-aqs-surface-subtle'
                }`}
              >
                <input
                  type="radio"
                  name="product-status"
                  value={opt.value}
                  checked={selectedStatus === opt.value}
                  onChange={() => setSelectedStatus(opt.value)}
                  disabled={pending}
                  className="mt-1 h-4 w-4 accent-aqs-accent"
                />
                <div className="text-sm">
                  <div className="font-semibold text-aqs-ink">{opt.label}</div>
                  <div className="text-xs text-aqs-ink-muted">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {selectedStatus === 'DISCONTINUED' && (
          <Notice tone="warning" title="Lưu ý khi ngừng kinh doanh">
            Lưu ý: Chuyển sang &quot;Ngừng kinh doanh&quot; sẽ ngăn chặn sản phẩm này khỏi việc tạo mới trong báo giá và đơn hàng bán mới.
          </Notice>
        )}

        {apiError && (
          <Notice tone="danger" role="alert" title="Không thể cập nhật trạng thái">
            {apiError}
          </Notice>
        )}

        <div className="flex justify-end gap-2 border-t border-aqs-border pt-4">
          <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={pending}
            disabled={pending || selectedStatus === product.status}
          >
            {pending ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
          </Button>
        </div>
      </form>
    </ManagementDialog>
  )
}
