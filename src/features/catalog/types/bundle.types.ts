export type BundlePublication = 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED'
export type BundleProductStatus = 'ACTIVE' | 'INACTIVE'

export interface BundleItem {
  bundleItemId: string
  variantId: string
  sku: string
  name: string
  quantity: number
  sellingPrice: number | null
  sellable: boolean
}

export interface Bundle {
  bundleId: string
  productCode: string
  name: string
  description?: string | null
  productStatus: BundleProductStatus
  publicationStatus: BundlePublication
  version: number
  linkedItemsCount: number
  originalTotal: number | null
  packagePrice: number
  savingAmount?: number | null
  discountPercent?: number | null
  priceIssue?: string | null
  items: BundleItem[]
  validFrom?: string | null
  validUntil?: string | null
  createdAt: string
  updatedAt: string
}

export interface BundleSku {
  variantId: string
  productId: string
  sku: string
  variantName: string
  productName: string
  sellingPrice: number
}

export interface BundleListParams {
  page: number
  size: number
  keyword?: string
  productStatus?: BundleProductStatus
  publicationStatus?: BundlePublication
}

export interface BundleDefinition {
  productCode: string
  name: string
  description: string | null
  items: { variantId: string; quantity: number }[]
  // Decimal string avoids losing fractional digits before the BE BigDecimal binding.
  packagePrice: string
  validFrom: string | null
  validUntil: string | null
}

export interface BundleSelectedItem {
  variantId: string
  sku: string
  name: string
  quantity: number
  sellingPrice: number | null
  sellable: boolean
}
