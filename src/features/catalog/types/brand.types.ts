import type { AuditableEntity } from '../../../shared/types'

export interface Brand extends AuditableEntity {
  name: string
  slug: string
  description?: string
  logoUrl?: string
  active: boolean
}

export interface CreateBrandRequest {
  name: string
  slug: string
  description?: string
  logoUrl?: string
  active: boolean
}

export type UpdateBrandRequest = Partial<CreateBrandRequest>

