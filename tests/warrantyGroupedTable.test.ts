import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { register } from 'node:module'
import type { WarrantyRecordListItem } from '../src/features/servicedesk/types/warranty.types.ts'

register('./loader.mjs', import.meta.url)

const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { WarrantyGroupedOrderTable } = await import(
  '../src/features/servicedesk/components/WarrantyGroupedOrderTable.tsx'
)
const { groupWarrantyRecordsByOrder } = await import(
  '../src/features/servicedesk/utils/warrantyGrouping.ts'
)

function makeRecord(overrides: Partial<WarrantyRecordListItem>): WarrantyRecordListItem {
  return {
    warrantyRecordId: 'wr-default',
    warrantyCode: 'WAR-202611-0001',
    variantId: 'var-1',
    sku: 'TOTO-CS886-B',
    productName: 'Bồn cầu thông minh TOTO CS886 305mm (TOTO smart toilet)',
    variantName: 'Trắng',
    serialNumber: null,
    customerId: 'cust-1',
    customerName: 'Nguyễn Văn A',
    phoneNumber: '0901234567',
    orderId: 'ord-1',
    orderCode: 'ORD-202611-001',
    startDate: '2026-11-10',
    endDate: '2028-11-10',
    remainingDays: 700,
    warrantyMonths: 24,
    status: 'ACTIVE',
    displayStatus: 'ACTIVE',
    canRequestSupport: true,
    openTicketCode: null,
    createdAt: '2026-11-10T10:00:00Z',
    ...overrides,
  }
}

test('groupWarrantyRecordsByOrder gom đúng thẻ theo đơn hàng và tách riêng thẻ cấp lẻ Ad-hoc', () => {
  const items: WarrantyRecordListItem[] = [
    makeRecord({
      warrantyRecordId: 'wr-1',
      warrantyCode: 'WAR-202611-0001',
      orderId: 'ord-1',
      orderCode: 'ORD-202611-001',
      productName: 'Vòi chậu lavabo gật gù nóng lạnh TOTO TLG04307V',
      displayStatus: 'ACTIVE',
    }),
    makeRecord({
      warrantyRecordId: 'wr-2',
      warrantyCode: 'WAR-202611-0002',
      orderId: 'ord-1',
      orderCode: 'ORD-202611-001',
      productName: 'Bồn cầu thông minh TOTO Neorest AH',
      displayStatus: 'CLAIMED',
    }),
    makeRecord({
      warrantyRecordId: 'wr-3',
      warrantyCode: 'WAR-202611-0003',
      orderId: null,
      orderCode: null,
      productName: 'Hệ thống sen tắm Grohe Euphoria',
    }),
    makeRecord({
      warrantyRecordId: 'wr-4',
      warrantyCode: 'WAR-202611-0004',
      orderId: null,
      orderCode: null,
      productName: 'Bồn cầu TOTO khác',
    }),
  ]

  const groups = groupWarrantyRecordsByOrder(items)

  assert.equal(groups.length, 3)
  assert.equal(groups[0].orderCode, 'ORD-202611-001')
  assert.equal(groups[0].isAdHoc, false)
  assert.equal(groups[0].records.length, 2)
  assert.equal(groups[0].statusCounts.ACTIVE, 1)
  assert.equal(groups[0].statusCounts.CLAIMED, 1)

  assert.equal(groups[1].isAdHoc, true)
  assert.equal(groups[1].records.length, 1)
  assert.equal(groups[2].isAdHoc, true)
  assert.equal(groups[2].records.length, 1)
})

test('WarrantyGroupedOrderTable chỉ xổ thẻ con khi groupKey nằm trong expandedKeys và không gây tràn chữ', () => {
  const items: WarrantyRecordListItem[] = [
    makeRecord({
      warrantyRecordId: 'wr-1',
      warrantyCode: 'WAR-202611-0001',
      serialNumber: 'SN-AQUA-DEV-0001',
      productName: 'Vòi chậu lavabo gật gù nóng lạnh TOTO TLG04307V',
    }),
    makeRecord({
      warrantyRecordId: 'wr-2',
      warrantyCode: 'WAR-202611-0002',
      serialNumber: 'SN-AQUA-DEV-0002',
      productName: 'Bồn cầu thông minh TOTO CS886 305mm (TOTO smart toilet)',
    }),
  ]
  const groups = groupWarrantyRecordsByOrder(items)

  const collapsedHtml = renderToStaticMarkup(
    React.createElement(WarrantyGroupedOrderTable, {
      groups,
      expandedKeys: new Set<string>(),
      onToggleGroup: () => {},
      customerScope: false,
      canVoid: true,
      onViewDetail: () => {},
      onClaim: () => {},
      onVoid: () => {},
      emptyMessage: 'Trống',
    }),
  )
  assert.match(collapsedHtml, /ORD-202611-001/)
  assert.match(collapsedHtml, /2 thẻ bảo hành/)
  assert.doesNotMatch(collapsedHtml, /SN-AQUA-DEV-0001/)

  const expandedHtml = renderToStaticMarkup(
    React.createElement(WarrantyGroupedOrderTable, {
      groups,
      expandedKeys: new Set<string>([groups[0].groupKey]),
      onToggleGroup: () => {},
      customerScope: false,
      canVoid: true,
      onViewDetail: () => {},
      onClaim: () => {},
      onVoid: () => {},
      emptyMessage: 'Trống',
    }),
  )
  assert.match(expandedHtml, /WAR-202611-0001/)
  assert.match(expandedHtml, /WAR-202611-0002/)
  assert.match(expandedHtml, /SN-AQUA-DEV-0001/)
  assert.match(expandedHtml, /SN-AQUA-DEV-0002/)
  assert.match(expandedHtml, /whitespace-normal break-words/)
})

test('WarrantyRecordsPage không còn cellClassName max-w-[240px] whitespace-normal đè lên nowrap và ProfileWarrantySection gọi endpoint khách hàng', () => {
  const pageSource = readFileSync(
    new URL('../src/pages/management/WarrantyRecordsPage.tsx', import.meta.url),
    'utf8',
  )
  assert.equal(pageSource.includes("cellClassName: 'max-w-[240px] whitespace-normal'"), false)
  assert.ok(pageSource.includes('WarrantyGroupedOrderTable'))

  const profileSectionSource = readFileSync(
    new URL('../src/features/customer/components/ProfileWarrantySection.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(profileSectionSource.includes('useGetMyWarrantyRecordsQuery'))
  assert.equal(profileSectionSource.includes('useGetWarrantyRecordsQuery'), false)
})
