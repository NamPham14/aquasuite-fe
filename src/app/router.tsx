import { createBrowserRouter, createMemoryRouter, Navigate, type RouteObject } from 'react-router-dom'
import { AuthLayout, ManagementLayout } from '../layouts'
import { LoginPage } from '../pages/auth/LoginPage'
import { DashboardPage } from '../pages/management/DashboardPage'
import { ProductsPage } from '../pages/management/ProductsPage'
import { CategoriesPage } from '../pages/management/CategoriesPage'
import { BrandsPage } from '../pages/management/BrandsPage'
import { InventoryPage } from '../pages/management/InventoryPage'
import { SystemInfoPage } from '../pages/management/SystemInfoPage'
import { AccessPlaceholderPage } from '../pages/management/AccessPlaceholderPage'
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
            path: 'system-info',
            element: <SystemInfoPage />,
          },
          { path: 'roles', element: <AccessPlaceholderPage kind="roles" /> },
          { path: 'permissions', element: <AccessPlaceholderPage kind="permissions" /> },
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
