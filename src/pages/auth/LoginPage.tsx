import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { LoginForm } from '../../features/iam/components/LoginForm.tsx'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { clearBootstrapError } from '../../features/iam/model/authSlice.ts'

export function LoginPage() {
  const { bootstrapError } = useAuth()
  const dispatch = useDispatch()

  return (
    <div>
      <div className="mb-7">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#78736A]">
          AquaSuite · Cổng truy cập
        </p>
        <h2 className="font-editorial mt-2 text-2xl font-normal tracking-[-0.01em] text-[#171614] sm:text-[28px]">
          Đăng nhập tài khoản
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-[#6B6760]">
          Dùng chung cho khách hàng Showroom và nhân viên vận hành — nhập email và mật khẩu của bạn.
        </p>
      </div>

      {bootstrapError && (
        <div
          role="alert"
          aria-live="polite"
          data-testid="bootstrap-alert"
          className="mb-5 flex items-start justify-between gap-2 border border-[#E6D0A7] bg-[#FFF9ED] p-3.5 text-sm text-[#785111]"
        >
          <div className="flex items-start gap-2">
            <span className="select-none font-bold text-[#9A6818]">!</span>
            <span>{bootstrapError.message}</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(clearBootstrapError())}
            className="cursor-pointer px-1 font-bold text-[#8A5A14] hover:text-[#5E3B08]"
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}

      <LoginForm />

      <p className="mt-7 border-t border-[#E6E2DA] pt-6 text-center text-sm text-[#6B6760]">
        Khách hàng chưa có tài khoản?{' '}
        <Link
          to="/register-customer"
          className="font-medium text-[#171614] underline decoration-[#C7C1B5] underline-offset-4 transition-colors hover:text-[#087f8c] hover:decoration-[#087f8c]"
        >
          Đăng ký ngay
        </Link>
      </p>
    </div>
  )
}
