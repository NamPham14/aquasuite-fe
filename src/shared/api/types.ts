export interface ApiResponse<T> {
  success: boolean
  code: string
  message: string
  data?: T
  errors?: FieldErrorDetail[]
  timestamp: string
}

export interface FieldErrorDetail {
  field: string
  message: string
}

export interface PageParams {
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

export interface PageResponse<T> {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}


