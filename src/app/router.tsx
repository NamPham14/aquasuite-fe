import { createBrowserRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AuthLayout, ManagementLayout } from '../layouts'
import { LoginPage } from '../pages/auth/LoginPage'
import { DashboardPage } from '../pages/management/DashboardPage'
import { ProductsPage } from '../pages/management/ProductsPage'
import { ProductVariantsPage } from '../pages/management/ProductVariantsPage'
import { CategoriesPage } from '../pages/management/CategoriesPage'
import { BrandsPage } from '../pages/management/BrandsPage'
import { InventoryPage } from '../pages/management/InventoryPage'
import { SystemInfoPage } from '../pages/management/SystemInfoPage'
import { RolesPage } from '../pages/management/RolesPage'
import { PermissionsPage } from '../pages/management/PermissionsPage'
import { UsersPage } from '../pages/management/UsersPage'
import { CustomerDebtsPage } from '../pages/management/CustomerDebtsPage'
import { CreditProfileApprovalsPage } from '../pages/management/CreditProfileApprovalsPage'
import { PaymentVerificationsPage } from '../pages/management/PaymentVerificationsPage'
import { QuotationsPage } from '../pages/management/QuotationsPage'
import { QuotationCreatePage } from '../pages/management/QuotationCreatePage'
import { QuotationEditPage } from '../pages/management/QuotationEditPage'
import { QuotationDetailPage } from '../pages/management/QuotationDetailPage'
import { OrdersPage } from '../pages/management/OrdersPage'
import { POSOrderCreatePage } from '../pages/management/POSOrderCreatePage'
import { OrderDetailPage } from '../pages/management/OrderDetailPage'
import { PurchaseOrdersPage } from '../pages/management/PurchaseOrdersPage'
import { PurchaseOrderCreatePage } from '../pages/management/PurchaseOrderCreatePage'
import { PurchaseOrderEditPage } from '../pages/management/PurchaseOrderEditPage'
import { PurchaseOrderDetailPage } from '../pages/management/PurchaseOrderDetailPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProtectedRoute } from '../features/iam/components/ProtectedRoute'
import { PublicOnlyRoute } from '../features/iam/components/PublicOnlyRoute'

export const routeConfig: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/app/dashboard" replace />,
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: <LoginPage />,
          },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: '/app',
        element: <ManagementLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/app/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'products',
            element: <ProductsPage />,
          },
          {
            path: 'products/:productId/variants',
            element: <ProductVariantsPage />,
          },
          {
            path: 'categories',
            element: <CategoriesPage />,
          },
          {
            path: 'brands',
            element: <BrandsPage />,
          },
          {
            path: 'inventory',
            element: <InventoryPage />,
          },
          {
            path: 'quotations',
            element: <QuotationsPage />,
          },
          {
            path: 'quotations/new',
            element: <QuotationCreatePage />,
          },
          {
            path: 'quotations/:id',
            element: <QuotationDetailPage />,
          },
          {
            path: 'quotations/:id/edit',
            element: <QuotationEditPage />,
          },
          {
            path: 'purchase-orders',
            element: <PurchaseOrdersPage />,
          },
          {
            path: 'purchase-orders/new',
            element: <PurchaseOrderCreatePage />,
          },
          {
            path: 'purchase-orders/:id',
            element: <PurchaseOrderDetailPage />,
          },
          {
            path: 'purchase-orders/:id/edit',
            element: <PurchaseOrderEditPage />,
          },
          {
            path: 'orders',
            element: <OrdersPage />,
          },
          {
            path: 'orders/pos',
            element: <POSOrderCreatePage />,
          },
          {
            path: 'orders/:id',
            element: <OrderDetailPage />,
          },
          {
            path: 'system-info',
            element: <SystemInfoPage />,
          },
          { path: 'roles', element: <RolesPage /> },
          { path: 'permissions', element: <PermissionsPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'customer-debts', element: <CustomerDebtsPage /> },
          { path: 'customer-debts/credit-approvals', element: <CreditProfileApprovalsPage /> },
          { path: 'payment-verifications', element: <PaymentVerificationsPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]

export function createAppMemoryRouter(initialEntries: string[] = ['/']) {
  return createMemoryRouter(routeConfig, { initialEntries })
}

export const router =
  typeof document !== 'undefined'
    ? createBrowserRouter(routeConfig)
    : (createMemoryRouter(routeConfig) as unknown as ReturnType<typeof createBrowserRouter>)
