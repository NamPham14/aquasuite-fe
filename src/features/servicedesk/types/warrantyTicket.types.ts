export type WarrantyTicketStatus = 'NEW' | 'IN_PROGRESS' | 'DONE' | 'REJECTED' | 'CANCELLED'

export type PreferredSlot = 'MORNING' | 'AFTERNOON' | 'EVENING'

export interface TicketMedia {
  type: 'IMAGE' | 'VIDEO'
  url: string
  publicId: string
  contentType?: string
  sizeBytes?: number
}

export interface ClaimFormData {
  warrantyRecordId: string
  warrantyCode: string
  productName?: string | null
  variantName?: string | null
  sku?: string | null
  serialNumber?: string | null
  startDate: string
  endDate: string
  expired: boolean
  canSubmit: boolean
  blockedReason?: string | null
  openTicketCode?: string | null
  contactName: string
  contactPhone: string
  contactEmail?: string | null
  suggestedSiteAddress?: string | null
  customerAddresses: string[]
}

export interface CreateWarrantyTicketPayload {
  warrantyRecordId: string
  issueDescription: string
  preferredDate?: string | null
  preferredSlot?: PreferredSlot | null
  siteAddress: string
  media?: TicketMedia[]
}

export interface CancelWarrantyTicketPayload {
  reason?: string | null
}

export interface WarrantyTicketListItem {
  ticketId: string
  ticketCode: string
  warrantyRecordId: string
  warrantyCode?: string | null
  productName?: string | null
  variantName?: string | null
  serialNumber?: string | null
  issueDescription: string
  preferredDate?: string | null
  preferredSlot?: PreferredSlot | null
  siteAddress: string
  status: WarrantyTicketStatus
  canCancel: boolean
  mediaCount: number
  createdAt: string
}

export interface WarrantyTicketDetail {
  ticketId: string
  ticketCode: string
  warrantyRecordId: string
  warrantyCode?: string | null
  productName?: string | null
  variantName?: string | null
  sku?: string | null
  serialNumber?: string | null
  warrantyStartDate?: string | null
  warrantyEndDate?: string | null
  contactName: string
  contactPhone: string
  contactEmail?: string | null
  issueDescription: string
  preferredDate?: string | null
  preferredSlot?: PreferredSlot | null
  siteAddress: string
  media: TicketMedia[]
  status: WarrantyTicketStatus
  canCancel: boolean
  technicalJobId?: string | null
  result?: string | null
  rejectionReason?: string | null
  cancelReason?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt?: string | null
}

export interface WarrantyTicketFilterParams {
  status?: WarrantyTicketStatus
  page?: number
  size?: number
}

