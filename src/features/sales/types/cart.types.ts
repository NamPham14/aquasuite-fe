/**
 * Định nghĩa các kiểu dữ liệu cho chức năng Quản lý Giỏ hàng của khách hàng (UC-17).
 */

export interface CartItemResponse {
  cartItemId: string
  variantId: string
  productId?: string | null
  sku: string
  productName: string
  variantName: string
  unit: string
  quantity: number
  unitPrice: number
  currentSellingPrice: number
  lineTotal: number
  availableQty: number
  variantStatus: string
  inStock: boolean
  priceChanged: boolean
  updatedAt: string
}

export interface CartResponse {
  customerId: string
  items: CartItemResponse[]
  totalItems: number
  totalQuantity: number
  subtotal: number
  hasInvalidItems: boolean
}

export interface AddCartItemRequest {
  variantId: string
  quantity: number
}

export interface UpdateCartItemQuantityRequest {
  quantity: number
}

