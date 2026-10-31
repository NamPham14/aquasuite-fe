import { createApi, type BaseQueryFn, type FetchArgs, type FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import { reauthBaseQuery } from '../../../shared/api/reauthBaseQuery.ts'
import type { ApiResponse, PageResponse } from '../../../shared/api/types.ts'
import { denyIamAccess, markIamAllowed, type IamAccessState } from '../model/iamAccessSlice.ts'

export interface IamPermission { id: string; code: string; description?: string | null }
export interface IamRole { id: string; code: string; description?: string | null; active: boolean; permissions: IamPermission[] }
export interface PermissionQuery { page: number; size: number; search?: string; sortBy: 'code' | 'description' | 'id'; direction: 'asc' | 'desc' }
type State = { auth: { sessionGeneration: number }; iamAccess: IamAccessState }
type Args = FetchArgs & { probe?: boolean }
const stale = { status: 'CUSTOM_ERROR' as const, error: 'IAM_ACCESS_STALE' }

const iamBaseQuery: BaseQueryFn<Args, unknown, FetchBaseQueryError> = async (args, api, extra) => {
  const initial = api.getState() as State
  const generation = initial.auth.sessionGeneration
  const epoch = initial.iamAccess.epoch
  const probe = args.probe === true
  if (probe ? initial.iamAccess.status !== 'checking' : ['denied', 'checking'].includes(initial.iamAccess.status)) return { error: stale }
  const { probe: _probe, ...request } = args
  const result = await reauthBaseQuery(request, api, { ...extra, isRequestCurrent: () => {
    const state = api.getState() as State
    return state.auth.sessionGeneration === generation && state.iamAccess.epoch === epoch
  } })
  const current = api.getState() as State
  if (current.auth.sessionGeneration !== generation || current.iamAccess.epoch !== epoch) return { error: stale }
  const error = result.error
  if (!probe && error?.status === 403 && (error.data as { code?: string } | undefined)?.code === 'AUTH_002') {
    api.dispatch(denyIamAccess(epoch))
    api.dispatch(iamAccessApi.util.resetApiState())
    return { error: stale }
  }
  if (!probe && !error) api.dispatch(markIamAllowed(epoch))
  return result
}

export const iamAccessApi = createApi({
  reducerPath: 'iamAccessApi', baseQuery: iamBaseQuery, tagTypes: ['Role', 'Permission'],
  endpoints: (builder) => ({
    roles: builder.query<ApiResponse<IamRole[]>, void>({ query: () => ({ url: '/iam/roles' }), providesTags: ['Role'] }),
    role: builder.query<ApiResponse<IamRole>, string>({ query: (id) => ({ url: `/iam/roles/${id}` }), providesTags: ['Role'] }),
    permissions: builder.query<ApiResponse<PageResponse<IamPermission>>, PermissionQuery>({ query: (params) => ({ url: '/iam/permissions', params }), providesTags: ['Permission'] }),
    permission: builder.query<ApiResponse<IamPermission>, string>({ query: (id) => ({ url: `/iam/permissions/${id}` }), providesTags: ['Permission'] }),
    createPermission: builder.mutation<ApiResponse<IamPermission>, { code: string; description: string | null }>({ query: (body) => ({ url: '/iam/permissions', method: 'POST', body }), invalidatesTags: ['Permission'] }),
    updatePermission: builder.mutation<ApiResponse<IamPermission>, { id: string; description: string | null }>({ query: ({ id, description }) => ({ url: `/iam/permissions/${id}`, method: 'PATCH', body: { description } }), invalidatesTags: ['Permission', 'Role'] }),
    deletePermission: builder.mutation<ApiResponse<null>, string>({ query: (id) => ({ url: `/iam/permissions/${id}`, method: 'DELETE' }), invalidatesTags: ['Permission', 'Role'] }),
    changeAssignment: builder.mutation<ApiResponse<IamRole>, { roleId: string; permissionId: string; assign: boolean }>({ query: ({ roleId, permissionId, assign }) => ({ url: `/iam/roles/${roleId}/permissions/${permissionId}`, method: assign ? 'PUT' : 'DELETE' }), invalidatesTags: ['Role', 'Permission'] }),
    probe: builder.query<ApiResponse<IamRole[]>, void>({ query: () => ({ url: '/iam/roles', probe: true }), keepUnusedDataFor: 0 }),
  }),
})
export const { useRolesQuery, useRoleQuery, usePermissionsQuery, usePermissionQuery, useCreatePermissionMutation, useUpdatePermissionMutation, useDeletePermissionMutation, useChangeAssignmentMutation } = iamAccessApi
