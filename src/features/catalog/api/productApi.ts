import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type { ProductListQuery, ProductPage } from '../types/product.types.ts'
function responseData<T>(response: ApiResponse<T>): T { if (response.data === undefined) throw new Error('Phản hồi sản phẩm không có dữ liệu.'); return response.data }
/** Existing UC-09 read contract, consumed only to enter the UC-10 product context. */
export const productApi = baseApi.injectEndpoints({ endpoints: (builder) => ({ getProducts: builder.query<ProductPage, ProductListQuery>({ query: (params) => ({ url: '/catalog/products', params }), transformResponse: responseData<ProductPage>, providesTags: (result) => [{ type: 'Product', id: 'LIST' }, ...(result?.content.map((product) => ({ type: 'Product' as const, id: product.productId })) ?? [])] }) }) })
export const { useGetProductsQuery } = productApi
