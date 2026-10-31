import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse, PageResponse } from '../../../shared/api/types.ts'
import type {
  CatalogListParams,
  Category,
  CategoryOption,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../types/index.ts'

/** Lấy dữ liệu từ envelope BE; báo lỗi nếu phản hồi thành công thiếu dữ liệu bắt buộc. */
function responseData<T>(response: ApiResponse<T>): T {
  if (response.data === undefined) throw new Error('Phản hồi danh mục không có dữ liệu.')
  return response.data
}

/** Các endpoint danh mục và quy tắc làm mới cache danh sách, chi tiết và lựa chọn cha. */
export const categoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<PageResponse<Category>, CatalogListParams>({
      query: (params) => ({ url: '/catalog/categories', params }),
      transformResponse: responseData<PageResponse<Category>>,
      providesTags: (result) => [
        { type: 'Category', id: 'LIST' },
        ...(result?.items.map(({ id }) => ({ type: 'Category' as const, id })) ?? []),
      ],
    }),
    getCategory: builder.query<Category, string>({
      query: (id) => `/catalog/categories/${id}`,
      transformResponse: responseData<Category>,
      providesTags: (_result, _error, id) => [{ type: 'Category', id }],
    }),
    getCategoryOptions: builder.query<CategoryOption[], void>({
      query: () => '/catalog/categories/options',
      transformResponse: responseData<CategoryOption[]>,
      providesTags: [{ type: 'Category', id: 'OPTIONS' }],
    }),
    createCategory: builder.mutation<Category, CreateCategoryRequest>({
      query: (body) => ({ url: '/catalog/categories', method: 'POST', body }),
      transformResponse: responseData<Category>,
      invalidatesTags: [
        { type: 'Category', id: 'LIST' },
        { type: 'Category', id: 'OPTIONS' },
      ],
    }),
    updateCategory: builder.mutation<Category, { id: string; data: UpdateCategoryRequest }>({
      query: ({ id, data }) => ({ url: `/catalog/categories/${id}`, method: 'PUT', body: data }),
      transformResponse: responseData<Category>,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Category', id },
        { type: 'Category', id: 'LIST' },
        { type: 'Category', id: 'OPTIONS' },
      ],
    }),
    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({ url: `/catalog/categories/${id}`, method: 'DELETE' }),
      transformResponse: () => undefined,
      invalidatesTags: (_result, _error, id) => [
        { type: 'Category', id },
        { type: 'Category', id: 'LIST' },
        { type: 'Category', id: 'OPTIONS' },
      ],
    }),
  }),
})

export const {
  useGetCategoriesQuery,
  useGetCategoryQuery,
  useGetCategoryOptionsQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi
