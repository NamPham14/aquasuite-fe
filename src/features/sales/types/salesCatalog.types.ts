/**
 * Kiểu dữ liệu chuẩn cho một sản phẩm / biến thể / gói Combo hiển thị tại Showroom và luồng bán hàng.
 */
export interface CatalogItemOption {
  variantId: string
  sku: string
  name: string
  brand: string
  category: string
  sellingPrice: number
  availableStock: number
  unit: string
  isCombo?: boolean
  description?: string
  imageUrl?: string
  specifications?: Record<string, string>
  components?: string[]
}
