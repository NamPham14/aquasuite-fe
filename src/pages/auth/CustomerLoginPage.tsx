import { Link } from 'react-router-dom'
import { LoginForm } from '../../features/iam/components/LoginForm'
import { useAuth } from '../../features/iam/hooks/useAuth'

export function CustomerLoginPage() {
  const { bootstrapError } = useAuth()
  return <div>
    <div className="mb-6 text-center">
      <h2 className="text-xl font-bold text-gray-900">Đăng nhập khách hàng</h2>
      <p className="mt-1 text-xs text-gray-500">Nhập email và mật khẩu để truy cập tài khoản của bạn</p>
    </div>
    {bootstrapError && <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{bootstrapError.message}</p>}
    <LoginForm />
    <p className="mt-6 border-t border-gray-100 pt-6 text-center text-sm text-gray-600">Chưa có tài khoản? <Link to="/register-customer" className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-4">Đăng ký ngay</Link></p>
    <p className="mt-4 text-center text-xs text-gray-500">Bạn là nhân viên? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-4">Đăng nhập hệ thống</Link></p>
  </div>
}
