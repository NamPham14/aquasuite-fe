import { Link } from 'react-router-dom'
import { CustomerRegisterForm } from '../../features/iam/components/CustomerRegisterForm'

export function CustomerRegisterPage() {
  return <div>
    <div className="mb-7">
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#78736A]">
        AquaSuite · Thành viên mới
      </p>
      <h2 className="font-editorial mt-2 text-2xl font-normal tracking-[-0.01em] text-[#171614] sm:text-[28px]">
        Đăng ký khách hàng
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-[#6B6760]">
        Điền thông tin và xác minh email để theo dõi đơn hàng và bảo hành điện tử.
      </p>
    </div>
    <CustomerRegisterForm />
    <p className="mt-7 border-t border-[#E6E2DA] pt-6 text-center text-sm text-[#6B6760]">Đã có tài khoản? <Link to="/login" className="font-medium text-[#171614] underline decoration-[#C7C1B5] underline-offset-4 transition-colors hover:text-[#087f8c] hover:decoration-[#087f8c]">Đăng nhập</Link></p>
  </div>
}
