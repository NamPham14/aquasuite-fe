import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeSalesCatalog } from '../src/features/sales/lib/salesCatalog.ts'

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
