import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, test } from 'node:test'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { profileApi } from '../src/features/customer/api/profileApi.ts'
import { onlineCheckoutApi } from '../src/features/sales/api/onlineCheckoutApi.ts'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

function createStore() {
  return configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  })
}

test('profileApi and onlineCheckoutApi call expected REST endpoints for customer profile CRUD and order history', async () => {
  const requests: Array<{ url: string; method: string }> = []

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : new Request(input, init)
    requests.push({ url: req.url, method: req.method })

    if (req.url.endsWith('/profile/addresses') && req.method === 'GET') {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (req.url.endsWith('/sales/online-orders') && req.method === 'GET') {
      return new Response(
        JSON.stringify({
          success: true,
          data: [
            {
              orderId: 'ord-1',
              orderCode: 'SO-20261118-0001',
              customerId: 'cust-1',
              orderStatus: 'PENDING_CONFIRMATION',
              paymentStatus: 'UNPAID',
              paymentMethod: 'BANK_TRANSFER',
              subtotal: 4000,
              shippingFee: 0,
              totalAmount: 4000,
              deliveryAddress: '123 Lê Lợi',
              createdAt: '2026-11-18T14:00:00Z',
              items: [],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: 'u-1',
          username: 'customer_test',
          fullName: 'Nguyễn Văn A',
          email: 'customer@aquasuite.com',
          phone: '0987654321',
          roles: ['CUSTOMER'],
          deliveryAddresses: [],
          message: 'OK',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const store = createStore()

  await store.dispatch(profileApi.endpoints.getMyProfile.initiate()).unwrap()
  await store
    .dispatch(
      profileApi.endpoints.updateMyProfile.initiate({
        fullName: 'Nguyễn Văn A',
        phone: '0987654321',
      }),
    )
    .unwrap()
  await store
    .dispatch(
      profileApi.endpoints.changeMyPassword.initiate({
        currentPassword: 'Password123!',
        newPassword: 'Password456!',
        confirmNewPassword: 'Password456!',
      }),
    )
    .unwrap()
  await store
    .dispatch(
      profileApi.endpoints.createDeliveryAddress.initiate({
        recipientName: 'Nguyễn Văn A',
        phone: '0987654321',
        province: 'TP. Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Phường Bến Nghé',
        streetAddress: '123 Đường Lê Lợi',
        isDefault: true,
      }),
    )
    .unwrap()
  await store.dispatch(profileApi.endpoints.setDefaultDeliveryAddress.initiate('addr-1')).unwrap()
  await store.dispatch(profileApi.endpoints.deleteDeliveryAddress.initiate('addr-1')).unwrap()
  const orders = await store.dispatch(onlineCheckoutApi.endpoints.getMyOnlineOrders.initiate()).unwrap()

  assert.equal(orders.length, 1)
  assert.equal(orders[0].orderCode, 'SO-20261118-0001')

  assert.ok(requests.some((r) => r.url.endsWith('/profile') && r.method === 'GET'))
  assert.ok(requests.some((r) => r.url.endsWith('/profile') && r.method === 'PUT'))
  assert.ok(requests.some((r) => r.url.endsWith('/iam/password/change') && r.method === 'POST'))
  assert.ok(requests.some((r) => r.url.endsWith('/profile/addresses') && r.method === 'POST'))
  assert.ok(requests.some((r) => r.url.endsWith('/profile/addresses/addr-1/default') && r.method === 'PATCH'))
  assert.ok(requests.some((r) => r.url.endsWith('/profile/addresses/addr-1') && r.method === 'DELETE'))
  assert.ok(requests.some((r) => r.url.endsWith('/sales/online-orders') && r.method === 'GET'))
})

test('CustomerProfilePage renders all 5 management sections for customer account CRUD', () => {
  const source = readFileSync(
    new URL('../src/pages/customer/CustomerProfilePage.tsx', import.meta.url),
    'utf8',
  )
  assert.ok(source.includes('Thông tin & SĐT'))
  assert.ok(source.includes('Đổi mật khẩu'))
  assert.ok(source.includes('Sổ địa chỉ'))
  assert.ok(source.includes('Lịch sử đơn hàng'))
  assert.ok(source.includes('Bảo hành & Hỗ trợ'))
})

