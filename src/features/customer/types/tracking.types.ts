import type { Delivery, DeliveryDetail } from '../../fulfillment/types/delivery.types.ts'

export interface CustomerDeliveryTracking {
  delivery: Delivery
  orderCode: string | null
  shipperName: string | null
  shipperPhone: string | null
  items: DeliveryDetail['items']
  photos: DeliveryDetail['photos']
}
