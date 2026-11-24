import { baseApi } from '../../../shared/api/baseApi.ts'
import type { PageResponse } from '../../../shared/api/types.ts'
import type {
  CancelWarrantyTicketPayload,
  ClaimFormData,
  CreateWarrantyTicketPayload,
  CompleteWarrantyTicketPayload,
  RejectWarrantyTicketPayload,
  TicketMedia,
  WarrantyTicketDetail,
  WarrantyTicketFilterParams,
  WarrantyTicketListItem,
} from '../types/warrantyTicket.types'

function cleanTicketParams(params?: WarrantyTicketFilterParams) {
  if (!params) return undefined
  const out: Record<string, unknown> = {}
  if (params.status) out.status = params.status
  if (params.page !== undefined) out.page = Math.max(0, params.page - 1)
  if (params.size !== undefined) out.size = params.size
  return out
}

function normalizeTicketPageResponse(res: any): PageResponse<WarrantyTicketListItem> {
  const payload = res?.data ?? res
  if (payload && Array.isArray(payload.items)) {
    return {
      ...payload,
      page: (payload.page ?? 0) + 1,
    }
  }
  return {
    items: [],
    page: 1,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  }
}

export const warrantyTicketApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClaimForm: builder.query<ClaimFormData, string>({
      query: (warrantyRecordId) => `/storefront/warranty-records/${warrantyRecordId}/claim-form`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: 'WarrantyRecord', id }],
    }),

    uploadTicketMedia: builder.mutation<TicketMedia, FormData>({
      query: (formData) => ({
        url: '/storefront/warranty-tickets/media',
        method: 'POST',
        body: formData,
      }),
      transformResponse: (res: any) => res?.data ?? res,
    }),

    submitWarrantyTicket: builder.mutation<WarrantyTicketDetail, CreateWarrantyTicketPayload>({
      query: (body) => ({
        url: '/storefront/warranty-tickets',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [
        { type: 'WarrantyTicket', id: 'LIST' },
        { type: 'WarrantyRecord', id: 'LIST' },
      ],
    }),

    getMyWarrantyTickets: builder.query<PageResponse<WarrantyTicketListItem>, WarrantyTicketFilterParams | void>({
      query: (params) => ({
        url: '/storefront/warranty-tickets',
        params: cleanTicketParams(params ?? undefined),
      }),
      transformResponse: normalizeTicketPageResponse,
      providesTags: (result) => [
        { type: 'WarrantyTicket', id: 'LIST' },
        ...(result?.items?.map(({ ticketId }) => ({
          type: 'WarrantyTicket' as const,
          id: ticketId,
        })) ?? []),
      ],
    }),

    getMyWarrantyTicketDetail: builder.query<WarrantyTicketDetail, string>({
      query: (id) => `/storefront/warranty-tickets/${id}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: 'WarrantyTicket', id }],
    }),

    cancelWarrantyTicket: builder.mutation<WarrantyTicketDetail, { id: string; body?: CancelWarrantyTicketPayload }>({
      query: ({ id, body }) => ({
        url: `/storefront/warranty-tickets/${id}/cancel`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'WarrantyTicket', id: 'LIST' },
        { type: 'WarrantyTicket', id },
        { type: 'WarrantyRecord', id: 'LIST' },
      ],
    }),

    // ===== Nội bộ cửa hàng (SHOP_OWNER) =====

    /** Danh sách toàn bộ yêu cầu bảo hành cho nhân viên/chủ (GET /warranty-tickets). */
    getManagedWarrantyTickets: builder.query<PageResponse<WarrantyTicketListItem>, WarrantyTicketFilterParams | void>({
      query: (params) => ({
        url: '/warranty-tickets',
        params: cleanTicketParams(params ?? undefined),
      }),
      transformResponse: normalizeTicketPageResponse,
      providesTags: (result) => [
        { type: 'WarrantyTicket', id: 'MANAGE_LIST' },
        ...(result?.items?.map(({ ticketId }) => ({ type: 'WarrantyTicket' as const, id: ticketId })) ?? []),
      ],
    }),

    /** Chi tiết một yêu cầu bảo hành (phạm vi nội bộ, GET /warranty-tickets/{id}). */
    getManagedWarrantyTicketDetail: builder.query<WarrantyTicketDetail, string>({
      query: (id) => `/warranty-tickets/${id}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: 'WarrantyTicket', id }],
    }),

    /** Chủ cửa hàng tiếp nhận xử lý yêu cầu bảo hành: NEW → IN_PROGRESS (POST /warranty-tickets/{id}/start). */
    startManagedWarrantyTicket: builder.mutation<WarrantyTicketDetail, string>({
      query: (id) => ({ url: `/warranty-tickets/${id}/start`, method: 'POST' }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, id) => [
        { type: 'WarrantyTicket', id: 'MANAGE_LIST' },
        { type: 'WarrantyTicket', id },
      ],
    }),

    /** Chủ cửa hàng hoàn tất yêu cầu đang xử lý kèm kết quả: IN_PROGRESS → DONE (POST /warranty-tickets/{id}/complete). */
    completeManagedWarrantyTicket: builder.mutation<WarrantyTicketDetail, { id: string; body: CompleteWarrantyTicketPayload }>({
      query: ({ id, body }) => ({ url: `/warranty-tickets/${id}/complete`, method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'WarrantyTicket', id: 'MANAGE_LIST' },
        { type: 'WarrantyTicket', id },
        { type: 'WarrantyRecord', id: 'LIST' },
      ],
    }),

    /** Chủ cửa hàng từ chối yêu cầu bảo hành tại bàn (POST /warranty-tickets/{id}/reject). */
    rejectManagedWarrantyTicket: builder.mutation<WarrantyTicketDetail, { id: string; body: RejectWarrantyTicketPayload }>({
      query: ({ id, body }) => ({ url: `/warranty-tickets/${id}/reject`, method: 'POST', body }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'WarrantyTicket', id: 'MANAGE_LIST' },
        { type: 'WarrantyTicket', id },
      ],
    }),
  }),
})

export const {
  useGetClaimFormQuery,
  useUploadTicketMediaMutation,
  useSubmitWarrantyTicketMutation,
  useGetMyWarrantyTicketsQuery,
  useGetMyWarrantyTicketDetailQuery,
  useCancelWarrantyTicketMutation,
  useGetManagedWarrantyTicketsQuery,
  useGetManagedWarrantyTicketDetailQuery,
  useStartManagedWarrantyTicketMutation,
  useCompleteManagedWarrantyTicketMutation,
  useRejectManagedWarrantyTicketMutation,
} = warrantyTicketApi

