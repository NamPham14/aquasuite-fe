import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { register } from 'node:module'

register('./loader.mjs', import.meta.url)

const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { MemoryRouter } = await import('react-router-dom')
const { StorefrontQuickAccessStrip } = await import(
  '../src/features/sales/components/StorefrontQuickAccessStrip.tsx'
)

test('ProductDetailPage không còn 2 nút Chọn thiết bị trong cấu hình / Mở giỏ hàng và giữ modal chi tiết cấu hình', () => {
  const pdpSrc = readFileSync(
    new URL('../src/pages/sales/ProductDetailPage.tsx', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(pdpSrc, /Chọn thiết bị trong cấu hình/)
  assert.doesNotMatch(pdpSrc, /Mở giỏ hàng của tôi/)
  assert.match(pdpSrc, /ComboComponentDetailModal/)
  assert.match(pdpSrc, /Cấu hình trọn bộ/)
})

test('CustomerProfilePage tích hợp đủ các tab theo dõi Đơn hàng, Giao hàng, Công nợ và Báo giá dự án', () => {
  const profileSrc = readFileSync(
    new URL('../src/pages/customer/CustomerProfilePage.tsx', import.meta.url),
    'utf8',
  )
  assert.match(profileSrc, /key:\s*'orders'/)
  assert.match(profileSrc, /key:\s*'deliveries'/)
  assert.match(profileSrc, /key:\s*'debt'/)
  assert.match(profileSrc, /key:\s*'quotations'/)
  assert.match(profileSrc, /ProfileDeliveriesSection/)
  assert.match(profileSrc, /ProfileDebtSection/)
  assert.match(profileSrc, /ProfileQuotationsSection/)
})

test('customerTrackingApi trỏ đúng endpoint self-service ROLE_CUSTOMER phía Backend', () => {
  const apiSrc = readFileSync(
    new URL('../src/features/customer/api/customerTrackingApi.ts', import.meta.url),
    'utf8',
  )
  assert.match(apiSrc, /\/fulfillment\/customer\/deliveries/)
  assert.match(apiSrc, /\/sales\/orders\/me/)
  assert.match(apiSrc, /\/sales\/quotations\/me/)
  const debtApiSrc = readFileSync(
    new URL('../src/features/finance/api/customerDebtApi.ts', import.meta.url),
    'utf8',
  )
  assert.match(debtApiSrc, /\/customer\/debts/)
})

test('StorefrontQuickAccessStrip hiển thị đầy đủ lối tắt theo dõi đơn, giao hàng, công nợ và báo giá cho khách đã đăng nhập', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(StorefrontQuickAccessStrip, {
        isAuthenticated: true,
        username: 'khach_hang',
        totalCartItems: 0,
        cartSubtotal: 0,
      }),
    ),
  )

  assert.match(html, /\/profile\?tab=orders/)
  assert.match(html, /\/profile\?tab=deliveries/)
  assert.match(html, /\/profile\?tab=debt/)
  assert.match(html, /\/profile\?tab=quotations/)
})
