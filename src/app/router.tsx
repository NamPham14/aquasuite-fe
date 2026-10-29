import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AuthLayout, ManagementLayout } from '../layouts'
import { LoginPage } from '../pages/auth/LoginPage'
import { DashboardPage } from '../pages/management/DashboardPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { ProtectedRoute } from '../features/iam/components/ProtectedRoute'
import { PublicOnlyRoute } from '../features/iam/components/PublicOnlyRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
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
        element: <ManagementLayout />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
