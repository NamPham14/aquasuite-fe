/**
 * Định nghĩa các kiểu dữ liệu cho chức năng Quản lý Giỏ hàng của khách hàng (UC-17).
 */

export interface CartItemResponse {
  cartItemId: string
  variantId: string
  comboId?: string | null
  productId?: string | null
  sku: string
  productName: string
  variantName: string
  imageUrl?: string | null
  unit: string
  quantity: number
  unitPrice: number
  currentSellingPrice: number
  lineTotal: number
  availableQty: number
  variantStatus: string
  inStock: boolean
  priceChanged: boolean
  isCombo?: boolean
  components?: string[]
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
  variantId?: string
  comboId?: string
  quantity: number
}

export interface MergeCartItemsRequest {
  items: AddCartItemRequest[]
}

export interface UpdateCartItemQuantityRequest {
  quantity: number
}
