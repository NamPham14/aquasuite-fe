import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import { test } from 'node:test'
import { normalizeSalesCatalog } from '../src/features/sales/lib/salesCatalog.ts'
import { parseComboComponents } from '../src/features/sales/lib/comboComponents.ts'
import type { CatalogItemOption } from '../src/features/sales/types/salesCatalog.types.ts'

register('./loader.mjs', import.meta.url)

const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { MemoryRouter } = await import('react-router-dom')
const { ComboComponentDetailModal, ComboComponentPickerModal } = await import(
  '../src/features/sales/components/ComboConfigurationModals.tsx'
)

test('sales combo keeps its order ID, price and components and supports missing brand', () => {
  const combo = { variantId: 'combo-id', sku: 'CB01', name: 'Combo', category: 'Combo', unit: 'Bộ', sellingPrice: 100, availableStock: 2, isCombo: true, brand: null, components: ['SKU x2'] }
  const [item] = normalizeSalesCatalog({ data: [combo] })
  assert.equal(item.variantId, combo.variantId)
  assert.equal(item.sellingPrice, 100)
  assert.deepEqual(item.components, ['SKU x2'])
  assert.equal(item.brand.toLowerCase(), 'aqua-combo')
  assert.deepEqual(normalizeSalesCatalog([]), [])
  assert.equal(normalizeSalesCatalog([{ ...combo, isCombo: false, brand: 'TOTO' }])[0].brand, 'TOTO')
})

test('parseComboComponents parses SKUs with inner parentheses and matches catalog items', () => {
  const catalog: CatalogItemOption[] = [
    {
      variantId: 'var-basin',
      sku: 'TOTO-LT4706-W',
      name: 'Chậu rửa TOTO LT4706 Trắng sứ',
      brand: 'TOTO',
      category: 'Chậu rửa',
      unit: 'Cái',
      sellingPrice: 3200000,
      availableStock: 0,
      isCombo: false,
      description: 'Men CeFiONtect',
      specifications: { warrantyTerms: 'Bảo hành 10 năm' },
    },
    {
      variantId: 'var-neorest',
      sku: 'TOTO-CS989VT',
      name: 'Bồn cầu thông minh TOTO Neorest AH (CS989VT/TCF9757SAT)',
      brand: 'TOTO',
      category: 'Bồn cầu',
      unit: 'Bộ',
      sellingPrice: 85500000,
      availableStock: 5,
      isCombo: false,
    },
  ]

  const parsed = parseComboComponents(
    [
      'Chậu rửa TOTO LT4706 Trắng sứ (TOTO-LT4706-W) x1',
      'Bồn cầu thông minh TOTO Neorest AH (CS989VT/TCF9757SAT) (TOTO-CS989VT) x2',
      'Phụ kiện không bán lẻ (HIDDEN-01) x3',
    ],
    catalog,
  )

  assert.equal(parsed.length, 3)
  assert.equal(parsed[0].sku, 'TOTO-LT4706-W')
  assert.equal(parsed[0].quantity, 1)
  assert.equal(parsed[0].catalogItem?.variantId, 'var-basin')

  assert.equal(parsed[1].sku, 'TOTO-CS989VT')
  assert.equal(parsed[1].quantity, 2)
  assert.equal(parsed[1].displayName, 'Bồn cầu thông minh TOTO Neorest AH (CS989VT/TCF9757SAT)')
  assert.equal(parsed[1].catalogItem?.variantId, 'var-neorest')

  assert.equal(parsed[2].sku, 'HIDDEN-01')
  assert.equal(parsed[2].quantity, 3)
  assert.equal(parsed[2].catalogItem, null)
})

test('ComboComponentDetailModal and ComboComponentPickerModal render details and keep out-of-stock components inspectable', () => {
  const catalog: CatalogItemOption[] = [
    {
      variantId: 'var-lt',
      sku: 'TOTO-LT4706-W',
      name: 'Chậu rửa TOTO LT4706 Trắng sứ',
      brand: 'TOTO',
      category: 'Thiết bị vệ sinh',
      unit: 'Cái',
      sellingPrice: 3200000,
      availableStock: 0,
      description: 'Chậu lavabo đặt bàn cao cấp TOTO',
      specifications: { glazeTechnology: 'CeFiONtect' },
    },
    {
      variantId: 'var-cs',
      sku: 'TOTO-CS886-B',
      name: 'Bồn cầu TOTO CS886 Đen nhám 305mm',
      brand: 'TOTO',
      category: 'Thiết bị vệ sinh',
      unit: 'Bộ',
      sellingPrice: 17500000,
      availableStock: 4,
    },
  ]

  const parsed = parseComboComponents(
    [
      'Chậu rửa TOTO LT4706 Trắng sứ (TOTO-LT4706-W) x1',
      'Bồn cầu TOTO CS886 Đen nhám 305mm (TOTO-CS886-B) x1',
    ],
    catalog,
  )

  const detailHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(ComboComponentDetailModal, {
        comboName: 'Combo Khách sạn 4 Sao',
        components: parsed,
        activeIndex: 0,
        quantitiesInCart: {},
        pendingVariantIds: {},
        onSelectIndex: () => {},
        onAddToCart: async () => true,
      }),
    ),
  )

  assert.match(detailHtml, /TOTO-LT4706-W/)
  assert.match(detailHtml, /CeFiONtect/)
  assert.match(detailHtml, /Tạm hết hàng/)

  const pickerHtml = renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(ComboComponentPickerModal, {
        isOpen: true,
        comboName: 'Combo Khách sạn 4 Sao',
        components: parsed,
        quantitiesInCart: {},
        pendingVariantIds: {},
        onClose: () => {},
        onInspectComponent: () => {},
        onAddToCart: async () => true,
      }),
    ),
  )

  assert.match(pickerHtml, /Chọn thiết bị/)
  assert.match(pickerHtml, /Xem chi tiết/)
  assert.match(pickerHtml, /Thêm 1 thiết bị vào giỏ/)

  const pdpSrc = readFileSync(new URL('../src/pages/sales/ProductDetailPage.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(pdpSrc, /Chọn thiết bị trong cấu hình/)
  assert.doesNotMatch(pdpSrc, /Mở giỏ hàng của tôi/)
  assert.match(pdpSrc, /onClick=\{\(\) => setActiveComponentIdx\(comp\.index\)\}/)
})
