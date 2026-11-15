import { baseApi } from '../../../shared/api/baseApi.ts'
import type { PageResponse } from '../../../shared/api/types.ts'
import type {
  CreateAdHocWarrantyRequest,
  CreateWarrantyFromOrderRequest,
  VariantWarrantyInfo,
  VoidWarrantyRequest,
  WarrantyFilterParams,
  WarrantyPolicySummary,
  WarrantyRecordDetail,
  WarrantyRecordListItem,
} from '../types/warranty.types'

function cleanParams(params?: WarrantyFilterParams) {
  if (!params) return undefined
  const out: Record<string, unknown> = {}
  if (params.keyword?.trim()) out.keyword = params.keyword.trim()
  if (params.phone?.trim()) out.phone = params.phone.trim()
  if (params.serialNumber?.trim()) out.serialNumber = params.serialNumber.trim()
  if (params.displayStatus) out.displayStatus = params.displayStatus
  if (params.page !== undefined) out.page = Math.max(0, params.page - 1)
  if (params.size !== undefined) out.size = params.size
  if (params.sortBy) out.sortBy = params.sortBy
  if (params.direction) out.direction = params.direction
  return out
}

function normalizePageResponse(res: any): PageResponse<WarrantyRecordListItem> {
  const payload = res?.data ?? res
  if (payload && Array.isArray(payload.items)) {
    return {
      ...payload,
      page: (payload.page ?? 0) + 1,
    }
  }
  return {
    items: [],
    page: 1,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  }
}

export const warrantyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getWarrantyRecords: builder.query<PageResponse<WarrantyRecordListItem>, WarrantyFilterParams | void>({
      query: (params) => ({
        url: '/warranty-records',
        params: cleanParams(params ?? undefined),
      }),
      transformResponse: normalizePageResponse,
      providesTags: (result) => [
        { type: 'WarrantyRecord', id: 'LIST' },
        ...(result?.items?.map(({ warrantyRecordId }) => ({
          type: 'WarrantyRecord' as const,
          id: warrantyRecordId,
        })) ?? []),
      ],
    }),

    getWarrantyRecordById: builder.query<WarrantyRecordDetail, string>({
      query: (id) => `/warranty-records/${id}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: 'WarrantyRecord', id }],
    }),

    getWarrantyPolicies: builder.query<WarrantyPolicySummary[], void>({
      query: () => '/warranty-records/policies',
      transformResponse: (res: any) => res?.data ?? res ?? [],
      providesTags: [{ type: 'WarrantyPolicy', id: 'LIST' }],
    }),

    getVariantWarrantyInfo: builder.query<VariantWarrantyInfo, string>({
      query: (variantId) => `/warranty-records/variants/${variantId}/policy`,
      transformResponse: (res: any) => res?.data ?? res,
    }),

    createWarrantyFromOrder: builder.mutation<WarrantyRecordDetail, CreateWarrantyFromOrderRequest>({
      query: (body) => ({
        url: '/warranty-records/from-order',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: 'WarrantyRecord', id: 'LIST' }],
    }),

    createAdHocWarranty: builder.mutation<WarrantyRecordDetail, CreateAdHocWarrantyRequest>({
      query: (body) => ({
        url: '/warranty-records/ad-hoc',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: 'WarrantyRecord', id: 'LIST' }],
    }),

    voidWarrantyRecord: builder.mutation<WarrantyRecordDetail, { id: string; body: VoidWarrantyRequest }>({
      query: ({ id, body }) => ({
        url: `/warranty-records/${id}/void`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'WarrantyRecord', id: 'LIST' },
        { type: 'WarrantyRecord', id },
      ],
    }),

    getMyWarrantyRecords: builder.query<PageResponse<WarrantyRecordListItem>, WarrantyFilterParams | void>({
      query: (params) => ({
        url: '/storefront/warranty-records',
        params: cleanParams(params ?? undefined),
      }),
      transformResponse: normalizePageResponse,
      providesTags: (result) => [
        { type: 'WarrantyRecord', id: 'MY_LIST' },
        ...(result?.items?.map(({ warrantyRecordId }) => ({
          type: 'WarrantyRecord' as const,
          id: warrantyRecordId,
        })) ?? []),
      ],
    }),

    getMyWarrantyRecordById: builder.query<WarrantyRecordDetail, string>({
      query: (id) => `/storefront/warranty-records/${id}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: 'WarrantyRecord', id }],
    }),
  }),
})

export const {
  useGetWarrantyRecordsQuery,
  useGetWarrantyRecordByIdQuery,
  useGetWarrantyPoliciesQuery,
  useGetVariantWarrantyInfoQuery,
  useCreateWarrantyFromOrderMutation,
  useCreateAdHocWarrantyMutation,
  useVoidWarrantyRecordMutation,
  useGetMyWarrantyRecordsQuery,
  useGetMyWarrantyRecordByIdQuery,
} = warrantyApi
