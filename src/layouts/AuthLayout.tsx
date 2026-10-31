import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <header className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">
          AquaSuite
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Hệ thống quản lý chuỗi kinh doanh & kỹ thuật thủy sinh
        </p>
      </header>

      <section className="mt-2 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow rounded-xl sm:px-10 border border-gray-100">
          <Outlet />
        </div>
      </section>

      <footer className="mt-8 text-center text-xs text-gray-400">
        &copy; 2026 AquaSuite IMS. Bảo mật thông tin phiên làm việc.
      </footer>
    </main>
  )
}
