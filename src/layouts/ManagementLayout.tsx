import { Outlet } from 'react-router-dom'
import { useAuth } from '../features/iam/hooks/useAuth'

export function ManagementLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AquaSuite
            </span>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
              Management
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-gray-800">
                  {user.username}
                </div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            )}

            <button
              onClick={() => void logout()}
              type="button"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-xs text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        AquaSuite Frontend — Phiên bản thử nghiệm MVP Authentication
      </footer>
    </div>
  )
}
