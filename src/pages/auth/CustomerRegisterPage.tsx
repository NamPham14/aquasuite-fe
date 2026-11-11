import { Link } from 'react-router-dom'
import { CustomerRegisterForm } from '../../features/iam/components/CustomerRegisterForm'

export function CustomerRegisterPage() {
  return <div>
    <div className="mb-6 text-center">
      <h2 className="text-xl font-bold text-gray-900">Đăng ký khách hàng</h2>
      <p className="mt-1 text-xs text-gray-500">Điền thông tin và xác minh email để tạo tài khoản AquaSuite</p>
    </div>
    <CustomerRegisterForm />
    <p className="mt-6 border-t border-gray-100 pt-6 text-center text-sm text-gray-600">Đã có tài khoản? <Link to="/login-customer" className="font-medium text-blue-600 hover:text-blue-700 underline underline-offset-4">Đăng nhập</Link></p>
  </div>
}
