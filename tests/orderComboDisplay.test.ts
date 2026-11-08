import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { JSDOM } from 'jsdom'
import type { SalesOrderDisplayItemResponse } from '../src/features/sales/types/salesOrder.types.ts'
register('./loader.mjs', import.meta.url)
const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { OrderComboRow } = await import('../src/features/sales/components/OrderComboRow.tsx')
const row: SalesOrderDisplayItemResponse = {
  itemType: 'COMBO', comboId: 'combo', productName: 'Combo phòng tắm', quantity: 2,
  sku: 'COMBO-001', unitPrice: 40000000, discountAmount: 10000000,
  lineTotal: 70000000, item: null, components: [{
    orderItemId: 'item', orderId: 'order', variantId: 'sku', comboId: 'combo', sku: 'SKU-1',
    productName: 'Combo phòng tắm', variantName: 'Bồn cầu', quantity: 6,
    unitPrice: 15000000, discountAmount: 20000000, lineTotal: 70000000,
  }],
}

test('combo displays purchased sets separately from collapsed component quantities', () => {
  const markup = renderToStaticMarkup(React.createElement(OrderComboRow, { row, formatMoney: String }))
  const dom = new JSDOM(`<table><tbody>${markup}</tbody></table>`)
  const cells = dom.window.document.querySelectorAll('td')
  assert.equal(cells.length, 6)
  assert.equal(cells[1].textContent, 'COMBO-001')
  assert.equal(cells[2].textContent, '40000000')
  assert.equal(cells[4].textContent, '10000000')
  assert.equal(cells[3].textContent?.trim(), '2 bộ')
  assert.equal(cells[5].textContent, '70000000')
  const details = dom.window.document.querySelector('details')!
  assert.equal(details.open, false)
  assert.match(details.textContent!, /Bồn cầu/)
  assert.match(details.textContent!, /SL: 6/)
  assert.equal(dom.window.document.querySelectorAll('tr').length, 1)
  dom.window.close()
})

test('unknown historical set count is shown explicitly instead of guessing', () => {
  const markup = renderToStaticMarkup(React.createElement(OrderComboRow, {
    row: { ...row, quantity: null }, formatMoney: String,
  }))
  assert.match(markup, /Chưa rõ số bộ/)
})
