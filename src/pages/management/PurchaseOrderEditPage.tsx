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
      <div className="py-24 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mb-3"></div>
        <p className="text-sm">Đang tải thông tin đơn mua hàng...</p>
      </div>
    )
  }

  if (error || !po) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">Không tìm thấy đơn mua hàng</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">
          Đơn mua hàng không tồn tại hoặc bạn không có quyền truy cập.
        </p>
        <Link
          to="/app/purchase-orders"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Về danh sách đơn mua
        </Link>
      </div>
    )
  }

  if (po.status !== 'DRAFT' && po.status !== 'QUOTED') {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800">Đơn mua hàng đã bị khóa chỉnh sửa</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4 leading-relaxed">
          Đơn mua hàng đã chốt và đang trong tiến trình giao nhận. Danh sách sản phẩm và đơn giá đã được khóa cứng.
          Để đặt thêm hàng, vui lòng tạo Đơn mua hàng mới.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/app/purchase-orders/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm"
          >
            Tạo Đơn mua hàng mới
          </Link>
          <Link
            to={`/app/purchase-orders/${po.purchaseOrderId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Xem chi tiết đơn mua
          </Link>
        </div>
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
