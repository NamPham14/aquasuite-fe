import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type { CodBalance, CodClaim, CodCollection, CodFilters, CodPage, CodReceipt, CodRemit } from '../types/cod.types.ts'

const codApiBase = baseApi.enhanceEndpoints({ addTagTypes: ['Cod'] })
const changedTags = ['Cod', 'CustomerDebt', 'OrderPayment', 'SalesOrder'] as const
export const codApi = codApiBase.injectEndpoints({
  endpoints: (builder) => ({
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
    remitCod: builder.mutation<CodReceipt, CodRemit>({
      query: (body) => ({ url: '/finance/cod/remittances', method: 'POST', body }),
      transformResponse: (res: ApiResponse<CodReceipt>) => res.data!, invalidatesTags: changedTags,
    }),
    getCodHistory: builder.query<CodReceipt[], string>({
      query: (id) => `/finance/cod/collections/${id}/remittances`,
      transformResponse: (res: ApiResponse<CodReceipt[]>) => res.data!, providesTags: ['Cod'],
    }),
    getCodBalance: builder.query<CodBalance, string>({
      query: (id) => `/finance/cod/orders/${id}/balance`,
      transformResponse: (res: ApiResponse<CodBalance>) => res.data!, providesTags: ['Cod', 'OrderPayment', 'SalesOrder'],
    }),
  }),
})
export const { useGetCodCollectionsQuery, useGetCodCollectionQuery, useClaimCodMutation, useReviewCodMutation, useRemitCodMutation, useGetCodHistoryQuery, useGetCodBalanceQuery } = codApi
