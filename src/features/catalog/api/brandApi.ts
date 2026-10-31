import { baseApi } from '../../../shared/api'
import type { PageParams, PageResponse } from '../../../shared/api'
import type { Brand, CreateBrandRequest, UpdateBrandRequest } from '../types/brand.types'

export const brandApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBrands: builder.query<PageResponse<Brand>, PageParams | void>({
      query: (params) => ({ url: '/brands', params: params ?? undefined }),
      providesTags: (result) => [
        { type: 'Brand', id: 'LIST' },
        ...(result?.items.map(({ id }) => ({ type: 'Brand' as const, id })) ?? []),
      ],
    }),
    getBrand: builder.query<Brand, string>({
      query: (id) => `/brands/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Brand', id }],
    }),
    createBrand: builder.mutation<Brand, CreateBrandRequest>({
      query: (body) => ({ url: '/brands', method: 'POST', body }),
      invalidatesTags: [{ type: 'Brand', id: 'LIST' }],
    }),
    updateBrand: builder.mutation<Brand, { id: string; data: UpdateBrandRequest }>({
      query: ({ id, data }) => ({ url: `/brands/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Brand', id },
        { type: 'Brand', id: 'LIST' },
      ],
    }),
    deleteBrand: builder.mutation<void, string>({
      query: (id) => ({ url: `/brands/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Brand', id },
        { type: 'Brand', id: 'LIST' },
      ],
    }),
  }),
})

export const {
  useGetBrandsQuery,
  useGetBrandQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
} = brandApi

