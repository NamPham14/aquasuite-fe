import { baseApi } from '../../../shared/api/baseApi.ts'

export interface AuditLogEntry {
  id: string
  entityType: string
  entityId: string
  action: string
  actorName?: string
  reason?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  createdAt: string
}

export interface AuditLogPage {
  content: AuditLogEntry[]
  totalElements: number
  totalPages: number
}

export interface AuditLogParams {
  entityType: string
  entityId?: string
  productId?: string
  page?: number
  size?: number
}

export const auditLogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query<AuditLogPage, AuditLogParams>({
      query: (params) => ({ url: '/audit-logs', params: { page: 0, size: 10, ...params } }),
      transformResponse: (response: { data?: AuditLogPage } | AuditLogPage): AuditLogPage => {
        if ('data' in response && response.data) return response.data
        return response as AuditLogPage
      },
      providesTags: (_result, _error, params) => [{ type: 'AuditLog', id: `${params.entityType}:${params.entityId ?? params.productId ?? 'ALL'}` }],
    }),
  }),
})

export const { useGetAuditLogsQuery } = auditLogApi
