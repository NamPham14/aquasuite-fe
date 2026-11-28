import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { register } from 'node:module'
import type { CartItemResponse } from '../src/features/sales/types/cart.types.ts'
import type { WarrantyRecordListItem } from '../src/features/servicedesk/types/warranty.types.ts'

register('./loader.mjs', import.meta.url)

const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { MemoryRouter } = await import('react-router-dom')
const { CustomerCartTable } = await import(
  '../src/features/sales/components/CustomerCartTable.tsx'
)
const { CustomerCartSummary } = await import(
  '../src/features/sales/components/CustomerCartSummary.tsx'
)
const { WarrantyGroupedOrderTable } = await import(
  '../src/features/servicedesk/components/WarrantyGroupedOrderTable.tsx'
)
const { groupWarrantyRecordsByOrder } = await import(
  '../src/features/servicedesk/utils/warrantyGrouping.ts'
)

const CUSTOMER_SOURCES_NO_MOCK = [
  '../src/pages/sales/CustomerHomePage.tsx',
  '../src/pages/sales/ProductDetailPage.tsx',
  '../src/features/sales/components/CartProductPickerDrawer.tsx',
  '../src/features/sales/lib/guestCartStorage.ts',
  '../src/features/sales/hooks/useCustomerCart.ts',
]

const REDESIGNED_UI_SOURCES = [
  '../src/pages/sales/ProductDetailPage.tsx',
  '../src/pages/sales/CartPage.tsx',
  '../src/pages/sales/CheckoutPage.tsx',
  '../src/pages/sales/CheckoutResultPage.tsx',
  '../src/features/sales/components/CustomerCartTable.tsx',
  '../src/features/sales/components/CustomerCartSummary.tsx',
  '../src/features/sales/components/CartProductPickerDrawer.tsx',
  '../src/features/sales/components/PayosCheckoutPanel.tsx',
  '../src/pages/customer/CustomerProfilePage.tsx',
  '../src/pages/customer/MyWarrantyTicketsPage.tsx',
  '../src/features/customer/components/ProfileInfoSection.tsx',
  '../src/features/customer/components/ProfilePasswordSection.tsx',
  '../src/features/customer/components/ProfileAddressesSection.tsx',
  '../src/features/customer/components/ProfileOrdersSection.tsx',
  '../src/features/customer/components/ProfileDeliveriesSection.tsx',
  '../src/features/customer/components/ProfileDebtSection.tsx',
  '../src/features/customer/components/ProfileQuotationsSection.tsx',
  '../src/features/customer/components/ProfileWarrantySection.tsx',
]

test('Toàn bộ luồng khách hàng không còn sử dụng mock CATALOG_PRODUCTS và tải trực tiếp từ API', () => {
  for (const relPath of CUSTOMER_SOURCES_NO_MOCK) {
    const content = readFileSync(new URL(relPath, import.meta.url), 'utf8')
    assert.equal(
      content.includes('CATALOG_PRODUCTS'),
      false,
      `${relPath} không được phép tham chiếu mock CATALOG_PRODUCTS`,
    )
  }

  const homeSrc = readFileSync(new URL('../src/pages/sales/CustomerHomePage.tsx', import.meta.url), 'utf8')
  const pdpSrc = readFileSync(new URL('../src/pages/sales/ProductDetailPage.tsx', import.meta.url), 'utf8')
  const hookSrc = readFileSync(new URL('../src/features/sales/hooks/useCustomerCart.ts', import.meta.url), 'utf8')

  assert.ok(homeSrc.includes('useGetSalesCatalogItemsQuery()'))
  assert.ok(pdpSrc.includes('useGetSalesCatalogItemsQuery()'))
  assert.ok(hookSrc.includes('useGetSalesCatalogItemsQuery'))
})

test('Tất cả trang khách hàng dùng ngôn ngữ Quiet-Luxury Showroom và loại bỏ thẻ nhựa/gradient cũ', () => {
  for (const relPath of REDESIGNED_UI_SOURCES) {
    const content = readFileSync(new URL(relPath, import.meta.url), 'utf8')
    assert.doesNotMatch(
      content,
      /aqua-shine-btn|from-sky-600|to-cyan-600|rounded-3xl|animate-ping/,
      `${relPath} vẫn còn class UI nhựa/gradient cũ`,
    )
    assert.ok(
      content.includes('#E6E2DA') || content.includes('#171614'),
      `${relPath} phải áp dụng bảng màu Quiet-Luxury Showroom`,
    )
  }
})

