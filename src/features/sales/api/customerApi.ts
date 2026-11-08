import { baseApi, type PageResponse } from '../../../shared/api'

export interface CustomerOption {
  customerId: string
  userId?: string
  customerCode: string
  customerName: string
  phone?: string
  email?: string
  customerType?: string
  taxCode?: string
  companyName?: string
  address?: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface CustomerFilterParams {
  search?: string
  status?: string
  page?: number
  size?: number
}

export interface CreateCustomerRequest {
  customerName: string
  phone?: string
  email?: string
  customerType?: 'RETAIL' | 'PROJECT'
  taxCode?: string
  companyName?: string
  address?: string
}

export const customerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomerOptions: builder.query<CustomerOption[], void>({
      query: () => '/crm/customers/options',
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: [{ type: 'Quotation', id: 'CUSTOMER_OPTIONS' }],
    }),

    getCustomers: builder.query<PageResponse<CustomerOption>, CustomerFilterParams | void>({
      query: (params) => ({
        url: '/crm/customers',
        params: params ? (params as Record<string, unknown>) : undefined,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: [{ type: 'Quotation', id: 'CUSTOMERS' }],
    }),

    getCustomerById: builder.query<CustomerOption, string>({
      query: (id) => `/crm/customers/${id}`,
      transformResponse: (res: any) => res?.data ?? res,
      providesTags: (_res, _err, id) => [{ type: 'Quotation', id: `CUSTOMER_${id}` }],
    }),

    createCustomer: builder.mutation<CustomerOption, CreateCustomerRequest>({
      query: (body) => ({
        url: '/crm/customers',
        method: 'POST',
        body,
      }),
      transformResponse: (res: any) => res?.data ?? res,
      invalidatesTags: [
        { type: 'Quotation', id: 'CUSTOMER_OPTIONS' },
        { type: 'Quotation', id: 'CUSTOMERS' },
      ],
    }),
  }),
})

export const {
  useGetCustomerOptionsQuery,
  useGetCustomersQuery,
  useGetCustomerByIdQuery,
  useCreateCustomerMutation,
} = customerApi

