import { Warehouse, ArrowLeft, Info } from 'lucide-react'
import { Link } from 'react-router-dom'

export function InventoryPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="text-xs text-gray-500 mb-1">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link to="/app/dashboard" className="hover:text-blue-600 transition-colors">
                  AquaSuite
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-400">Quản lý danh mục</li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-900 font-medium" aria-current="page">Tồn kho</li>
            </ol>
          </nav>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Warehouse className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý Tồn kho</h1>
              <p className="text-xs text-gray-500">Kiểm soát xuất nhập tồn, vị trí kho bãi và cảnh báo dự trữ</p>
            </div>
          </div>
        </div>

        <Link
          to="/app/dashboard"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Về bảng điều khiển</span>
        </Link>
      </div>

      {/* Placeholder Notice */}
      <div
        role="region"
        aria-label="Thông báo trạng thái tính năng"
        className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-5 flex items-start gap-3.5"
      >
        <div className="p-1 bg-amber-100 text-amber-800 rounded-md shrink-0 mt-0.5">
          <Info className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="space-y-1 text-xs text-amber-900">
          <h2 className="font-semibold text-sm text-amber-950">
            Trang giao diện mẫu (Placeholder) — WORK-002
          </h2>
          <p className="leading-relaxed">
            Màn hình <strong>Quản lý Tồn kho</strong> hiện là giao diện giữ chỗ theo kế hoạch phát triển. 
            Theo phạm vi của <strong>WORK-002</strong>, hệ thống chỉ triển khai route điều hướng và layout chung; 
            chưa kết nối API nghiệp vụ và chưa hỗ trợ thao tác thêm, sửa, xóa (CRUD).
          </p>
        </div>
      </div>

      {/* Mock Inventory Status Summary */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Thống kê kho bãi minh họa</h3>
            <p className="text-xs text-gray-500">Khung bố cục theo dõi mức độ tồn kho và điều chuyển nội bộ</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 self-start sm:self-auto">
            Dữ liệu mẫu
          </span>
        </div>

        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-4 space-y-1">
            <span className="text-xs font-medium text-emerald-800">Kho chính TP.HCM</span>
            <div className="text-xl font-bold text-emerald-950">1.850 SP</div>
            <p className="text-2xs text-emerald-700">Công suất: 75% diện tích</p>
          </div>
          <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 space-y-1">
            <span className="text-xs font-medium text-blue-800">Kho phụ Hà Nội</span>
            <div className="text-xl font-bold text-blue-950">920 SP</div>
            <p className="text-2xs text-blue-700">Công suất: 52% diện tích</p>
          </div>
          <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-4 space-y-1">
            <span className="text-xs font-medium text-amber-800">Cảnh báo thiếu hụt</span>
            <div className="text-xl font-bold text-amber-950">12 mã SP</div>
            <p className="text-2xs text-amber-700">Dưới mức an toàn</p>
          </div>
          <div className="border border-purple-200 bg-purple-50/50 rounded-lg p-4 space-y-1">
            <span className="text-xs font-medium text-purple-800">Đang luân chuyển</span>
            <div className="text-xl font-bold text-purple-950">65 SP</div>
            <p className="text-2xs text-purple-700">2 chuyến hàng trên đường</p>
          </div>
        </div>
      </div>
    </div>
  )
}
