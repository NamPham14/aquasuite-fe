import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { register } from 'node:module'
import { configureStore } from '@reduxjs/toolkit'
import { baseApi } from '../src/shared/api/baseApi.ts'
import { authReducer, setCredentials } from '../src/features/iam/model/authSlice.ts'

register('./loader.mjs', import.meta.url)

const React = await import('react')
const { renderToStaticMarkup } = await import('react-dom/server')
const { Provider } = await import('react-redux')
const { MemoryRouter } = await import('react-router-dom')
const { AuthLayout } = await import('../src/layouts/AuthLayout.tsx')
const { LoginPage } = await import('../src/pages/auth/LoginPage.tsx')
const { CustomerRegisterPage } = await import('../src/pages/auth/CustomerRegisterPage.tsx')
const { ManagementLayout } = await import('../src/layouts/ManagementLayout.tsx')
const { DashboardPage } = await import('../src/pages/management/DashboardPage.tsx')
const { DeliveryList } = await import('../src/features/fulfillment/components/DeliveryList.tsx')

function createStore(roles: string[] = ['SHOP_OWNER']) {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (g) => g().concat(baseApi.middleware),
  })
  store.dispatch(
    setCredentials({
      user: { id: 'usr-1', username: 'owner_test', email: 'owner@aquasuite.vn', roles },
      accessToken: 'tok-test',
      generation: store.getState().auth.sessionGeneration,
    }),
  )
  return store
}

test('AuthLayout và LoginPage dùng phong cách Architectural Quiet-Luxury Showroom, không còn gradient template hay chữ thủy sinh', () => {
  const authHtml = renderToStaticMarkup(
    React.createElement(MemoryRouter, null, React.createElement(AuthLayout)),
  )
  assert.match(authHtml, /\/images\/hero-sanctuary\.jpg/)
  assert.match(authHtml, /Showroom Thiết bị Vệ sinh/)
  assert.match(authHtml, /href="\/storefront"/)
  assert.doesNotMatch(authHtml, /from-blue-50|to-indigo-100|kỹ thuật thủy sinh/)

  const store = createStore(['CUSTOMER'])
  const loginHtml = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store } as React.ComponentProps<typeof Provider>,
      React.createElement(MemoryRouter, null, React.createElement(LoginPage)),
    ),
  )
  assert.match(loginHtml, /Đăng nhập tài khoản/)
  assert.match(loginHtml, /aria-label="Hiện mật khẩu"/)
  assert.match(loginHtml, /bg-\[#171614\]/)
  assert.doesNotMatch(loginHtml, /bg-blue-600/)

  const registerHtml = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store } as React.ComponentProps<typeof Provider>,
      React.createElement(MemoryRouter, null, React.createElement(CustomerRegisterPage)),
    ),
  )
  assert.match(registerHtml, /Đăng ký khách hàng/)
  assert.doesNotMatch(registerHtml, /bg-blue-600/)
})

test('ManagementLayout có Skip link, logo mobile hiển thị rõ, nút Ctrl+K tìm nhanh và không có nền đen lệch tông ở mobile drawer', () => {
  const store = createStore(['SHOP_OWNER'])
  const html = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store } as React.ComponentProps<typeof Provider>,
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/app/dashboard'] },
        React.createElement(ManagementLayout),
      ),
    ),
  )
  assert.match(html, /href="#main-content"/)
  assert.match(html, /Tìm nhanh chức năng/)
  assert.match(html, /Ctrl\+K/)
  assert.match(html, /Chủ cửa hàng/)
  assert.doesNotMatch(html, /bg-slate-900/)
})

test('DashboardPage hiển thị lối tắt nghiệp vụ nhanh phù hợp theo từng vai trò (SHOP_OWNER / SHIPPER / ACCOUNTANT)', () => {
  const shipperHtml = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store: createStore(['SHIPPER']) } as React.ComponentProps<typeof Provider>,
      React.createElement(MemoryRouter, null, React.createElement(DashboardPage)),
    ),
  )
  assert.match(shipperHtml, /Đơn giao của tôi/)
  assert.doesNotMatch(shipperHtml, /Tạo đơn tại quầy \(POS\)/)

  const accountantHtml = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store: createStore(['ACCOUNTANT']) } as React.ComponentProps<typeof Provider>,
      React.createElement(MemoryRouter, null, React.createElement(DashboardPage)),
    ),
  )
  assert.match(accountantHtml, /Xác minh thanh toán/)
  assert.match(accountantHtml, /Phân bổ tiền thu/)
})

test('DeliveryList dùng select chọn nhân viên giao nhận thay vì nhập UUID thô và không còn text dev hay window.confirm trên POS/Order', () => {
  const store = createStore(['ACCOUNTANT'])
  const deliveryHtml = renderToStaticMarkup(
    React.createElement(
      Provider,
      { store } as React.ComponentProps<typeof Provider>,
      React.createElement(MemoryRouter, null, React.createElement(DeliveryList)),
    ),
  )
  assert.match(deliveryHtml, /Nhân viên giao nhận/)
  assert.match(deliveryHtml, /Tất cả shipper/)
  assert.doesNotMatch(deliveryHtml, /Shipper \(UUID\)/)

  for (const relPath of [
    '../src/pages/management/POSOrderCreatePage.tsx',
    '../src/features/sales/components/POSPaymentMethodCard.tsx',
    '../src/features/sales/components/POSCustomerSection.tsx',
    '../src/pages/management/OrderDetailPage.tsx',
  ]) {
    const src = readFileSync(new URL(relPath, import.meta.url), 'utf8')
    assert.equal(src.includes('của Hào'), false, `${relPath} không được phép còn tên dev nội bộ`)
    assert.equal(src.includes('window.confirm'), false, `${relPath} phải dùng ManagementDialog thay cho window.confirm`)
  }
})
