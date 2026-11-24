export type WarrantyStatus = 'ACTIVE' | 'VOIDED'

export type WarrantyDisplayStatus = 'ACTIVE' | 'EXPIRED' | 'CLAIMED' | 'VOIDED'

export interface WarrantyPolicySummary {
  warrantyPolicyId: string
  policyCode: string
  policyName: string
  warrantyMonths: number
  warrantyTerms?: string | null
  status: string
}

export interface VariantWarrantyInfo {
  variantId: string
  sku?: string | null
  variantName?: string | null
  productName?: string | null
  serialTracking: boolean
  warrantyPolicyId?: string | null
  policyCode?: string | null
  policyName?: string | null
  warrantyMonths: number
  warrantyTerms?: string | null
  policyStatus?: string | null
}

export interface WarrantyRecordListItem {
  warrantyRecordId: string
  warrantyCode: string
  variantId: string
  sku?: string | null
  productName?: string | null
  variantName?: string | null
  serialNumber?: string | null
  customerId: string
  customerName?: string | null
  phoneNumber?: string | null
  orderId?: string | null
  orderCode?: string | null
  startDate: string
  endDate: string
  remainingDays: number
  warrantyMonths: number
  status: WarrantyStatus
  displayStatus: WarrantyDisplayStatus
  canRequestSupport?: boolean
  openTicketCode?: string | null
  createdAt: string
}

export interface OrderInvoiceInfo {
  orderId: string
  orderItemId?: string | null
  orderCode: string
  orderStatus: string
  paymentStatus: string
  orderDate: string
  deliveryAddress?: string | null
  invoiceId?: string | null
  invoiceCode?: string | null
  invoiceType?: string | null
  invoiceStatus?: string | null
  issueDate?: string | null
  invoiceTotalAmount?: number | null
}

export interface DeliveryNoteInfo {
  deliveryId: string
  deliveryCode?: string | null
  status?: string | null
  deliveredAt?: string | null
  note?: string | null
}

export interface WarrantyRecordDetail {
  warrantyRecordId: string
  warrantyCode: string
  status: WarrantyStatus
  displayStatus: WarrantyDisplayStatus
  canRequestSupport?: boolean
  openTicketCode?: string | null
  startDate: string
  endDate: string
  warrantyMonths: number
  remainingDays: number
  voidReason?: string | null
  voidedAt?: string | null
  voidedBy?: string | null
  createdBy?: string | null
  createdAt: string

  variantId: string
  sku?: string | null
  productName?: string | null
  variantName?: string | null
  serialTracking?: boolean | null
  serialNumber?: string | null

  warrantyPolicyId?: string | null
  policyCode?: string | null
  policyName?: string | null
  warrantyTerms?: string | null

  customerId: string
  customerCode?: string | null
  customerName?: string | null
  phoneNumber?: string | null
  customerEmail?: string | null
  installationAddress?: string | null

  orderInvoice?: OrderInvoiceInfo | null
  deliveryNote?: DeliveryNoteInfo | null
}

export interface WarrantyFilterParams {
  keyword?: string
  phone?: string
  serialNumber?: string
  displayStatus?: WarrantyDisplayStatus | ''
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

export interface CreateWarrantyFromOrderRequest {
  orderItemId: string
  serialNumber?: string
  startDate: string
}

export interface CreateAdHocWarrantyRequest {
  customerId: string
  variantId: string
  warrantyPolicyId?: string
  serialNumber?: string
  startDate: string
}

export interface VoidWarrantyRequest {
  reason: string
}
