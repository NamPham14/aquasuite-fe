import { baseApi } from '../../../shared/api'
import type { CatalogItemOption } from '../data/catalogProducts.data'
import { normalizeSalesCatalog } from '../lib/salesCatalog'

export const salesCatalogApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSalesCatalogItems: builder.query<CatalogItemOption[], void>({
      query: () => '/sales/catalog-items',
      transformResponse: normalizeSalesCatalog,
      providesTags: [{ type: 'Quotation', id: 'SALES_CATALOG_ITEMS' }],
    }),
  }),
})

export const { useGetSalesCatalogItemsQuery } = salesCatalogApi

