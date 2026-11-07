import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type {
  CatalogImportJob,
  CatalogImportJobStatus,
  CatalogImportSubmitResponse,
  CreateProductRequest,
  ProductDetail,
  ProductListParams,
  ProductPageResponse,
  UpdateProductRequest,
  UpdateProductStatusRequest,
} from '../types/index.ts'

function responseData<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) throw new Error('Phản hồi sản phẩm không có dữ liệu.')
  return response.data
}

interface SpringPageLike<T> {
  content?: T[]
  items?: T[]
  number?: number
  page?: number
  size?: number
  totalElements?: number
  totalPages?: number
}

export const productApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<ProductPageResponse, ProductListParams>({
      query: (params) => ({
        url: '/catalog/products',
        params,
      }),
      transformResponse: (response: ApiResponse<SpringPageLike<ProductPageResponse['items'][number]>>): ProductPageResponse => {
        const raw = response.data
        if (!raw) {
          return { items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }
        }
        return {
          items: raw.content ?? raw.items ?? [],
          page: raw.number ?? raw.page ?? 0,
          size: raw.size ?? 20,
          totalElements: raw.totalElements ?? 0,
          totalPages: raw.totalPages ?? 0,
        }
      },
      providesTags: (result) => [
        { type: 'Product', id: 'LIST' },
        ...(result?.items.map(({ productId }) => ({ type: 'Product' as const, id: productId })) ?? []),
      ],
    }),
    getProduct: builder.query<ProductDetail, string>({
      query: (id) => `/catalog/products/${id}`,
      transformResponse: responseData<ProductDetail>,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    createProduct: builder.mutation<ProductDetail, CreateProductRequest>({
      query: (body) => ({
        url: '/catalog/products',
        method: 'POST',
        body,
      }),
      transformResponse: responseData<ProductDetail>,
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),
    updateProduct: builder.mutation<ProductDetail, { id: string; data: UpdateProductRequest }>({
      query: ({ id, data }) => ({
        url: `/catalog/products/${id}`,
        method: 'PUT',
        body: data,
      }),
      transformResponse: responseData<ProductDetail>,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
      ],
    }),
    updateProductStatus: builder.mutation<ProductDetail, { id: string; data: UpdateProductStatusRequest }>({
      query: ({ id, data }) => ({
        url: `/catalog/products/${id}/status`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: responseData<ProductDetail>,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
      ],
    }),
    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/catalog/products/${id}`,
        method: 'DELETE',
      }),
      transformResponse: () => undefined,
      invalidatesTags: (_result, _error, id) => [
        { type: 'Product', id },
        { type: 'Product', id: 'LIST' },
      ],
    }),
    submitProductImportJob: builder.mutation<CatalogImportSubmitResponse, FormData>({
      query: (formData) => ({
        url: '/catalog/import',
        method: 'POST',
        body: formData,
      }),
      transformResponse: (response: ApiResponse<{ jobId: string }>): CatalogImportSubmitResponse => {
        if (!response.data?.jobId) {
          throw new Error('Máy chủ không trả về mã tác vụ (jobId).')
        }
        return {
          jobId: response.data.jobId,
          status: 'QUEUED',
        }
      },
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),
    getProductImportProgress: builder.query<CatalogImportJob, string>({
      query: (jobId) => `/catalog/import/${jobId}/progress`,
      transformResponse: (response: ApiResponse<{
        jobId: string
        status: string
        totalRows?: number
        processedRows?: number
        successRows?: number
        errorRows?: number
        percentage?: number
        message?: string
        startedAt?: string
        finishedAt?: string
      }>): CatalogImportJob => {
        const raw = response.data
        if (!raw) {
          throw new Error('Không nhận được thông tin tiến trình.')
        }

        let status: CatalogImportJobStatus = 'PROCESSING'
        if (raw.status === 'COMPLETED') status = 'COMPLETED'
        else if (raw.status === 'COMPLETED_WITH_ERRORS') status = 'COMPLETED_WITH_ERRORS'
        else if (raw.status === 'FAILED') status = 'FAILED'
        else if (raw.status === 'PENDING' || raw.status === 'QUEUED') status = 'QUEUED'

        return {
          jobId: raw.jobId,
          status,
          totalRows: raw.totalRows ?? null,
          processedRows: raw.processedRows ?? 0,
          createdRows: raw.successRows ?? 0,
          skippedRows: 0,
          errorRows: raw.errorRows ?? 0,
          percentage: raw.percentage ?? null,
          message: raw.message ?? null,
          startedAt: raw.startedAt ?? null,
          finishedAt: raw.finishedAt ?? null,
        }
      },
    }),
    downloadProductImportReport: builder.mutation<Blob, string>({
      query: (jobId) => ({
        url: `/catalog/import/${jobId}/error-report`,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
})

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useUpdateProductStatusMutation,
  useDeleteProductMutation,
  useSubmitProductImportJobMutation,
  useGetProductImportProgressQuery,
  useDownloadProductImportReportMutation,
} = productApi

