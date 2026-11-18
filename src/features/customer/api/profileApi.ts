import { baseApi } from '../../../shared/api/baseApi.ts'
import type {
  ChangePasswordRequest,
  DeliveryAddressDto,
  PasswordActionResponse,
  UpdateProfileRequest,
  UpsertDeliveryAddressRequest,
  UserProfileResponse,
} from '../types/profile.types.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrapData<T>(res: any): T {
  return (res?.data ?? res) as T
}

export const profileApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMyProfile: build.query<UserProfileResponse, void>({
      query: () => '/profile',
      transformResponse: unwrapData<UserProfileResponse>,
      providesTags: ['Profile', 'DeliveryAddress'],
    }),

    updateMyProfile: build.mutation<UserProfileResponse, UpdateProfileRequest>({
      query: (body) => ({
        url: '/profile',
        method: 'PUT',
        body,
      }),
      transformResponse: unwrapData<UserProfileResponse>,
      invalidatesTags: ['Profile'],
    }),

    uploadProfileAvatar: build.mutation<{ avatarUrl: string }, FormData>({
      query: (formData) => ({
        url: '/profile/avatar',
        method: 'POST',
        body: formData,
      }),
      transformResponse: unwrapData<{ avatarUrl: string }>,
      invalidatesTags: ['Profile'],
    }),

    changeMyPassword: build.mutation<PasswordActionResponse, ChangePasswordRequest>({
      query: (body) => ({
        url: '/iam/password/change',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapData<PasswordActionResponse>,
    }),

    getMyAddresses: build.query<DeliveryAddressDto[], void>({
      query: () => '/profile/addresses',
      transformResponse: (res: unknown): DeliveryAddressDto[] => {
        const data = unwrapData<unknown>(res)
        return Array.isArray(data) ? (data as DeliveryAddressDto[]) : []
      },
      providesTags: ['DeliveryAddress'],
    }),

    createDeliveryAddress: build.mutation<DeliveryAddressDto, UpsertDeliveryAddressRequest>({
      query: (body) => ({
        url: '/profile/addresses',
        method: 'POST',
        body,
      }),
      transformResponse: unwrapData<DeliveryAddressDto>,
      invalidatesTags: ['DeliveryAddress', 'Profile', 'OnlineOrder'],
    }),

    updateDeliveryAddress: build.mutation<
      DeliveryAddressDto,
      { id: string; body: UpsertDeliveryAddressRequest }
    >({
      query: ({ id, body }) => ({
        url: `/profile/addresses/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse: unwrapData<DeliveryAddressDto>,
      invalidatesTags: ['DeliveryAddress', 'Profile', 'OnlineOrder'],
    }),

    deleteDeliveryAddress: build.mutation<void, string>({
      query: (id) => ({
        url: `/profile/addresses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['DeliveryAddress', 'Profile', 'OnlineOrder'],
    }),

    setDefaultDeliveryAddress: build.mutation<DeliveryAddressDto, string>({
      query: (id) => ({
        url: `/profile/addresses/${id}/default`,
        method: 'PATCH',
      }),
      transformResponse: unwrapData<DeliveryAddressDto>,
      invalidatesTags: ['DeliveryAddress', 'Profile', 'OnlineOrder'],
    }),
  }),
})

export const {
  useGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useUploadProfileAvatarMutation,
  useChangeMyPasswordMutation,
  useGetMyAddressesQuery,
  useCreateDeliveryAddressMutation,
  useUpdateDeliveryAddressMutation,
  useDeleteDeliveryAddressMutation,
  useSetDefaultDeliveryAddressMutation,
} = profileApi

