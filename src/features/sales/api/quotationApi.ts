import { baseApi, type PageResponse } from '../../../shared/api'
import type {
  ApproveQuotationRequest,
  MarkAcceptedRequest,
  MarkLostRequest,
  QuotationFilterParams,
  QuotationListItemResponse,
  QuotationResponse,
  QuotationUpsertRequest,
  RejectQuotationRequest,
  SubmitApprovalRequest,
} from '../types/quotation.types'

function cleanParams(obj: Record<string, unknown>) {
  const result: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined && val !== null && val !== '') {
      result[key] = val
    }
  }
  return result
}

export const quotationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getQuotations: builder.query<PageResponse<QuotationListItemResponse>, QuotationFilterParams | void>({
      query: (params) => {
        let mappedParams: Record<string, unknown> | undefined
        if (params) {
          const { page, ...rest } = params
          mappedParams = {
            ...rest,
            page: page !== undefined ? Math.max(0, page - 1) : 0,
          }
        }
        return {
          url: '/sales/quotations',
          params: mappedParams ? cleanParams(mappedParams) : undefined,
        }
      },
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (result) => [
        { type: 'Quotation', id: 'LIST' },
        ...(result?.items?.map(({ quotationId }) => ({ type: 'Quotation' as const, id: quotationId })) ?? []),
      ],
    }),

    getQuotation: builder.query<QuotationResponse, string>({
      query: (id) => `/sales/quotations/${id}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: 'Quotation', id }],
    }),

    previewQuotation: builder.mutation<QuotationResponse, QuotationUpsertRequest>({
      query: (body) => ({
        url: '/sales/quotations/preview',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
    }),

    createQuotation: builder.mutation<QuotationResponse, QuotationUpsertRequest>({
      query: (body) => ({
        url: '/sales/quotations',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'ME_LIST' },
      ],
    }),

    updateQuotation: builder.mutation<QuotationResponse, { id: string; body: QuotationUpsertRequest }>({
      query: ({ id, body }) => ({
        url: `/sales/quotations/${id}`,
        method: 'PUT',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'ME_LIST' },
      ],
    }),

    deleteQuotation: builder.mutation<void, string>({
      query: (id) => ({
        url: `/sales/quotations/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, id) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'ME_LIST' },
      ],
    }),

    submitApproval: builder.mutation<QuotationResponse, { id: string; body: SubmitApprovalRequest }>({
      query: ({ id, body }) => ({
        url: `/sales/quotations/${id}/submit-approval`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'ME_LIST' },
      ],
    }),

    approveQuotation: builder.mutation<QuotationResponse, { id: string; body?: ApproveQuotationRequest }>({
      query: ({ id, body }) => ({
        url: `/sales/quotations/${id}/approve`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'ME_LIST' },
      ],
    }),

    rejectQuotation: builder.mutation<QuotationResponse, { id: string; body: RejectQuotationRequest }>({
      query: ({ id, body }) => ({
        url: `/sales/quotations/${id}/reject`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'ME_LIST' },
      ],
    }),

    createRevision: builder.mutation<QuotationResponse, string>({
      query: (id) => ({
        url: `/sales/quotations/${id}/revisions`,
        method: 'POST',
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, id) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'ME_LIST' },
      ],
    }),

    markAccepted: builder.mutation<QuotationResponse, { id: string; body?: MarkAcceptedRequest }>({
      query: ({ id, body }) => ({
        url: `/sales/quotations/${id}/accept`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'ME_LIST' },
      ],
    }),

    markLost: builder.mutation<QuotationResponse, { id: string; body: MarkLostRequest }>({
      query: ({ id, body }) => ({
        url: `/sales/quotations/${id}/lost`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'ME_LIST' },
      ],
    }),

    sendQuotation: builder.mutation<QuotationResponse, string>({
      query: (id) => ({
        url: `/sales/quotations/${id}/send`,
        method: 'POST',
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, id) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'ME_LIST' },
      ],
    }),

    getRevisionHistory: builder.query<QuotationListItemResponse[], string>({
      query: (quotationCode) => `/sales/quotations/code/${quotationCode}/revisions`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, quotationCode) => [
        { type: 'Quotation', id: `REVISIONS_${quotationCode}` },
        { type: 'Quotation', id: 'LIST' },
      ],
    }),

    convertToOrder: builder.mutation<
      any,
      {
        id: string
        body?: {
          note?: string
          deliveryAddress?: string
          dueDate?: string
          requestCreditIncrease?: boolean
          creditIncreaseReason?: string
        }
      }
    >({
      query: ({ id, body }) => ({
        url: `/sales/quotations/${id}/convert-to-order`,
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: (_res, _err, { id }) => [
        { type: 'Quotation', id },
        { type: 'Quotation', id: 'LIST' },
        { type: 'Quotation', id: 'ME_LIST' },
        { type: 'SalesOrder', id: 'LIST' },
        { type: 'SalesOrder', id: 'ME_LIST' },
        { type: 'StockReservation', id: 'ORDER_LIST' },
        'Inventory',
        { type: 'SalesCatalog', id: 'LIST' },
        'CustomerDebt',
      ],
    }),
  }),
})

export const {
  useGetQuotationsQuery,
  useGetQuotationQuery,
  usePreviewQuotationMutation,
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
  useDeleteQuotationMutation,
  useSubmitApprovalMutation,
  useApproveQuotationMutation,
  useRejectQuotationMutation,
  useCreateRevisionMutation,
  useSendQuotationMutation,
  useMarkAcceptedMutation,
  useMarkLostMutation,
  useGetRevisionHistoryQuery,
  useConvertToOrderMutation,
} = quotationApi
