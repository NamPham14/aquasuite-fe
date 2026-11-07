import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type {
  AssignableRole,
  ChangeUserStatusRequest,
  CreateUserAccountRequest,
  UpdateUserAccountRequest,
  UserAccount,
  UserAccountPage,
  UserAccountQuery,
  UserAccountStats,
} from '../types/userAccount.types.ts'

function responseData<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) throw new Error('Phản hồi tài khoản không có dữ liệu.')
  return response.data
}

/** Contract UC-05. All authorization decisions remain enforced by the IAM backend. */
export const userAccountApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserAccountStats: builder.query<UserAccountStats, void>({
      query: () => '/iam/users/stats',
      transformResponse: responseData<UserAccountStats>,
      providesTags: [{ type: 'UserAccount', id: 'STATS' }],
    }),
    getUserAccounts: builder.query<UserAccountPage, UserAccountQuery>({
      query: (params) => ({ url: '/iam/users', params }),
      transformResponse: responseData<UserAccountPage>,
      providesTags: (result) => [
        { type: 'UserAccount', id: 'LIST' },
        ...(result?.content.map((account) => ({ type: 'UserAccount' as const, id: account.id })) ?? []),
      ],
    }),
    getUserAccount: builder.query<UserAccount, string>({
      query: (id) => `/iam/users/${id}`,
      transformResponse: responseData<UserAccount>,
      providesTags: (_result, _error, id) => [{ type: 'UserAccount', id }],
    }),
    getAssignableRoles: builder.query<AssignableRole[], void>({
      query: () => ({ url: '/iam/roles', params: { assignable: true } }),
      transformResponse: responseData<AssignableRole[]>,
    }),
    createUserAccount: builder.mutation<UserAccount, CreateUserAccountRequest>({
      query: (body) => ({ url: '/iam/users', method: 'POST', body }),
      transformResponse: responseData<UserAccount>,
      invalidatesTags: [{ type: 'UserAccount', id: 'LIST' }, { type: 'UserAccount', id: 'STATS' }],
    }),
    updateUserAccount: builder.mutation<UserAccount, { id: string; data: UpdateUserAccountRequest }>({
      query: ({ id, data }) => ({ url: `/iam/users/${id}`, method: 'PATCH', body: data }),
      transformResponse: responseData<UserAccount>,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'UserAccount', id },
        { type: 'UserAccount', id: 'LIST' },
        { type: 'UserAccount', id: 'STATS' },
      ],
    }),
    changeUserAccountStatus: builder.mutation<UserAccount, { id: string; data: ChangeUserStatusRequest }>({
      query: ({ id, data }) => ({ url: `/iam/users/${id}/status`, method: 'PATCH', body: data }),
      transformResponse: responseData<UserAccount>,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'UserAccount', id },
        { type: 'UserAccount', id: 'LIST' },
        { type: 'UserAccount', id: 'STATS' },
      ],
    }),
  }),
})

export const {
  useGetUserAccountStatsQuery,
  useGetUserAccountsQuery,
  useGetUserAccountQuery,
  useGetAssignableRolesQuery,
  useCreateUserAccountMutation,
  useUpdateUserAccountMutation,
  useChangeUserAccountStatusMutation,
} = userAccountApi
