export type VariantStatus = 'ACTIVE' | 'INACTIVE' | 'DELETED'

export interface ProductVariant {
  id: string
  productId: string
  sku: string
  variantName: string
  unit: string
  conversionRate: number
  color?: string | null
  size?: string | null
  weight: number
  technicalSpec?: Record<string, unknown> | null
  costPrice?: number | null
  sellingPrice?: number | null
  warrantyPolicyId?: string | null
  serialTracking: boolean
  status: VariantStatus
}

export interface VariantUpsertRequest {
  sku: string
  variantName: string
  unit: string
  conversionRate: number
  color?: string
  size?: string
  weight: number
  technicalSpec?: Record<string, unknown>
  costPrice?: number
  sellingPrice?: number
  warrantyPolicyId?: string
  serialTracking?: boolean
  status?: VariantStatus
  acknowledgeBelowCost: boolean
}

export interface VariantPage { content: ProductVariant[]; number: number; size: number; totalElements: number; totalPages: number }
export interface VariantStats { total: number; active: number; inactive: number; missingRetailPrice: number }
export interface VariantDeletionEligibility {
  variantId: string; onHandQty: number; reservedQty: number; goodsReceiptCount: number; stockMovementCount: number
  dispatchCount: number; quotationCount: number; orderCount: number; invoiceCount: number; stockCountItemCount: number
  activeBundleCount: number; activeBundleOptionCount: number; purchaseOrderCount: number; deliveryItemCount: number; cartItemCount: number; eligible: boolean
}
export interface VariantDeleteRequest { confirmed: boolean; reason: string }
