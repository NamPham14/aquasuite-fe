import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCreatePurchaseOrderMutation } from '../../features/purchasing/api/purchaseOrderApi'
import { PurchaseOrderEditor } from '../../features/purchasing/components/PurchaseOrderEditor'
import type { CreatePurchaseOrderRequest } from '../../features/purchasing/types/purchaseOrder.types'

export function PurchaseOrderCreatePage() {
  const navigate = useNavigate()
  const [createPurchaseOrder] = useCreatePurchaseOrderMutation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: CreatePurchaseOrderRequest) => {
    setIsSubmitting(true)
    try {
      const result = await createPurchaseOrder(data).unwrap()
      toast.success(`Đã tạo thành công đơn mua hàng ${result.poCode}!`)
      navigate(`/app/purchase-orders/${result.purchaseOrderId}`)
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || 'Có lỗi xảy ra khi tạo đơn mua hàng')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pb-12">
      <PurchaseOrderEditor
        mode="create"
        isSubmitting={isSubmitting}
        onSubmitCreate={handleSubmit}
      />
    </div>
  )
}
