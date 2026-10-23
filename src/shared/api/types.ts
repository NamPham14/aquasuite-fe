export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PageParams {
  page?: number
  size?: number
  search?: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface TokenPair {
  accessToken: string
  refreshToken?: string
}

