import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type { ProductVariant, VariantDeleteRequest, VariantDeletionEligibility, VariantPage, VariantStats, VariantStatus, VariantUpsertRequest } from '../types/variant.types.ts'

function responseData<T>(response: ApiResponse<T>): T { if (response.data === undefined) throw new Error('Phản hồi biến thể không có dữ liệu.'); return response.data }
type VariantPath = { productId: string; variantId: string }

/** UC-10 contract. Catalog backend owns authorization and deletion eligibility. */
export const variantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getVariants: builder.query<VariantPage, { productId: string; keyword?: string; status?: VariantStatus; page: number; size: number }>({
      query: ({ productId, ...params }) => ({ url: `/catalog/products/${productId}/variants`, params }), transformResponse: responseData<VariantPage>,
      providesTags: (result, _error, { productId }) => [{ type: 'Variant', id: `LIST-${productId}` }, ...(result?.content.map((item) => ({ type: 'Variant' as const, id: item.id })) ?? [])],
    }),
    getVariantStats: builder.query<VariantStats, string>({ query: (productId) => `/catalog/products/${productId}/variants/stats`, transformResponse: responseData<VariantStats>, providesTags: (_result, _error, productId) => [{ type: 'Variant', id: `STATS-${productId}` }] }),
    createVariant: builder.mutation<ProductVariant, { productId: string; data: VariantUpsertRequest }>({ query: ({ productId, data }) => ({ url: `/catalog/products/${productId}/variants`, method: 'POST', body: data }), transformResponse: responseData<ProductVariant>, invalidatesTags: (_result, _error, { productId }) => [{ type: 'Variant', id: `LIST-${productId}` }, { type: 'Variant', id: `STATS-${productId}` }] }),
    createVariantMatrix: builder.mutation<ProductVariant[], { productId: string; variants: VariantUpsertRequest[] }>({ query: ({ productId, variants }) => ({ url: `/catalog/products/${productId}/variants/matrix`, method: 'POST', body: { variants } }), transformResponse: responseData<ProductVariant[]>, invalidatesTags: (_result, _error, { productId }) => [{ type: 'Variant', id: `LIST-${productId}` }, { type: 'Variant', id: `STATS-${productId}` }] }),
    updateVariant: builder.mutation<ProductVariant, VariantPath & { data: VariantUpsertRequest }>({ query: ({ productId, variantId, data }) => ({ url: `/catalog/products/${productId}/variants/${variantId}`, method: 'PUT', body: data }), transformResponse: responseData<ProductVariant>, invalidatesTags: (_result, _error, { productId, variantId }) => [{ type: 'Variant', id: variantId }, { type: 'Variant', id: `LIST-${productId}` }, { type: 'Variant', id: `STATS-${productId}` }] }),
    changeVariantStatus: builder.mutation<ProductVariant, VariantPath & { status: VariantStatus }>({ query: ({ productId, variantId, status }) => ({ url: `/catalog/products/${productId}/variants/${variantId}/status`, method: 'PATCH', body: { status } }), transformResponse: responseData<ProductVariant>, invalidatesTags: (_result, _error, { productId, variantId }) => [{ type: 'Variant', id: variantId }, { type: 'Variant', id: `LIST-${productId}` }, { type: 'Variant', id: `STATS-${productId}` }] }),
    getVariantDeletionEligibility: builder.query<VariantDeletionEligibility, VariantPath>({ query: ({ productId, variantId }) => `/catalog/products/${productId}/variants/${variantId}/deletion-eligibility`, transformResponse: responseData<VariantDeletionEligibility> }),
    deleteVariant: builder.mutation<void, VariantPath & { data: VariantDeleteRequest }>({ query: ({ productId, variantId, data }) => ({ url: `/catalog/products/${productId}/variants/${variantId}`, method: 'DELETE', body: data }), invalidatesTags: (_result, _error, { productId, variantId }) => [{ type: 'Variant', id: variantId }, { type: 'Variant', id: `LIST-${productId}` }, { type: 'Variant', id: `STATS-${productId}` }] }),
  }),
})
export const { useGetVariantsQuery, useGetVariantStatsQuery, useCreateVariantMutation, useCreateVariantMatrixMutation, useUpdateVariantMutation, useChangeVariantStatusMutation, useGetVariantDeletionEligibilityQuery, useDeleteVariantMutation } = variantApi
