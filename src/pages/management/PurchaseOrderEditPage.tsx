import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import {
  useGetPurchaseOrderQuery,
  useUpdatePurchaseOrderMutation,
} from '../../features/purchasing/api/purchaseOrderApi'
import { PurchaseOrderEditor } from '../../features/purchasing/components/PurchaseOrderEditor'
import type { UpdatePurchaseOrderRequest } from '../../features/purchasing/types/purchaseOrder.types'

export function PurchaseOrderEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: po, isLoading, error } = useGetPurchaseOrderQuery(id!, { skip: !id })
  const [updatePurchaseOrder] = useUpdatePurchaseOrderMutation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isLoading) {
    return (
      <div className="py-24 text-center text-aqs-ink-muted">
        <div className="mb-3 inline-block h-8 w-8 animate-spin rounded-full border-b-2 border-aqs-accent motion-reduce:animate-none"></div>
        <p className="text-sm">Đang tải thông tin đơn mua hàng...</p>
      </div>
    )
  }

  if (error || !po) {
    return (
      <div className="mx-auto my-12 max-w-md rounded-card border border-aqs-border bg-aqs-surface p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-aqs-danger" />
        <h2 className="text-base font-bold text-aqs-ink">Không tìm thấy đơn mua hàng</h2>
        <p className="mt-1 mb-4 text-xs text-aqs-ink-muted">
          Đơn mua hàng không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <Link
          to="/app/purchase-orders"
          className="inline-flex h-10 items-center gap-1.5 rounded-control bg-aqs-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-aqs-accent-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Về danh sách đơn mua
        </Link>
      </div>
    )
  }

  if (po.status !== 'DRAFT') {
    return (
      <div className="mx-auto my-12 max-w-md rounded-card border border-aqs-border bg-aqs-surface p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-aqs-warning" />
        <h2 className="text-base font-bold text-aqs-ink">Đơn mua hàng đã bị khóa chỉnh sửa</h2>
        <p className="mt-1 mb-4 text-xs text-aqs-ink-muted">
          Chỉ có thể sửa đơn mua hàng khi ở trạng thái <strong>Bản nháp (DRAFT)</strong>.
        </p>
        <Link
          to={`/app/purchase-orders/${po.purchaseOrderId}`}
          className="inline-flex h-10 items-center gap-1.5 rounded-control bg-aqs-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-aqs-accent-hover"
        >
          <ArrowLeft className="h-4 w-4" />
          Xem chi tiết đơn mua
        </Link>
      </div>
    )
  }

  const handleSubmit = async (data: UpdatePurchaseOrderRequest) => {
    setIsSubmitting(true)
    try {
      const result = await updatePurchaseOrder({ id: po.purchaseOrderId, body: data }).unwrap()
      toast.success(`Đã cập nhật đơn mua hàng ${result.poCode}!`)
      navigate(`/app/purchase-orders/${po.purchaseOrderId}`)
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Có lỗi xảy ra khi cập nhật đơn mua')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pb-12">
      <PurchaseOrderEditor
        mode="edit"
        initialData={po}
        isSubmitting={isSubmitting}
        onSubmitEdit={handleSubmit}
      />
    </div>
  )
}
