import { createApi } from '@reduxjs/toolkit/query/react'
import { reauthBaseQuery } from './reauthBaseQuery.ts'

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: reauthBaseQuery,
  tagTypes: [
    'Category',
    'Brand',
    'UserAccount',
    'Quotation',
    'Variant',
    'Product',
    'SalesOrder',
    'SalesInvoice',
    'PurchaseOrder',
    'CustomerDebt',
    'OrderPayment',
    'PaymentAllocation',
    'PaymentVerification',
    'GoodsReceipt',
    'Inventory',
    'WarrantyPolicy',
    'WarrantyRecord',
    'WarrantyTicket',
    'Cart',
    'OnlineOrder',
    'Profile',
    'DeliveryAddress',
    'AuditLog'
  ],
  endpoints: () => ({}),
})
