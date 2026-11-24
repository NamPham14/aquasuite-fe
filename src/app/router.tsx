import { createBrowserRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AuthLayout, ManagementLayout, SalesLayout } from '../layouts'
import { LoginPage } from '../pages/auth/LoginPage'
import { CustomerLoginPage } from '../pages/auth/CustomerLoginPage'
import { CustomerRegisterPage } from '../pages/auth/CustomerRegisterPage'
import { CustomerProfilePage } from '../pages/customer/CustomerProfilePage'
import { CustomerHomePage } from '../pages/sales/CustomerHomePage'
import { ProductDetailPage } from '../pages/sales/ProductDetailPage'
import { CartPage } from '../pages/sales/CartPage'
import { CheckoutPage } from '../pages/sales/CheckoutPage'
import { CheckoutResultPage } from '../pages/sales/CheckoutResultPage'
import { DashboardPage } from '../pages/management/DashboardPage'
import { ProductsPage } from '../pages/management/ProductsPage'
import { ProductVariantsPage } from '../pages/management/ProductVariantsPage'
import { CategoriesPage } from '../pages/management/CategoriesPage'
import { BrandsPage } from '../pages/management/BrandsPage'
import { CombosPage } from '../pages/management/CombosPage'
import { DepositsPage } from '../pages/management/DepositsPage'
import { InventoryPage } from '../pages/management/InventoryPage'
import { WarrantyTicketsPage } from '../pages/management/WarrantyTicketsPage'
import { SystemInfoPage } from '../pages/management/SystemInfoPage'
import { RolesPage } from '../pages/management/RolesPage'
import { PermissionsPage } from '../pages/management/PermissionsPage'
import { UsersPage } from '../pages/management/UsersPage'
import { CustomerDebtsPage } from '../pages/management/CustomerDebtsPage'
import { CustomerDebtDetailPage } from '../features/finance'
import { CreditProfileApprovalsPage } from '../pages/management/CreditProfileApprovalsPage'
import { PaymentVerificationsPage } from '../pages/management/PaymentVerificationsPage'
import { PaymentAllocationsPage } from '../pages/management/PaymentAllocationsPage'
import { CodCollectionsPage } from '../pages/management/CodCollectionsPage'
import { WarrantyPoliciesPage } from '../pages/management/WarrantyPoliciesPage'
import { QuotationsPage } from '../pages/management/QuotationsPage'
import { QuotationCreatePage } from '../pages/management/QuotationCreatePage'
import { QuotationEditPage } from '../pages/management/QuotationEditPage'
import { QuotationDetailPage } from '../pages/management/QuotationDetailPage'
import { OrdersPage } from '../pages/management/OrdersPage'
import { POSOrderCreatePage } from '../pages/management/POSOrderCreatePage'
import { OrderDetailPage } from '../pages/management/OrderDetailPage'
import { OrderModificationRequestsPage } from '../pages/management/OrderModificationRequestsPage'
import { PurchaseOrdersPage } from '../pages/management/PurchaseOrdersPage'
import { PurchaseOrderCreatePage } from '../pages/management/PurchaseOrderCreatePage'
import { PurchaseOrderEditPage } from '../pages/management/PurchaseOrderEditPage'
import { PurchaseOrderDetailPage } from '../pages/management/PurchaseOrderDetailPage'
import { WarrantyRecordsPage } from '../pages/management/WarrantyRecordsPage'
import { WarrantyRecordDetailPage } from '../pages/management/WarrantyRecordDetailPage'
import { MyWarrantyTicketsPage } from '../pages/customer/MyWarrantyTicketsPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { DeliveriesPage, MyDeliveriesPage, IssueNotesPage } from '../pages/management/DeliveriesPage'
import { DeliveryDetailPage } from '../pages/management/DeliveryDetailPage'
import { ProtectedRoute } from '../features/iam/components/ProtectedRoute'
import { PublicOnlyRoute } from '../features/iam/components/PublicOnlyRoute'

export const routeConfig: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/app/dashboard" replace />,
  },
  {
    element: <SalesLayout />,
    children: [
      {
        path: '/storefront',
        element: <CustomerHomePage />,
      },
      {
        path: '/home',
        element: <Navigate to="/storefront" replace />,
      },
      {
        path: '/products/:variantId',
        element: <ProductDetailPage />,
      },
      {
        path: '/cart',
        element: <CartPage />,
      },
      {
        path: '/checkout',
        element: <CheckoutPage />,
      },
      {
        path: '/checkout/result',
        element: <CheckoutResultPage />,
      },
    ],
  },
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login-customer', element: <CustomerLoginPage /> },
          { path: '/register-customer', element: <CustomerRegisterPage /> },
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
        element: <SalesLayout />,
        children: [
          { path: '/profile', element: <CustomerProfilePage /> },
          { path: '/profile/warranties', element: <WarrantyRecordsPage customerScope /> },
          { path: '/profile/warranties/:id', element: <WarrantyRecordDetailPage customerScope /> },
          { path: '/profile/warranty-tickets', element: <MyWarrantyTicketsPage /> },
        ],
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
          { path: 'combos', element: <CombosPage /> },
          { path: 'deposits', element: <DepositsPage /> },
          {
            path: 'inventory',
            element: <InventoryPage />,
          },
          {
            path: 'warranty-tickets',
            element: <WarrantyTicketsPage />,
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
            path: 'order-modification-requests',
            element: <OrderModificationRequestsPage />,
          },
          {
            path: 'order-modification-requests/:requestId',
            element: <OrderModificationRequestsPage />,
          },
          {
            path: 'system-info',
            element: <SystemInfoPage />,
          },
          { path: 'roles', element: <RolesPage /> },
          { path: 'permissions', element: <PermissionsPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'customer-debts', element: <CustomerDebtsPage /> },
          { path: 'customer-debts/:customerId', element: <CustomerDebtDetailPage /> },
          { path: 'customer-debts/credit-approvals', element: <CreditProfileApprovalsPage /> },
          { path: 'payment-verifications', element: <PaymentVerificationsPage /> },
          { path: 'payment-allocations', element: <PaymentAllocationsPage /> },
          { path: 'cod-collections', element: <CodCollectionsPage /> },
          { path: 'issue-notes', element: <IssueNotesPage /> },
          { path: 'deliveries', element: <DeliveriesPage /> },
          { path: 'my-deliveries', element: <MyDeliveriesPage /> },
          { path: 'deliveries/:id', element: <DeliveryDetailPage /> },
          { path: 'warranty-policies', element: <WarrantyPoliciesPage /> },
          { path: 'warranty-records', element: <WarrantyRecordsPage /> },
          { path: 'warranty-records/:id', element: <WarrantyRecordDetailPage /> },
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
