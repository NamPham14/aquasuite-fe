import { baseApi } from '../../../shared/api/baseApi'
import type { ApiResponse, PageResponse } from '../../../shared/api/types'
import type {
  UpsertWarrantyPolicyRequest,
  WarrantyPolicy,
  WarrantyPolicyDetail,
  WarrantyPolicyReferenceData,
  WarrantyPolicyStatus,
  WarrantyPolicyAuditLog,
} from '../types/warrantyPolicy.types'

function dataOf<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) throw new Error('Phản hồi chính sách bảo hành thiếu dữ liệu.')
  return response.data
}

export const warrantyPolicyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWarrantyPolicies: builder.query<PageResponse<WarrantyPolicy>, { keyword?: string; status?: WarrantyPolicyStatus; page?: number; size?: number }>({
      query: (params) => ({ url: '/warranty-policies', params }),
      transformResponse: dataOf<PageResponse<WarrantyPolicy>>,
      providesTags: (result) => [
        { type: 'WarrantyPolicy', id: 'LIST' },
        ...(result?.items.map((policy) => ({ type: 'WarrantyPolicy' as const, id: policy.policyId })) ?? []),
      ],
    }),
    getWarrantyPolicy: builder.query<WarrantyPolicyDetail, string>({
      query: (policyId) => `/warranty-policies/${policyId}`,
      transformResponse: dataOf<WarrantyPolicyDetail>,
      providesTags: (_result, _error, policyId) => [{ type: 'WarrantyPolicy', id: policyId }],
    }),
    getWarrantyPolicyReferenceData: builder.query<WarrantyPolicyReferenceData, void>({
      query: () => '/warranty-policies/reference-data',
      transformResponse: dataOf<WarrantyPolicyReferenceData>,
      providesTags: [{ type: 'WarrantyPolicy', id: 'REFERENCE_DATA' }],
    }),
    getWarrantyPolicyAuditLogs: builder.query<{ content: WarrantyPolicyAuditLog[] }, void>({
      query: () => ({ url: '/audit-logs', params: { entityType: 'WARRANTY_POLICY', page: 0, size: 10 } }),
      transformResponse: dataOf<{ content: WarrantyPolicyAuditLog[] }>,
      providesTags: [{ type: 'WarrantyPolicy', id: 'AUDIT' }],
    }),
    createWarrantyPolicy: builder.mutation<WarrantyPolicy, UpsertWarrantyPolicyRequest>({
      query: (body) => ({ url: '/warranty-policies', method: 'POST', body }),
      transformResponse: dataOf<WarrantyPolicy>,
      invalidatesTags: [{ type: 'WarrantyPolicy', id: 'LIST' }, { type: 'WarrantyPolicy', id: 'AUDIT' }],
    }),
    updateWarrantyPolicy: builder.mutation<WarrantyPolicy, { policyId: string; body: UpsertWarrantyPolicyRequest }>({
      query: ({ policyId, body }) => ({ url: `/warranty-policies/${policyId}`, method: 'PUT', body }),
      transformResponse: dataOf<WarrantyPolicy>,
      invalidatesTags: (_result, _error, { policyId }) => [
        { type: 'WarrantyPolicy', id: policyId },
        { type: 'WarrantyPolicy', id: 'LIST' }, { type: 'WarrantyPolicy', id: 'AUDIT' },
      ],
    }),
    deactivateWarrantyPolicy: builder.mutation<WarrantyPolicy, string>({
      query: (policyId) => ({ url: `/warranty-policies/${policyId}/deactivate`, method: 'POST' }),
      transformResponse: dataOf<WarrantyPolicy>,
      invalidatesTags: (_result, _error, policyId) => [
        { type: 'WarrantyPolicy', id: policyId },
        { type: 'WarrantyPolicy', id: 'LIST' }, { type: 'WarrantyPolicy', id: 'AUDIT' },
      ],
    }),
    deleteWarrantyPolicy: builder.mutation<void, string>({
      query: (policyId) => ({ url: `/warranty-policies/${policyId}`, method: 'DELETE' }),
      transformResponse: () => undefined,
      invalidatesTags: (_result, _error, policyId) => [
        { type: 'WarrantyPolicy', id: policyId },
        { type: 'WarrantyPolicy', id: 'LIST' }, { type: 'WarrantyPolicy', id: 'AUDIT' },
      ],
    }),
  }),
})

export const {
  useGetWarrantyPoliciesQuery,
  useGetWarrantyPolicyQuery,
  useLazyGetWarrantyPolicyQuery,
  useGetWarrantyPolicyReferenceDataQuery,
  useGetWarrantyPolicyAuditLogsQuery,
  useCreateWarrantyPolicyMutation,
  useUpdateWarrantyPolicyMutation,
  useDeactivateWarrantyPolicyMutation,
  useDeleteWarrantyPolicyMutation,
} = warrantyPolicyApi
