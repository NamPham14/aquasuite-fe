export type UserAccountStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED'

export interface AssignableRole {
  id: string
  code: string
  description?: string | null
}

export interface UserAccount {
  id: string
  username: string
  email: string
  phone: string
  avatarUrl?: string | null
  roles: AssignableRole[]
  status: UserAccountStatus
  provider?: string | null
  isVerified: boolean
  createdAt: string
  currentUser: boolean
}

export interface UserAccountStats {
  total: number
  active: number
  inactive: number
  locked: number
}

export interface UserAccountPage {
  content: UserAccount[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface UserAccountQuery {
  keyword?: string
  roleId?: string
  status?: UserAccountStatus
  page: number
  size: number
}

export interface CreateUserAccountRequest {
  username: string
  email: string
  phone: string
  roleIds: string[]
  avatarUrl?: string
  autoGenerateTemporaryPassword: boolean
  temporaryPassword?: string
  confirmTemporaryPassword?: string
}

export interface UpdateUserAccountRequest {
  username: string
  email: string
  phone: string
  roleIds: string[]
  avatarUrl?: string
}

export interface ChangeUserStatusRequest {
  targetStatus: UserAccountStatus
  reason?: string
}

export interface UserAccountFormValues {
  username: string
  email: string
  phone: string
  roleIds: string[]
  avatarUrl: string
  autoGenerateTemporaryPassword: boolean
  temporaryPassword: string
  confirmTemporaryPassword: string
}
