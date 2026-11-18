export interface DeliveryAddressDto {
  addressId: string
  customerId: string
  recipientName: string
  phone: string
  province: string
  district: string
  ward: string
  streetAddress: string
  addressText: string
  label?: string | null
  isDefault: boolean
  createdAt?: string | null
  updatedAt?: string | null
}

export interface UserProfileResponse {
  id: string
  username: string
  fullName: string
  email: string
  phone?: string | null
  avatarUrl?: string | null
  roles: string[]
  customerCode?: string | null
  customerTier?: string | null
  deliveryAddresses: DeliveryAddressDto[]
}

export interface UpdateProfileRequest {
  fullName: string
  phone?: string
  avatarUrl?: string
}

export interface UpsertDeliveryAddressRequest {
  recipientName: string
  phone: string
  province: string
  district: string
  ward: string
  streetAddress: string
  label?: string
  isDefault?: boolean
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export interface PasswordActionResponse {
  message: string
}

