import { baseApi } from '../../../shared/api/baseApi.ts'
import type { PageResponse } from '../../../shared/api/types.ts'
import type {
  AssignTechnicalJobRequest,
  CompleteTechnicalJobRequest,
  CreateTechnicalJobRequest,
  RejectTechnicalJobRequest,
  TechnicalJobDetail,
  TechnicalJobFilterParams,
  TechnicalJobListItem,
} from '../types/technicalJob.types.ts'

/**
 * Chuyển Spring Page JSON ({ content, number, size, totalElements, totalPages })
 * về PageResponse chuẩn của FE ({ items, page 1-based, size, totalElements, totalPages }).
 */
function toPageResponse<T>(res: any): PageResponse<T> {
  const data = res?.data ?? res ?? {}
  return {
    items: data.content ?? [],
    page: (data.number ?? 0) + 1,
    size: data.size ?? 0,
    totalElements: data.totalElements ?? 0,
    totalPages: data.totalPages ?? 0,
  }
}

/**
 * Endpoints RTK Query cho FE-13 (Công việc kỹ thuật, UC-59/60/61 + phân công của Chủ cửa hàng).
 * Tra cứu dùng chung tag 'TechnicalJob'; mọi thao tác thay đổi trạng thái (assign/accept/reject/complete)
 * đều invalidate lại danh sách và chi tiết công việc để UI phản ánh trạng thái mới ngay.
 */
export const technicalJobApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Tra cứu danh sách công việc kỹ thuật / lịch làm việc có phân trang + lọc (UC-59).
     * Phạm vi dữ liệu do BE tự áp theo người đăng nhập: kỹ thuật viên chỉ thấy việc của mình,
     * Chủ cửa hàng thấy toàn bộ. BE dùng Spring Pageable: page 0-based, sort="field,dir".
     */
    searchTechnicalJobs: builder.query<PageResponse<TechnicalJobListItem>, TechnicalJobFilterParams | void>({
      query: (params) => {
        const qs = new URLSearchParams()
        const pageIndex = params?.page !== undefined ? Math.max(0, params.page - 1) : 0
        qs.append('page', String(pageIndex))
        if (params?.size !== undefined) qs.append('size', String(params.size))
        if (params?.sortBy) qs.append('sort', `${params.sortBy},${params.direction ?? 'asc'}`)
        if (params?.status) qs.append('status', params.status)
        if (params?.jobType) qs.append('jobType', params.jobType)
        if (params?.from) qs.append('from', params.from)
        if (params?.to) qs.append('to', params.to)
        return { url: `/technical-jobs?${qs.toString()}`, method: 'GET' }
      },
      transformResponse: (res: any) => toPageResponse<TechnicalJobListItem>(res),
      providesTags: (result) => [
        { type: 'TechnicalJob', id: 'LIST' },
        ...(result?.items?.map(({ technicalJobId }) => ({ type: 'TechnicalJob' as const, id: technicalJobId })) ?? []),
      ],
    }),

    /**
     * Tạo công việc kỹ thuật thủ công — chỉ Chủ cửa hàng (POST /technical-jobs).
     * Không phụ thuộc loại đơn; dùng cho mọi khách và cả 3 loại công việc. Invalidate danh sách để hiện ngay.
     */
    createTechnicalJob: builder.mutation<TechnicalJobDetail, CreateTechnicalJobRequest>({
      query: (body) => ({ url: '/technical-jobs', method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [{ type: 'TechnicalJob', id: 'LIST' }],
    }),

    /** Chi tiết một công việc kỹ thuật (UC-59). */
    getTechnicalJobDetail: builder.query<TechnicalJobDetail, string>({
      query: (id) => `/technical-jobs/${id}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: 'TechnicalJob', id }],
    }),

    /**
     * Phân công công việc cho một kỹ thuật viên — chỉ Chủ cửa hàng (POST /{id}/assign).
     * Áp dụng cho việc đang ASSIGNED hoặc REJECTED (phân công lại). Khép luồng auto-sinh từ Order.
     */
    assignTechnicalJob: builder.mutation<TechnicalJobDetail, { id: string; body: AssignTechnicalJobRequest }>({
      query: ({ id, body }) => ({ url: `/technical-jobs/${id}/assign`, method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [{ type: 'TechnicalJob', id }, { type: 'TechnicalJob', id: 'LIST' }],
    }),

    /** Tiếp nhận công việc (UC-60): ASSIGNED → IN_PROGRESS. */
    acceptTechnicalJob: builder.mutation<TechnicalJobDetail, string>({
      query: (id) => ({ url: `/technical-jobs/${id}/accept`, method: 'POST' }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, id) => [{ type: 'TechnicalJob', id }, { type: 'TechnicalJob', id: 'LIST' }],
    }),

    /** Từ chối công việc (UC-60): ASSIGNED → REJECTED, kèm lý do. */
    rejectTechnicalJob: builder.mutation<TechnicalJobDetail, { id: string; body: RejectTechnicalJobRequest }>({
      query: ({ id, body }) => ({ url: `/technical-jobs/${id}/reject`, method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [{ type: 'TechnicalJob', id }, { type: 'TechnicalJob', id: 'LIST' }],
    }),

    /** Ghi kết quả & hoàn tất (UC-61): IN_PROGRESS → COMPLETED. */
    completeTechnicalJob: builder.mutation<TechnicalJobDetail, { id: string; body: CompleteTechnicalJobRequest }>({
      query: ({ id, body }) => ({ url: `/technical-jobs/${id}/complete`, method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [{ type: 'TechnicalJob', id }, { type: 'TechnicalJob', id: 'LIST' }],
    }),
  }),
  overrideExisting: false,
})

export const {
  useSearchTechnicalJobsQuery,
  useCreateTechnicalJobMutation,
  useGetTechnicalJobDetailQuery,
  useAssignTechnicalJobMutation,
  useAcceptTechnicalJobMutation,
  useRejectTechnicalJobMutation,
  useCompleteTechnicalJobMutation,
} = technicalJobApi
