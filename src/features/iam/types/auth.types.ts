export type CanonicalRole =
  | 'SHOP_OWNER'
  | 'SALES_STAFF'
  | 'ACCOUNTANT'
  | 'TECHNICAL_STAFF'
  | 'SHIPPER'
  | 'CUSTOMER'

export const CANONICAL_ROLES: CanonicalRole[] = [
  'SHOP_OWNER',
  'SALES_STAFF',
  'ACCOUNTANT',
  'TECHNICAL_STAFF',
  'SHIPPER',
  'CUSTOMER',
]

export const MANAGEMENT_ROLES: CanonicalRole[] = [
  'SHOP_OWNER',
  'SALES_STAFF',
  'ACCOUNTANT',
  'TECHNICAL_STAFF',
  'SHIPPER',
]

/** Kiểm tra người dùng có phải là tài khoản khách hàng (không có vai trò quản lý nội bộ). */
export function isCustomerRole(roles?: string[] | null): boolean {
  if (!roles || roles.length === 0) return false
  return roles.includes('CUSTOMER') && !roles.some((r) => MANAGEMENT_ROLES.includes(r as CanonicalRole))
}

export interface UserSummary {
  id: string
  username: string
  email: string
  roles: string[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponseData {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user: UserSummary
}

export interface RefreshRequest {
  refresh_token: string
}

export interface TokenResponseData {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export type CurrentUserResponseData = UserSummary

export interface BootstrapError {
  type: 'NETWORK_ERROR' | 'SERVICE_UNAVAILABLE' | 'SESSION_EXPIRED' | 'ACCOUNT_INACTIVE'
  message: string
}

export interface AuthState {
  user: UserSummary | null
  accessToken: string | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  sessionGeneration: number
  bootstrapError: BootstrapError | null
}
