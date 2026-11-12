import { createApi } from '@reduxjs/toolkit/query/react'
import { reauthBaseQuery } from './reauthBaseQuery.ts'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: reauthBaseQuery,
  tagTypes: ['Category', 'Brand', 'UserAccount', 'Quotation', 'Variant', 'Product', 'SalesOrder', 'PurchaseOrder', 'CustomerDebt', 'OrderPayment', 'PaymentVerification', 'GoodsReceipt', 'Inventory', 'TechnicalJob'],
  endpoints: () => ({}),
})
