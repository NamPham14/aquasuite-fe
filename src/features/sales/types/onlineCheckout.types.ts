import type { CartResponse } from './cart.types.ts'

/**
 * Kiểu dữ liệu Đặt hàng và Thanh toán trực tuyến qua PayOS (UC-18).
 */

export type OnlinePaymentMethod = 'BANK_TRANSFER' | 'CASH'

export interface CustomerAddressDto {
  addressId: string
  customerId: string
  recipientName: string
  phone: string
  province?: string | null
  district?: string | null
  ward?: string | null
  streetAddress?: string | null
  addressText: string
  label?: string | null
  isDefault: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

export interface OnlineCheckoutPreviewResponse {
  cart: CartResponse
  savedAddresses: CustomerAddressDto[]
  defaultAddress: CustomerAddressDto | null
  shippingFee: number
  grandTotal: number
  payosConfigured: boolean
}

export interface PlaceOnlineOrderRequest {
  addressId?: string | null
  recipientName?: string
  recipientPhone?: string
  deliveryAddress?: string
  deliverySchedule?: string
  note?: string
  paymentMethod: OnlinePaymentMethod
}

export interface OnlineOrderItemResponse {
  orderItemId: string
  orderId: string
  variantId?: string | null
  comboId?: string | null
  sku: string
  productName: string
  variantName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  lineTotal: number
}

export interface PayosPaymentLinkResponse {
  payosOrderCode: number
  paymentLinkId: string
  checkoutUrl: string
  qrCode: string
  bin?: string | null
  accountNumber?: string | null
  accountName?: string | null
  amount: number
  amountPaid: number
  description: string
  status: string
}

export interface OnlineOrderCheckoutResponse {
  orderId: string
  orderCode: string
  customerId: string
  orderChannel: string
  orderType: string
  orderStatus: string
  paymentStatus: string
  paymentMethod: OnlinePaymentMethod | string
  subtotal: number
  shippingFee: number
  totalAmount: number
  deliveryAddress: string
  deliverySchedule?: string | null
  note?: string | null
  createdAt: string
  items: OnlineOrderItemResponse[]
  payosPayment: PayosPaymentLinkResponse | null
}

