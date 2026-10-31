import type { AuditableEntity } from '../../../shared/types'

export interface Category extends AuditableEntity {
  name: string
  slug: string
  description?: string
  active: boolean
}

export interface CreateCategoryRequest {
  name: string
  slug: string
  description?: string
  active: boolean
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>

