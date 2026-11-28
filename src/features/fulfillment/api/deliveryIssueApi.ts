import type { ApiResponse } from '../../../shared/api/types'
import { deliveryApi } from './deliveryApi'
import type { CreateDeliveryRequest, DeliveryCandidates, DeliveryInvoice, DeliveryIssueResult } from '../types/deliveryIssue.types'

export const deliveryIssueApi = deliveryApi.injectEndpoints({
  endpoints: (b) => ({
    updateDeliveryDraft: b.mutation<DeliveryIssueResult, { id: string; body: CreateDeliveryRequest }>({
      query: ({ id, body }) => ({ url: `/fulfillment/deliveries/${id}/draft`, method: 'PUT', body }),
      transformResponse: (r: ApiResponse<DeliveryIssueResult>) => r.data!,
      invalidatesTags: ['Delivery'],
    }),
    getDeliveryInvoices: b.query<DeliveryInvoice[], string>({
      query: (orderId) => `/fulfillment/orders/${orderId}/delivery-invoices`,
      transformResponse: (r: ApiResponse<DeliveryInvoice[]>) => r.data!,
      providesTags: (_r, _e, orderId) => [
        'Delivery',
        { type: 'SalesOrder', id: orderId },
        { type: 'SalesInvoice', id: `ORDER-${orderId}` },
      ],
    }),
    getDeliveryCandidates: b.query<DeliveryCandidates, string>({
      query: (id) => `/fulfillment/sales-invoices/${id}/delivery-candidates`,
      transformResponse: (r: ApiResponse<DeliveryCandidates>) => r.data!,
      providesTags: ['Delivery', 'Inventory', 'OrderPayment', 'SalesOrder', 'StockReservation'],
    }),
    createDelivery: b.mutation<DeliveryIssueResult, { invoiceId: string; body: CreateDeliveryRequest }>({
      query: ({ invoiceId, body }) => ({ url: `/fulfillment/sales-invoices/${invoiceId}/deliveries`, method: 'POST', body }),
      transformResponse: (r: ApiResponse<DeliveryIssueResult>) => r.data!,
      invalidatesTags: ['Delivery', { type: 'OnlineOrder', id: 'DELIVERIES' }],
    }),
    issueDelivery: b.mutation<DeliveryIssueResult, { id: string; action: 'confirm-issue' | 'cancel-draft' }>({
      query: ({ id, action }) => ({ url: `/fulfillment/deliveries/${id}/${action}`, method: 'POST' }),
      transformResponse: (r: ApiResponse<DeliveryIssueResult>) => r.data!,
      invalidatesTags: (_r, _e, { action }) =>
        action === 'confirm-issue'
          ? ['Delivery', { type: 'OnlineOrder', id: 'DELIVERIES' }, 'Inventory', { type: 'SalesCatalog', id: 'LIST' }, 'StockReservation', 'SalesOrder']
          : ['Delivery', { type: 'OnlineOrder', id: 'DELIVERIES' }],
    }),
  }),
})
export const { useUpdateDeliveryDraftMutation, useGetDeliveryInvoicesQuery, useGetDeliveryCandidatesQuery, useCreateDeliveryMutation, useIssueDeliveryMutation } = deliveryIssueApi
