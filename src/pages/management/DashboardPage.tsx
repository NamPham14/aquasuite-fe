import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { authApi } from '../../features/iam/api/authApi.ts'
import { setUserProfile } from '../../features/iam/model/authSlice.ts'
import { useAppDispatch } from '../../app/store.ts'
import { CANONICAL_ROLES, type CanonicalRole } from '../../features/iam/types/auth.types.ts'
import { normalizeApiError } from '../../shared/api/apiError.ts'

const ROLE_DEFINITIONS: Record<CanonicalRole, string> = {
  SHOP_OWNER: 'Vai trò Chủ cửa hàng theo định danh hệ thống BE.',
  SALES_STAFF: 'Vai trò Nhân viên bán hàng theo định danh hệ thống BE.',
  ACCOUNTANT: 'Vai trò Kế toán theo định danh hệ thống BE.',
  TECHNICAL_STAFF: 'Vai trò Nhân viên kỹ thuật theo định danh hệ thống BE.',
  SHIPPER: 'Vai trò Nhân viên giao nhận theo định danh hệ thống BE.',
  CUSTOMER: 'Vai trò Khách hàng theo định danh hệ thống BE.',
}

export function DashboardPage() {
  const { user, logout, sessionGeneration } = useAuth()
  const dispatch = useAppDispatch()
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false)

  const handleRefreshProfile = async () => {
    setIsRefreshingProfile(true)
    try {
      const res = await dispatch(
        authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
      ).unwrap()
      if (res.data) {
        // High Fix: Update Redux state so the Dashboard UI immediately re-renders
        dispatch(
          setUserProfile({
            user: res.data,
            generation: sessionGeneration,
          }),
        )
        toast.success(`Đã cập nhật hồ sơ người dùng (${res.data.username})`)
      }
    } catch (err: unknown) {
      const error = normalizeApiError(err)
      toast.error(`Không thể làm mới hồ sơ: ${error.message}`)
    } finally {
      setIsRefreshingProfile(false)
    }
  }

  const assignedRoles = user?.roles ?? []

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Xin chào, {user?.username || 'Người dùng'}!
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Bảng điều khiển AquaSuite Management Mockup (MVP).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleRefreshProfile()}
              disabled={isRefreshingProfile}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
            >
              {isRefreshingProfile ? 'Đang tải...' : 'Làm mới hồ sơ (/me)'}
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Identity Card */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 border-gray-100">
            Thông tin định danh hiện hành (Current User từ /me)
          </h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs font-medium text-gray-400">User ID (UUID)</dt>
              <dd className="font-mono text-gray-800 break-all">{user?.id || 'Chưa xác định'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-400">Tên người dùng (Username)</dt>
              <dd className="font-medium text-gray-800">{user?.username || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-400">Địa chỉ Email</dt>
              <dd className="font-medium text-gray-800">{user?.email || 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-400">Session Generation</dt>
              <dd className="font-mono text-blue-600 font-semibold">{sessionGeneration}</dd>
            </div>
          </dl>

          <div className="pt-2">
            <span className="text-xs font-medium text-gray-400 block mb-1">
              Vai trò thực tế được cấp (từ API /me):
            </span>
            <div className="flex flex-wrap gap-2">
              {assignedRoles.length > 0 ? (
                assignedRoles.map((role: string) => (
                  <span
                    key={role}
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                  Người dùng chưa có vai trò nào được gán trong hệ thống.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Session Security Card */}
        <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2 border-gray-100">
            Mô hình bảo mật phiên (MVP Session)
          </h2>
          <ul className="text-xs text-gray-600 space-y-2 list-disc list-inside">
            <li>
              <strong>Access Token:</strong> Lưu trữ trong memory (Redux State), không lưu trong storage hay URL.
            </li>
            <li>
              <strong>Refresh Token:</strong> Lưu trữ trong <code>sessionStorage</code>; fail-closed rotation (xóa storage trước khi gửi refresh, không retry token cũ khi kết quả không chắc chắn).
            </li>
            <li>
              <strong>Chống Race Condition:</strong> Sử dụng <code>sessionGeneration</code> snapshot trước request đầu tiên, vô hiệu hóa toàn bộ response async thuộc phiên cũ.
            </li>
            <li>
              <strong>Quyền hạn (Permissions):</strong> Backend thực thi phân quyền trên từng endpoint API; frontend chỉ hiển thị vai trò và không suy diễn permissions.
            </li>
          </ul>
        </div>
      </div>

      {/* Canonical Roles Table */}
      <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Danh mục 6 Canonical Roles theo chuẩn AquaSuite BE
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Ghi nhận hiện trạng: Các vai trò định nghĩa theo schema DB BE. Quyền truy cập chi tiết được máy chủ thực thi trên từng API, không suy diễn ở giao diện client.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên Role Canonical
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái đối với tài khoản hiện tại
                </th>
                <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Định nghĩa định danh
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {CANONICAL_ROLES.map((role) => {
                const isAssigned = assignedRoles.includes(role)
                return (
                  <tr key={role} className={isAssigned ? 'bg-blue-50/50' : undefined}>
                    <td className="px-4 py-3 whitespace-nowrap font-mono font-medium text-xs text-gray-900">
                      {role}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {isAssigned ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Đang sở hữu
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          Chưa sở hữu (Cần tài khoản test tương ứng)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {ROLE_DEFINITIONS[role]}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
