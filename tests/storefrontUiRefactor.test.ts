import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { register } from 'node:module'
import type { CatalogItemOption } from '../src/features/sales/data/catalogProducts.data.ts'

register('./loader.mjs', import.meta.url)

const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { MemoryRouter } = await import('react-router-dom')
const { StorefrontHeroBanner } = await import(
  '../src/features/sales/components/StorefrontHeroBanner.tsx'
)
const { StorefrontQuickAccessStrip } = await import(
  '../src/features/sales/components/StorefrontQuickAccessStrip.tsx'
)
const { StorefrontProductCard } = await import(
  '../src/features/sales/components/StorefrontProductCard.tsx'
)

function makeItem(overrides: Partial<CatalogItemOption> = {}): CatalogItemOption {
  return {
    variantId: 'var-001',
    sku: 'TOTO-MS885',
    name: 'Bồn cầu 1 khối nắp đóng êm CeFiONtect',
    brand: 'TOTO',
    category: 'Bồn cầu',
    sellingPrice: 9450000,
    availableStock: 12,
    unit: 'bộ',
    isCombo: false,
    ...overrides,
  }
}

test('StorefrontHeroBanner dùng ảnh showroom thực tế, tiêu đề editorial và không dùng hiệu ứng glow/ping', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(StorefrontHeroBanner, {
        searchTerm: '',
        onSearchChange: () => {},
        onSelectQuickKeyword: () => {},
        totalCatalogCount: 24,
        featuredItems: [makeItem(), makeItem({ variantId: 'var-002', sku: 'INAX-AC1052' })],
      }),
    ),
  )

  assert.match(html, /\/images\/hero-sanctuary\.jpg/)
  assert.match(html, /Nghệ thuật của nước/)
  assert.match(html, /Tạm dừng chuyển sản phẩm tiêu điểm/)
  assert.doesNotMatch(html, /animate-ping|blur-3xl/)
  assert.equal(existsSync(path.resolve(process.cwd(), 'public/images/hero-sanctuary.jpg')), true)
  assert.equal(existsSync(path.resolve(process.cwd(), 'public/images/collection-ceramic.jpg')), true)
})

test('StorefrontQuickAccessStrip trình bày 3 khối không gian lookbook không dùng box sặc sỡ', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(StorefrontQuickAccessStrip, {
        isAuthenticated: true,
        username: 'khach_hang',
        totalCartItems: 2,
        cartSubtotal: 18900000,
        totalCatalogCount: 24,
        comboCount: 3,
      }),
    ),
  )

  assert.match(html, /Phân khu Thiết bị &amp; Dịch vụ Khách hàng/)
  assert.match(html, /\/images\/collection-ceramic\.jpg/)
  assert.match(html, /Men sứ kháng khuẩn &amp; Chậu đặt bàn/)
  assert.match(html, /Giỏ hàng hiện có/)
  assert.doesNotMatch(html, /aqua-shine-btn/)
})

test('StorefrontProductCard dùng kiểu gallery tối giản, không viền hộp nhựa và giữ link /products/', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(StorefrontProductCard, {
        item: makeItem(),
        quantityInCart: 1,
        isAdding: false,
        onAddToCart: async () => true,
      }),
    ),
  )

  assert.match(html, /\/products\/var-001/)
  assert.match(html, /Trong giỏ: 1/)
  assert.match(html, /Thêm nhanh vào giỏ/)
  assert.doesNotMatch(html, /animate-ping|rounded-2xl|aqua-shine-btn/)
})

test('CustomerHomePage sử dụng useDeferredValue và fonts biên tập Playfair Display + Inter', () => {
  const homeSource = readFileSync(
    new URL('../src/pages/sales/CustomerHomePage.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(homeSource.includes('useDeferredValue'))
  assert.ok(homeSource.includes('font-editorial'))
  assert.equal(homeSource.includes('blur-3xl'), false)

  const htmlSource = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  assert.ok(htmlSource.includes('Playfair+Display'))
})
