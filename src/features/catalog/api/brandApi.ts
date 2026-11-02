import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse, PageResponse } from '../../../shared/api/types.ts'
import type {
  Brand,
  BrandOption,
  CatalogImportJob,
  CatalogImportSubmitResponse,
  CatalogListParams,
  CreateBrandRequest,
  UpdateBrandRequest,
} from '../types/index.ts'

/** Lấy dữ liệu từ envelope BE; báo lỗi nếu phản hồi thành công thiếu dữ liệu bắt buộc. */
function responseData<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) throw new Error('Phản hồi thương hiệu không có dữ liệu.')
  return response.data
}

/** Các endpoint thương hiệu và quy tắc làm mới cache sau thao tác ghi. */
export const brandApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBrands: builder.query<PageResponse<Brand>, CatalogListParams>({
      query: (params) => ({ url: '/catalog/brands', params }),
      transformResponse: responseData<PageResponse<Brand>>,
      providesTags: (result) => [
        { type: 'Brand', id: 'LIST' },
        ...(result?.items.map(({ id }) => ({ type: 'Brand' as const, id })) ?? []),
      ],
    }),
    getBrand: builder.query<Brand, string>({
      query: (id) => `/catalog/brands/${id}`,
      transformResponse: responseData<Brand>,
      providesTags: (_result, _error, id) => [{ type: 'Brand', id }],
    }),
    getBrandOptions: builder.query<BrandOption[], void>({
      query: () => '/catalog/brands/options',
      transformResponse: responseData<BrandOption[]>,
      providesTags: [{ type: 'Brand', id: 'OPTIONS' }],
    }),
    createBrand: builder.mutation<Brand, CreateBrandRequest>({
      query: (body) => ({ url: '/catalog/brands', method: 'POST', body }),
      transformResponse: responseData<Brand>,
      invalidatesTags: [
        { type: 'Brand', id: 'LIST' },
        { type: 'Brand', id: 'OPTIONS' },
      ],
    }),
    updateBrand: builder.mutation<Brand, { id: string; data: UpdateBrandRequest }>({
      query: ({ id, data }) => ({ url: `/catalog/brands/${id}`, method: 'PUT', body: data }),
      transformResponse: responseData<Brand>,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Brand', id },
        { type: 'Brand', id: 'LIST' },
        { type: 'Brand', id: 'OPTIONS' },
      ],
    }),
    deleteBrand: builder.mutation<void, string>({
      query: (id) => ({ url: `/catalog/brands/${id}`, method: 'DELETE' }),
      transformResponse: () => undefined,
      invalidatesTags: (_result, _error, id) => [
        { type: 'Brand', id },
        { type: 'Brand', id: 'LIST' },
        { type: 'Brand', id: 'OPTIONS' },
      ],
    }),
    downloadBrandImportTemplate: builder.mutation<Blob, void>({
      query: () => ({
        url: '/brands/import-template',
        responseHandler: (response) => response.blob(),
      }),
    }),
    submitBrandImportJob: builder.mutation<CatalogImportSubmitResponse, FormData>({
      query: (formData) => ({
        url: '/brands/import-jobs',
        method: 'POST',
        body: formData,
      }),
      transformResponse: responseData<CatalogImportSubmitResponse>,
    }),
    getBrandImportProgress: builder.query<CatalogImportJob, string>({
      query: (jobId) => `/brands/import-jobs/${jobId}`,
      transformResponse: responseData<CatalogImportJob>,
    }),
    downloadBrandImportReport: builder.mutation<Blob, string>({
      query: (jobId) => ({
        url: `/brands/import-jobs/${jobId}/error-report`,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
})

export const {
  useGetBrandsQuery,
  useGetBrandQuery,
  useGetBrandOptionsQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
  useDownloadBrandImportTemplateMutation,
  useSubmitBrandImportJobMutation,
  useGetBrandImportProgressQuery,
  useLazyGetBrandImportProgressQuery,
  useDownloadBrandImportReportMutation,
} = brandApi
