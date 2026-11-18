import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

test('Customer Storefront Homepage — router registers /storefront, /products/:variantId, and /home alias under SalesLayout without altering / redirect', () => {
  const routerSource = readFileSync(new URL('../src/app/router.tsx', import.meta.url), 'utf8')
  assert.ok(routerSource.includes("path: '/storefront'"))
  assert.ok(routerSource.includes('element: <CustomerHomePage />'))
  assert.ok(routerSource.includes("path: '/products/:variantId'"))
  assert.ok(routerSource.includes('element: <ProductDetailPage />'))
  assert.ok(routerSource.includes("path: '/home'"))
  assert.ok(routerSource.includes('element: <Navigate to="/storefront" replace />'))
  // Preserve internal dashboard redirect for root /
  assert.ok(routerSource.includes('element: <Navigate to="/app/dashboard" replace />'))
})

test('Customer Storefront Homepage — SalesLayout and CustomerLoginPage connect directly to /storefront', () => {
  const salesLayoutSource = readFileSync(
    new URL('../src/layouts/SalesLayout.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(salesLayoutSource.includes('to="/storefront"'))
  assert.ok(salesLayoutSource.includes('Trang chủ'))
  assert.ok(salesLayoutSource.includes('Sản phẩm'))
  assert.ok(salesLayoutSource.includes('Combo ưu đãi'))
  assert.ok(!salesLayoutSource.includes('Giỏ hàng của tôi'))
  assert.ok(!salesLayoutSource.includes('Đặt hàng &amp; PayOS'))
  assert.ok(!salesLayoutSource.includes('Hỗ trợ kỹ thuật'))

  const profileSource = readFileSync(
    new URL('../src/pages/customer/CustomerProfilePage.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(profileSource.includes('/profile/warranties'))
  assert.ok(profileSource.includes('/profile/warranty-tickets'))

  const customerLoginSource = readFileSync(
    new URL('../src/pages/auth/CustomerLoginPage.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(customerLoginSource.includes('successPath="/storefront"'))
})

test('Customer Storefront Homepage — CustomerHomePage and StorefrontProductCard link directly to dedicated ProductDetailPage', () => {
  const homeSource = readFileSync(
    new URL('../src/pages/sales/CustomerHomePage.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(homeSource.includes('useGetSalesCatalogItemsQuery'))
  assert.ok(homeSource.includes('useCustomerCart'))
  assert.ok(homeSource.includes('StorefrontHeroBanner'))
  assert.ok(homeSource.includes('StorefrontQuickAccessStrip'))
  assert.ok(homeSource.includes('StorefrontProductCard'))
  assert.ok(homeSource.includes('Lọc theo danh mục thiết bị'))
  assert.ok(homeSource.includes('Gói Combo Thiết Bị Phòng Tắm Trọn Bộ'))

  const cardSource = readFileSync(
    new URL('../src/features/sales/components/StorefrontProductCard.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(cardSource.includes('/products/'))

  const detailSource = readFileSync(
    new URL('../src/pages/sales/ProductDetailPage.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(detailSource.includes('Thông số kỹ thuật'))
  assert.ok(detailSource.includes('Mua ngay'))
})

