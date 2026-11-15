export type WarrantyLookupStatus = 'ACTIVE' | 'EXPIRED'

export interface WarrantyLookupRecord {
  warrantyRecordId: string
  productName: string
  variantName?: string
  sku?: string
  serialNumber: string
  orderCode?: string
  warrantyTerms?: string
  startDate: string
  endDate: string
  remainingDays: number
  status: WarrantyLookupStatus
  claimAllowed: boolean
}
