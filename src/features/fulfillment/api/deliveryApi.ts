import { baseApi } from '../../../shared/api/baseApi'
import type { ApiResponse } from '../../../shared/api/types'
import type { Delivery, DeliveryDetail, DeliveryFilters, DeliveryPage } from '../types/delivery.types'

export const deliveryApi = baseApi.enhanceEndpoints({ addTagTypes: ['Delivery'] }).injectEndpoints({
  endpoints: (b) => ({
    downloadIssueNote: b.mutation<string, string>({
      query: (id) => ({ url: `/fulfillment/deliveries/${id}/issue-note.pdf`, cache: 'no-store', responseHandler: async (response) => response.ok ? URL.createObjectURL(await response.blob()) : response.json() }),
    }),
    getDeliveryPhoto: b.query<string, { id: string; photoId: string }>({
      query: ({ id, photoId }) => ({ url: `/fulfillment/deliveries/${id}/photos/${photoId}`, cache: 'no-store', responseHandler: async (response) => response.ok ? URL.createObjectURL(await response.blob()) : response.json() }),
      keepUnusedDataFor: 0,
      async onCacheEntryAdded(_arg, { cacheDataLoaded, cacheEntryRemoved }) {
        try { const { data } = await cacheDataLoaded; await cacheEntryRemoved; URL.revokeObjectURL(data) } catch { /* No URL exists when loading failed. */ }
      },
    }),
    getDeliveries: b.query<DeliveryPage, DeliveryFilters & { mine?: boolean }>({
      query: ({ mine, ...params }) => ({ url: `/fulfillment/${mine ? 'me/' : ''}deliveries`, params }),
      transformResponse: (r: ApiResponse<DeliveryPage>) => r.data!, providesTags: ['Delivery'],
    }),
    getDelivery: b.query<DeliveryDetail, string>({
      query: (id) => `/fulfillment/deliveries/${id}`,
      transformResponse: (r: ApiResponse<DeliveryDetail>) => r.data!, providesTags: ['Delivery'],
    }),
    assignDeliveries: b.mutation<Delivery[], { shipperId: string; deliveryIds: string[] }>({
      query: (body) => ({ url: '/fulfillment/delivery-assignments', method: 'PUT', body }), invalidatesTags: ['Delivery'],
    }),
    deliveryAction: b.mutation<unknown, { id: string; action: 'start' | 'fail' | 'complete' | 'assignment' | 'reschedule'; body?: { reason: string; scheduledDate?: string | null; customerCancellationConfirmed?: boolean } | FormData }>({
      query: ({ id, action, body }) => ({ url: `/fulfillment/deliveries/${id}/${action}`, method: action === 'assignment' ? 'DELETE' : 'POST', body }),
      invalidatesTags: ['Delivery'],
    }),
  }),
})
export const { useDownloadIssueNoteMutation, useGetDeliveryPhotoQuery, useGetDeliveriesQuery, useGetDeliveryQuery, useAssignDeliveriesMutation, useDeliveryActionMutation } = deliveryApi
