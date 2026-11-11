import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse, PageResponse } from '../../../shared/api/types.ts'
import type { Bundle, BundleDefinition, BundleListParams, BundleProductStatus, BundlePublication, BundleSku } from '../types/bundle.types.ts'

const path = '/catalog/bundle/admin'
function data<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data == null) throw new Error('Phản hồi combo không hợp lệ.')
  return response.data
}

// Separate tag namespace, while retaining the shared auth/session transport.
const api = baseApi.enhanceEndpoints({ addTagTypes: ['Bundle'] })
export const bundleApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getBundles: builder.query<PageResponse<Bundle>, BundleListParams>({
      query: (params) => ({ url: path, params }),
      transformResponse: data<PageResponse<Bundle>>,
      providesTags: ['Bundle'],
    }),
    getBundle: builder.query<Bundle, string>({
      query: (id) => `${path}/${id}`,
      transformResponse: data<Bundle>,
      providesTags: ['Bundle'],
      keepUnusedDataFor: 0,
    }),
    searchBundleSkus: builder.query<PageResponse<BundleSku>, { page: number; size: number; keyword?: string }>({
      query: (params) => ({ url: `${path}/skus`, params }),
      transformResponse: data<PageResponse<BundleSku>>,
      keepUnusedDataFor: 0,
    }),
    createBundle: builder.mutation<Bundle, BundleDefinition>({
      query: (body) => ({ url: path, method: 'POST', body }),
      transformResponse: data<Bundle>, invalidatesTags: ['Bundle'],
    }),
    updateBundle: builder.mutation<Bundle, { id: string; data: BundleDefinition & { expectedVersion: number } }>({
      query: ({ id, data: body }) => ({ url: `${path}/${id}`, method: 'PUT', body }),
      transformResponse: data<Bundle>, invalidatesTags: ['Bundle'],
    }),
    changeBundlePublication: builder.mutation<Bundle, { id: string; publicationStatus: Exclude<BundlePublication, 'DRAFT'>; expectedVersion: number }>({
      query: ({ id, ...body }) => ({ url: `${path}/${id}/publication-status`, method: 'PATCH', body }),
      transformResponse: data<Bundle>, invalidatesTags: ['Bundle'],
    }),
    changeBundleStatus: builder.mutation<Bundle, { id: string; productStatus: BundleProductStatus; expectedVersion: number }>({
      query: ({ id, ...body }) => ({ url: `${path}/${id}/status`, method: 'PATCH', body }),
      transformResponse: data<Bundle>, invalidatesTags: ['Bundle'],
    }),
    deleteBundle: builder.mutation<void, { id: string; expectedVersion: number }>({
      query: ({ id, expectedVersion }) => ({ url: `${path}/${id}`, method: 'DELETE', params: { expectedVersion } }),
      transformResponse: () => undefined, invalidatesTags: ['Bundle'],
    }),
  }),
})

export const { useGetBundlesQuery, useLazyGetBundleQuery, useSearchBundleSkusQuery, useCreateBundleMutation, useUpdateBundleMutation, useChangeBundlePublicationMutation, useChangeBundleStatusMutation, useDeleteBundleMutation } = bundleApi
