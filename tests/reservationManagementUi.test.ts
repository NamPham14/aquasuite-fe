import assert from 'node:assert/strict'
import { test } from 'node:test'
import { register } from 'node:module'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { authReducer, setCredentials } from '../src/features/iam/model/authSlice.ts'
register('./loader.mjs', import.meta.url)
const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { Provider } = await import('react-redux')
const { ReservationHistoryPanel } = await import('../src/features/sales/components/ReservationHistoryPanel.tsx')
const { reservationManagementApi: api } = await import('../src/features/sales/api/reservationManagementApi.ts')

test('UC36 read roles see history, only owner executes pending releases, completed never executes', async () => {
  for (const role of ['SHOP_OWNER', 'SALES_STAFF', 'ACCOUNTANT', 'ADMIN', 'SUPER_ADMIN', 'SHIPPER', 'CUSTOMER']) {
    const store = configureStore({ reducer: { api: baseApi.reducer, auth: authReducer }, middleware: (defaults) => defaults().concat(baseApi.middleware) })
    store.dispatch(setCredentials({ user: { id: 'actor', username: 'actor', email: 'actor@example.com', roles: [role] }, accessToken: 'test', generation: store.getState().auth.sessionGeneration }))
    try {
      for (const releaseStatus of ['PENDING_RELEASE', 'COMPLETED'] as const) {
        await store.dispatch(api.util.upsertQueryData('reservationHistory', 'order', { orderId: 'order', reservations: [], activities: [], decisions: [{ decisionId: 'decision', type: 'FULL_CANCELLATION', status: 'APPROVED', requestedBy: 'sales', requestedAt: '2026-11-09T00:00:00Z', reason: 'customer request', reviewedBy: 'owner', reviewedAt: '2026-11-09T00:00:00Z', decisionNote: null, releaseStatus, release: null }] }))
        const html = renderToStaticMarkup(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(ReservationHistoryPanel, { orderId: 'order' })))
        assert.equal(html.includes('Thực hiện giải phóng</button>'), role === 'SHOP_OWNER' && releaseStatus === 'PENDING_RELEASE')
        assert.equal(html.includes('Lịch sử &amp; giải phóng hàng giữ'), !['SHIPPER', 'CUSTOMER'].includes(role))
      }
    } finally { store.dispatch(baseApi.util.resetApiState()) }
  }
})

test('history displays each real actor name instead of IDs or the current viewer', async () => {
  const store = configureStore({ reducer: { api: baseApi.reducer, auth: authReducer }, middleware: (defaults) => defaults().concat(baseApi.middleware) })
  store.dispatch(setCredentials({ user: { id: 'viewer-id', username: 'Current viewer', email: 'viewer@example.com', roles: ['SALES_STAFF'] }, accessToken: 'test', generation: store.getState().auth.sessionGeneration }))
  try {
    await store.dispatch(api.util.upsertQueryData('reservationHistory', 'order', {
      orderId: 'order', reservations: [],
      actorNames: { 'creator-id': 'Nguyễn Văn Tạo', 'reviewer-id': 'Trần Thị Duyệt', 'executor-id': 'Lê Văn Nhận' },
      activities: [{ requestId: 'request', reservationId: 'reservation', action: 'RESERVE', heldBefore: 0, heldAfter: 2, actorId: 'creator-id', reason: null, createdAt: '2026-11-10T00:00:00Z' }],
      decisions: [{ decisionId: 'decision', type: 'FULL_CANCELLATION', status: 'APPROVED', requestedBy: 'creator-id', requestedAt: '2026-11-10T00:00:00Z', reason: null, reviewedBy: 'reviewer-id', reviewedAt: '2026-11-10T01:00:00Z', decisionNote: null, releaseStatus: 'COMPLETED', release: { decisionId: 'decision', orderId: 'order', executedBy: 'executor-id', executedAt: '2026-11-10T02:00:00Z', lines: [] } }],
    }))
    const html = renderToStaticMarkup(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(ReservationHistoryPanel, { orderId: 'order' })))
    for (const name of ['Nguyễn Văn Tạo', 'Trần Thị Duyệt', 'Lê Văn Nhận']) assert.ok(html.includes(name))
    for (const value of ['creator-id', 'reviewer-id', 'executor-id', 'Current viewer']) assert.ok(!html.includes(value))
    await store.dispatch(api.util.upsertQueryData('reservationHistory', 'order', { orderId: 'order', reservations: [], decisions: [], activities: [{ requestId: 'request', reservationId: 'reservation', action: 'RESERVE', heldBefore: 0, heldAfter: 2, actorId: 'deleted-user-id', reason: null, createdAt: '2026-11-10T00:00:00Z' }] }))
    const fallback = renderToStaticMarkup(React.createElement(Provider, { store } as React.ComponentProps<typeof Provider>, React.createElement(ReservationHistoryPanel, { orderId: 'order' })))
    assert.ok(fallback.includes('Chưa có tên người dùng'))
    assert.ok(!fallback.includes('deleted-user-id'))
  } finally { store.dispatch(baseApi.util.resetApiState()) }
})
