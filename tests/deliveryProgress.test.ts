import assert from 'node:assert/strict'
import test from 'node:test'
import { register } from 'node:module'
import type { DeliveryDetail, DeliveryStatus } from '../src/features/fulfillment/types/delivery.types.ts'
register('./loader.mjs', import.meta.url)
const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { DeliveryProgress } = await import('../src/features/fulfillment/components/DeliveryProgress.tsx')

function detail(status: DeliveryStatus): DeliveryDetail {
  return { delivery: { deliveryStatus: status, confirmedAt: '2026-11-13T08:50:00+07:00', assignedAt: '2026-11-13T09:00:00+07:00', startedAt: '2026-11-13T13:10:00+07:00', deliveredAt: status === 'DELIVERED' ? '2026-11-13T14:35:00+07:00' : null, scheduledDate: null, updatedAt: '2099-01-01T00:00:00Z' }, shipperName: 'Nguyễn Văn A', items: [], photos: [] } as DeliveryDetail
}
test('timeline uses real milestones and current step, not updatedAt as event time', () => {
  const html = renderToStaticMarkup(React.createElement(DeliveryProgress, { detail: detail('IN_TRANSIT') }))
  assert.match(html, /Theo dõi tiến độ/)
  assert.match(html, /Phân công Nguyễn Văn A/)
  assert.match(html, /dateTime="2026-11-13T13:10:00\+07:00"/)
  assert.match(html, /aria-current="step"/)
  assert.match(html, /Chưa ghi nhận thời điểm/)
  assert.doesNotMatch(html, /2099|Tạo nháp/)
})
test('rescheduled and terminal states do not claim the success milestone as current', () => {
  for (const [status, label] of [['RESCHEDULED', 'Đang chờ giao lại'], ['FAILED', 'Giao thất bại'], ['CANCELLED', 'Phiếu đã hủy']] as const) {
    const html = renderToStaticMarkup(React.createElement(DeliveryProgress, { detail: detail(status) }))
    assert.ok(html.includes(label)); assert.doesNotMatch(html, /aria-current="step"/)
  }
  const html = renderToStaticMarkup(React.createElement(DeliveryProgress, { detail: detail('DELIVERED') }))
  assert.match(html, /dateTime="2026-11-13T14:35:00\+07:00"/)
})
