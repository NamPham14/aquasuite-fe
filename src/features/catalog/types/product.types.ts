export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'DELETED'
export type ProductType = 'NORMAL' | 'BUNDLE'

/** Read model returned by the Shop Owner product-list endpoint. */
export interface ProductSummary {
  productId: string
  productCode: string
  productName: string
  categoryId?: string | null
  categoryName?: string | null
  brandId?: string | null
  brandName?: string | null
  productType: ProductType
  status: ProductStatus
  primaryImageUrl?: string | null
  minSellingPrice?: number | null
  maxSellingPrice?: number | null
  totalVariants: number
  createdAt: string
  updatedAt: string
}
export interface ProductPage { content: ProductSummary[]; number: number; size: number; totalElements: number; totalPages: number }
export interface ProductListQuery { keyword?: string; categoryId?: string; brandId?: string; status?: ProductStatus; productType?: ProductType; page: number; size: number }
