export const deliveryStatuses = { DISPATCHED: 'Chờ phân công', ASSIGNED: 'Đã phân công', IN_TRANSIT: 'Đang giao', RESCHEDULED: 'Chờ giao lại', DELIVERED: 'Đã giao', FAILED: 'Giao thất bại', DRAFT: 'Nháp', CANCELLED: 'Đã hủy' }
export type DeliveryStatus = keyof typeof deliveryStatuses
export interface Delivery {
  salesInvoiceId?: string | null
  deliveryId: string; deliveryCode: string; orderId: string; batchNo: number | null
  warehouseCode: string; shipperId: string | null; deliveryStatus: DeliveryStatus
  recipientName: string; recipientPhone: string; deliveryAddress: string
  scheduledDate: string | null; assignedAt: string | null; startedAt: string | null
  deliveredAt: string | null; codRequired: boolean; codAmount: number | null
  confirmedAt?: string | null; dispatchDate?: string | null
  note: string | null; updatedAt: string | null
}
export interface DeliveryDetail {
  delivery: Delivery; assignedBy: string | null; shipperName: string | null; shipperPhone: string | null
  items: { deliveryItemId: string; orderItemId: string; sku: string; productName: string; variantName: string; quantity: number; serialNumbers: string[] }[]
  photos: { photoId: string; contentUrl: string }[]
}
export interface DeliveryPage { content: Delivery[]; totalElements: number; totalPages: number; number: number }
export interface DeliveryFilters { page: number; size: number; status?: string; shipperId?: string; deliveryCode?: string; scheduledFrom?: string; scheduledTo?: string; orderId?: string }
export const canAssignDelivery = (row: Delivery) => row.deliveryStatus === 'RESCHEDULED' || (['DISPATCHED', 'ASSIGNED'].includes(row.deliveryStatus) && !row.startedAt)
