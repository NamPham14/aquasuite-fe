import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 text-center">
      <h1 className="text-6xl font-bold text-blue-600 mb-2">404</h1>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Không tìm thấy trang
      </h2>
      <p className="text-sm text-gray-500 mb-6 max-w-md">
        Trang bạn đang tìm kiếm không tồn tại hoặc bạn không có quyền truy cập.
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-xs text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        Về bảng điều khiển
      </Link>
    </div>
  )
}
