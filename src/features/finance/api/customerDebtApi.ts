import { baseApi } from '../../../shared/api/baseApi.ts'
import type { ApiResponse } from '../../../shared/api/types.ts'
import type { CreditApprovalGrant, CreditApprovalGrantRequest, CreditCheckRequest, CreditCheckResult, CustomerCreditProfileResult, CustomerDebtDetail, CustomerDebtPage, DebtCallRequest, DebtDashboardStats, DebtReminderRequest, DebtReminderResult, ReasonRequest, StatementEmailResult, UpdateCreditProfileRequest } from '../types/customerDebt.types.ts'

function dataOf<T>(response: ApiResponse<T>): T { if (response.data === undefined) throw new Error('Phản hồi công nợ không có dữ liệu.'); return response.data }

export const customerDebtApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerDebtStats: builder.query<DebtDashboardStats, void>({ query: () => '/finance/customer-debts/stats', transformResponse: dataOf<DebtDashboardStats>, providesTags: [{ type: 'CustomerDebt', id: 'STATS' }] }),
    getCustomerDebts: builder.query<CustomerDebtPage, { keyword?: string; customerType?: string; debtStatus?: string; page: number; size: number }>({
      query: (params) => ({ url: '/finance/customer-debts', params }), transformResponse: dataOf<CustomerDebtPage>,
      providesTags: (result) => [{ type: 'CustomerDebt', id: 'LIST' }, ...(result?.content.map((item) => ({ type: 'CustomerDebt' as const, id: item.customerId })) ?? [])],
    }),
    getCustomerDebtDetail: builder.query<CustomerDebtDetail, string>({ query: (customerId) => `/finance/customer-debts/${customerId}`, transformResponse: dataOf<CustomerDebtDetail>, providesTags: (_result, _error, customerId) => [{ type: 'CustomerDebt', id: customerId }] }),
    checkCredit: builder.mutation<CreditCheckResult, { customerId: string; data: CreditCheckRequest }>({ query: ({ customerId, data }) => ({ url: `/finance/customer-debts/${customerId}/credit-check`, method: 'POST', body: data }), transformResponse: dataOf<CreditCheckResult> }),
    approveCreditOverride: builder.mutation<void, { orderId: string; data: ReasonRequest }>({ query: ({ orderId, data }) => ({ url: `/finance/customer-debts/orders/${orderId}/credit-override`, method: 'POST', body: data }), invalidatesTags: [{ type: 'CustomerDebt', id: 'LIST' }, { type: 'CustomerDebt', id: 'STATS' }] }),
    sendDebtReminder: builder.mutation<DebtReminderResult, { customerId: string; data: DebtReminderRequest }>({ query: ({ customerId, data }) => ({ url: `/finance/customer-debts/${customerId}/reminders`, method: 'POST', body: data }), transformResponse: dataOf<DebtReminderResult>, invalidatesTags: (_result, _error, { customerId }) => [{ type: 'CustomerDebt', id: customerId }] }),
    saveDebtCallResult: builder.mutation<void, { customerId: string; data: DebtCallRequest }>({ query: ({ customerId, data }) => ({ url: `/finance/customer-debts/${customerId}/reminder-calls`, method: 'POST', body: data }), invalidatesTags: (_result, _error, { customerId }) => [{ type: 'CustomerDebt', id: customerId }] }),
    exportDebtStatement: builder.query<Blob, string>({ query: (customerId) => ({ url: `/finance/customer-debts/${customerId}/statement`, responseHandler: (response) => response.blob() }) }),
    emailDebtStatement: builder.mutation<StatementEmailResult, string>({ query: (customerId) => ({ url: `/finance/customer-debts/${customerId}/statement/email`, method: 'POST' }), transformResponse: dataOf<StatementEmailResult>, invalidatesTags: (_result, _error, customerId) => [{ type: 'CustomerDebt', id: customerId }] }),
    blockCustomer: builder.mutation<void, { customerId: string; data: ReasonRequest }>({ query: ({ customerId, data }) => ({ url: `/finance/customer-debts/${customerId}/block`, method: 'PATCH', body: data }), invalidatesTags: (_result, _error, { customerId }) => [{ type: 'CustomerDebt', id: customerId }, { type: 'CustomerDebt', id: 'LIST' }, { type: 'CustomerDebt', id: 'STATS' }] }),
    restoreCustomer: builder.mutation<void, { customerId: string; data: ReasonRequest }>({ query: ({ customerId, data }) => ({ url: `/finance/customer-debts/${customerId}/restore`, method: 'PATCH', body: data }), invalidatesTags: (_result, _error, { customerId }) => [{ type: 'CustomerDebt', id: customerId }, { type: 'CustomerDebt', id: 'LIST' }, { type: 'CustomerDebt', id: 'STATS' }] }),
    issueCreditApprovalGrant: builder.mutation<CreditApprovalGrant, CreditApprovalGrantRequest>({ query: (body) => ({ url: '/iam/credit-approval-grants', method: 'POST', body }), transformResponse: dataOf<CreditApprovalGrant> }),
    updateCustomerCreditProfile: builder.mutation<CustomerCreditProfileResult, { customerId: string; data: UpdateCreditProfileRequest }>({ query: ({ customerId, data }) => ({ url: `/crm/customers/${customerId}/credit-profile`, method: 'PATCH', body: data }), transformResponse: dataOf<CustomerCreditProfileResult>, invalidatesTags: (_result, _error, { customerId }) => [{ type: 'CustomerDebt', id: customerId }, { type: 'CustomerDebt', id: 'LIST' }, { type: 'CustomerDebt', id: 'STATS' }] }),
  }),
})

export const { useGetCustomerDebtStatsQuery, useGetCustomerDebtsQuery, useGetCustomerDebtDetailQuery, useCheckCreditMutation, useApproveCreditOverrideMutation, useSendDebtReminderMutation, useSaveDebtCallResultMutation, useLazyExportDebtStatementQuery, useEmailDebtStatementMutation, useBlockCustomerMutation, useRestoreCustomerMutation, useIssueCreditApprovalGrantMutation, useUpdateCustomerCreditProfileMutation } = customerDebtApi