test('CustomerCartTable và CustomerCartSummary render chuẩn Quiet-Luxury Showroom', () => {
  const sampleItem: CartItemResponse = {
    cartItemId: 'ci-1',
    variantId: 'var-1',
    productId: 'prod-1',
    sku: 'TOTO-CS989',
    productName: 'Bồn cầu thông minh TOTO Neorest',
    variantName: 'Trắng sứ',
    imageUrl: null,
    unit: 'Bộ',
    quantity: 1,
    unitPrice: 85000000,
    currentSellingPrice: 85000000,
    lineTotal: 85000000,
    availableQty: 5,
    variantStatus: 'ACTIVE',
    inStock: true,
    priceChanged: false,
    updatedAt: '2026-11-28T00:00:00Z',
  }

  const tableHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(CustomerCartTable, {
        items: [sampleItem],
        pendingItemIds: {},
        isClearing: false,
        onUpdateQuantity: async () => true,
        onRemoveItem: async () => true,
        onClearCart: async () => true,
        onOpenProductPicker: () => {},
      }),
    ),
  )

  assert.match(tableHtml, /Bồn cầu thông minh TOTO Neorest/)
  assert.match(tableHtml, /TOTO-CS989/)
  assert.match(tableHtml, /border-\[#E6E2DA\]/)

  const summaryHtml = renderToStaticMarkup(
    React.createElement(CustomerCartSummary, {
      totalItems: 1,
      totalQuantity: 1,
      subtotal: 85000000,
      hasInvalidItems: false,
      isLoading: false,
      isGuestCart: false,
      onProceedCheckout: () => {},
    }),
  )

  assert.match(summaryHtml, /Tóm tắt giỏ hàng/)
  assert.match(summaryHtml, /Tiến hành đặt hàng/)
})

test('WarrantyGroupedOrderTable ở chế độ customerScope dùng theme Quiet-Luxury giữ nguyên gom nhóm theo đơn', () => {
  const items: WarrantyRecordListItem[] = [
    {
      warrantyRecordId: 'wr-1',
      warrantyCode: 'WAR-202611-0001',
      variantId: 'var-1',
      sku: 'TOTO-1',
      productName: 'Sen tắm nhiệt độ TOTO',
      variantName: 'Crom',
      serialNumber: 'SN-1',
      customerId: 'c-1',
      customerName: 'Nguyễn A',
      phoneNumber: '0901234567',
      orderId: 'ord-1',
      orderCode: 'ORD-202611-99',
      startDate: '2026-11-01',
      endDate: '2028-11-01',
      remainingDays: 700,
      warrantyMonths: 24,
      status: 'ACTIVE',
      displayStatus: 'ACTIVE',
      canRequestSupport: true,
      openTicketCode: null,
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      warrantyRecordId: 'wr-2',
      warrantyCode: 'WAR-202611-0002',
      variantId: 'var-2',
      sku: 'TOTO-2',
      productName: 'Vòi chậu TOTO',
      variantName: 'Crom',
      serialNumber: 'SN-2',
      customerId: 'c-1',
      customerName: 'Nguyễn A',
      phoneNumber: '0901234567',
      orderId: 'ord-1',
      orderCode: 'ORD-202611-99',
      startDate: '2026-11-01',
      endDate: '2028-11-01',
      remainingDays: 700,
      warrantyMonths: 24,
      status: 'ACTIVE',
      displayStatus: 'ACTIVE',
      canRequestSupport: true,
      openTicketCode: null,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ]

  const groups = groupWarrantyRecordsByOrder(items)
  const html = renderToStaticMarkup(
    React.createElement(WarrantyGroupedOrderTable, {
      groups,
      expandedKeys: new Set([groups[0].groupKey]),
      onToggleGroup: () => {},
      customerScope: true,
      canVoid: false,
      onViewDetail: () => {},
      onClaim: () => {},
      onVoid: () => {},
      emptyMessage: 'Trống',
    }),
  )

  assert.match(html, /ORD-202611-99/)
  assert.match(html, /WAR-202611-0001/)
  assert.match(html, /WAR-202611-0002/)
  assert.match(html, /border-\[#E6E2DA\]/)
})
