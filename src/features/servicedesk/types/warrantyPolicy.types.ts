export type WarrantyPolicyStatus = 'ACTIVE' | 'INACTIVE'

export interface WarrantyPolicy {
  policyId: string
  policyCode: string
  policyName: string
  brandId: string
  brandName: string
  categoryId: string
  categoryName: string
  warrantyPeriodMonths: number
  coverageConditions: string
  status: WarrantyPolicyStatus
  variantReferenceCount: number
  createdAt?: string
  updatedAt?: string
}

export interface WarrantyPolicyVariant {
  variantId: string
  sku: string
  variantName: string
}

export interface WarrantyPolicyDetail {
  policy: WarrantyPolicy
  variants: WarrantyPolicyVariant[]
}

export interface WarrantyPolicyReferenceData {
  brands: Array<{ brandId: string; brandCode: string; brandName: string; status: string }>
  categories: Array<{ categoryId: string; categoryCode: string; categoryName: string; status: string }>
}

export interface UpsertWarrantyPolicyRequest {
  policyName: string
  brandId: string
  categoryId: string
  warrantyPeriodMonths: number
  coverageConditions: string
  status: WarrantyPolicyStatus
}

export interface WarrantyPolicyAuditLog {
  id: string
  actorName?: string
  action: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  createdAt: string
}
