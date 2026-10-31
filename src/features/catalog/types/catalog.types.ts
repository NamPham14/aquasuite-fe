export type CatalogStatus = 'ACTIVE' | 'INACTIVE'
export type CatalogSortDirection = 'asc' | 'desc'

/** Tham số tìm kiếm và phân trang server; page bắt đầu từ 0. */
export interface CatalogListParams {
  page: number
  size: number
  search?: string
  status?: CatalogStatus
  sortBy: string
  direction: CatalogSortDirection
}

export type CatalogDialogMode = 'create' | 'view' | 'edit' | 'delete'
