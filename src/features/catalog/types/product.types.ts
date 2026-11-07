export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'DELETED'

export type ProductType = 'NORMAL' | 'BUNDLE'

export interface CategoryBrief {
  categoryId: string
  categoryCode: string
  categoryName: string
}

export interface BrandBrief {
  brandId: string
  brandCode: string
  brandName: string
}

export interface ProductImage {
  imageId?: string
  variantId?: string | null
  imageUrl: string
  isPrimary?: boolean
  sortOrder?: number
}

export interface ProductVariantBrief {
  variantId: string
  sku: string
  variantName: string
  sellingPrice: number
  costPrice?: number | null
  stockQuantity?: number
  status: string
}

export interface ProductSummary {
  productId: string
  productCode: string
  productName: string
  categoryId: string
  categoryName: string
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

export interface ProductDetail {
  productId: string
  productCode: string
  productName: string
  category: CategoryBrief
  brand?: BrandBrief | null
  description?: string | null
  specifications?: Record<string, unknown> | null
  productType: ProductType
  status: ProductStatus
  images: ProductImage[]
  variants?: ProductVariantBrief[]
  createdAt: string
  updatedAt: string
}

export interface CreateProductRequest {
  productCode: string
  productName: string
  categoryId: string
  brandId?: string | null
  description?: string | null
  specifications?: Record<string, unknown> | null
  productType?: ProductType
  status?: ProductStatus
  imageUrls?: string[]
}

export interface UpdateProductRequest {
  productCode: string
  productName: string
  categoryId: string
  brandId?: string | null
  description?: string | null
  specifications?: Record<string, unknown> | null
  productType?: ProductType
  status?: ProductStatus
  imageUrls?: string[]
}

export interface UpdateProductStatusRequest {
  status: ProductStatus
}

export interface ProductListParams {
  page: number
  size: number
  keyword?: string
  categoryId?: string
  brandId?: string
  status?: ProductStatus
  productType?: ProductType
  sort?: string
}

export interface ProductPageResponse {
  items: ProductSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

