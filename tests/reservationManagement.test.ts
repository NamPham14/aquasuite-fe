import assert from 'node:assert/strict'
import { test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { reservationManagementApi as api } from '../src/features/sales/api/reservationManagementApi.ts'

test('UC36 retries same decision without client quantity/body; history denial propagates', async () => {
  const original = globalThis.fetch
  const store = configureStore({ reducer: { [baseApi.reducerPath]: baseApi.reducer }, middleware: (defaults) => defaults().concat(baseApi.middleware) })
  const requests: Request[] = []
  const result = { decisionId: 'decision', orderId: 'order', executedBy: 'owner', executedAt: '2026-11-09T00:00:00Z', lines: [] }
  try {
    globalThis.fetch = async (input, init) => {
      requests.push(new Request(input, init))
      return requests.length === 1 ? Response.json({ message: 'uncertain' }, { status: 500 }) : Response.json({ success: true, data: result })
    }
    await assert.rejects(store.dispatch(api.endpoints.executeReservationRelease.initiate({ orderId: 'order', decisionId: 'decision' })).unwrap())
    assert.deepEqual(await store.dispatch(api.endpoints.executeReservationRelease.initiate({ orderId: 'order', decisionId: 'decision' })).unwrap(), result)
    assert.equal(requests[0]!.url, requests[1]!.url)
    for (const request of requests) {
      assert.match(request.url, /\/sales\/orders\/order\/stock-reservations\/releases\/decision$/)
      assert.equal(request.method, 'POST')
      assert.equal(await request.text(), '')
    }
    globalThis.fetch = async (input, init) => {
      const request = new Request(input, init)
      assert.match(request.url, /\/stock-reservations\/history$/)
      assert.equal(request.method, 'GET')
      return Response.json({ code: 'AUTH_002', message: 'denied' }, { status: 403 })
    }
    await assert.rejects(store.dispatch(api.endpoints.reservationHistory.initiate('order')).unwrap(), (error: unknown) => (error as { status: number }).status === 403)
  } finally { globalThis.fetch = original; store.dispatch(baseApi.util.resetApiState()) }
})
