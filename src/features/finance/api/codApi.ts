import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type { CodBalance, CodClaim, CodClaimCapacity, CodCollection, CodFilters, CodPage } from '../types/cod.types.ts'

const codApiBase = baseApi.enhanceEndpoints({ addTagTypes: ['Cod'] })
const changedTags = ['Cod', 'CustomerDebt', 'OrderPayment', 'SalesOrder'] as const
export const codApi = codApiBase.injectEndpoints({
  endpoints: (builder) => ({
    getCodClaimCapacity: builder.query<CodClaimCapacity, string>({
      query: (deliveryId) => `/finance/cod/deliveries/${deliveryId}/claim-capacity`,
      transformResponse: (res: ApiResponse<CodClaimCapacity>) => res.data!,
      providesTags: ['Cod', 'OrderPayment', 'SalesOrder'],
    }),
    getCodCollections: builder.query<CodPage, CodFilters>({
      query: (params) => ({ url: '/finance/cod/collections', params }),
      transformResponse: (res: ApiResponse<CodPage>) => res.data!, providesTags: ['Cod'],
    }),
    getCodCollection: builder.query<CodCollection, string>({
      query: (id) => `/finance/cod/collections/${id}`,
      transformResponse: (res: ApiResponse<CodCollection>) => res.data!, providesTags: ['Cod'],
    }),
    claimCod: builder.mutation<CodCollection, CodClaim>({
      query: (body) => ({ url: '/finance/cod/collections', method: 'POST', body }),
      transformResponse: (res: ApiResponse<CodCollection>) => res.data!, invalidatesTags: changedTags,
    }),
    reviewCod: builder.mutation<CodCollection, { id: string; accept: boolean; expectedVersion: number; reason?: string }>({
      query: ({ id, accept, ...body }) => ({ url: `/finance/cod/collections/${id}/${accept ? 'accept' : 'reject'}`, method: 'POST', body }),
      transformResponse: (res: ApiResponse<CodCollection>) => res.data!, invalidatesTags: changedTags,
    }),
    getCodBalance: builder.query<CodBalance, string>({
      query: (id) => `/finance/cod/orders/${id}/balance`,
      transformResponse: (res: ApiResponse<CodBalance>) => res.data!,
      providesTags: (_res, _err, orderId) => ['Cod', { type: 'OrderPayment', id: orderId }, { type: 'SalesOrder', id: orderId }],
    }),
  }),
})
export const { useGetCodClaimCapacityQuery, useGetCodCollectionsQuery, useGetCodCollectionQuery, useClaimCodMutation, useReviewCodMutation, useGetCodBalanceQuery } = codApi
