import type { PageParams } from '../../../shared/api/types'

export type QuotationStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT'
  | 'SUPERSEDED'
  | 'ACCEPTED'
  | 'LOST'

export interface QuotationPaymentMilestone {
  milestoneId?: string
  stageName: string
  percent: number
  sortOrder?: number
}

export interface QuotationItemRequest {
  variantId: string
  quantity: number
  discountRate?: number
}

export interface QuotationUpsertRequest {
  customerId: string
  projectName: string
  deliveryAddress?: string
  deliverySchedule?: string
  sentToEmail?: string
  validUntil?: string
  vatRate?: number
  shippingFee?: number
  note?: string
  items: QuotationItemRequest[]
  milestones?: QuotationPaymentMilestone[]
}

export interface QuotationComponentResponse {
  sku: string
  variantName?: string
  unit: string
  quantity: number
  unitPrice: number
  backorderQty?: number
  leadTimeDays?: number
}

export interface QuotationItemResponse {
  quotationItemId: string
  variantId: string
  sku: string
  variantName?: string
  unit: string
  quantity: number
  unitPrice: number
  discountRate: number
  discountAmount: number
  lineTotal: number
  backorderQty?: number
  isBackorder?: boolean
  leadTimeDays?: number
  sortOrder: number
  components: QuotationComponentResponse[]
}

export interface QuotationSummaryResponse {
  listPriceTotal: number
  totalDiscount: number
  netAmount: number
  vatRate: number
  vatAmount: number
  shippingFee: number
  grandTotal: number
}

export interface QuotationApprovalInfo {
  requiresApproval?: boolean
  maxDiscountRate?: number
  staffDiscountLimit?: number
  approvedBy?: string
  approvedAt?: string
}

export interface QuotationItemCost {
  variantId: string
  unitCost: number
  lineProfit: number
}

export interface QuotationOwnerData {
  totalCost?: number
  grossProfit?: number
  marginPercent?: number
  marginPercentAtApproval?: number
  approvalNote?: string
  itemCosts?: QuotationItemCost[]
}

export interface QuotationResponse {
  quotationId: string
  quotationCode: string
  revisionNo: number
  parentQuotationId?: string
  status: QuotationStatus
  quotationDate: string
  validUntil: string
  customerId: string
  customerName?: string
  projectName: string
  deliveryAddress?: string
  deliverySchedule?: string
  sentToEmail?: string
  note?: string
  items: QuotationItemResponse[]
  milestones: QuotationPaymentMilestone[]
  summary?: QuotationSummaryResponse
  approval?: QuotationApprovalInfo
  ownerData?: QuotationOwnerData
  sentAt?: string
  pdfUrl?: string
  acceptedAt?: string
  signedFileUrl?: string
  lostAt?: string
  lostReason?: string
  createdBy: string
}

export interface QuotationListItemResponse {
  quotationId: string
  quotationCode: string
  revisionNo: number
  customerName?: string
  projectName: string
  status: QuotationStatus
  quotationDate: string
  validUntil: string
  totalAmount: number
  createdByName?: string
  requiresApproval?: boolean
}

export interface QuotationFilterParams extends PageParams {
  search?: string
  status?: QuotationStatus | ''
  customerId?: string
  fromDate?: string
  toDate?: string
}

export interface SubmitApprovalRequest {
  approvalNote: string
}

export interface ApproveQuotationRequest {
  approvalNote?: string
}

export interface RejectQuotationRequest {
  rejectionReason: string
}

export interface MarkAcceptedRequest {
  signedFileUrl?: string
}

export interface MarkLostRequest {
  lostReason: string
}

