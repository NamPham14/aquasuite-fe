export type EntityId = string

export interface AuditableEntity {
  id: EntityId
  createdAt: string
  updatedAt: string
}

