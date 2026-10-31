import { useDispatch } from 'react-redux'
import { LoginForm } from '../../features/iam/components/LoginForm.tsx'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'
import { clearBootstrapError } from '../../features/iam/model/authSlice.ts'

export function LoginPage() {
  const { bootstrapError } = useAuth()
  const dispatch = useDispatch()

  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">Đăng nhập tài khoản</h2>
        <p className="mt-1 text-xs text-gray-500">
          Nhập thông tin xác thực do quản trị viên cấp để truy cập hệ thống
        </p>
      </div>

      {bootstrapError && (
        <div
          role="alert"
          aria-live="polite"
          data-testid="bootstrap-alert"
          className="mb-4 p-3 text-sm rounded-lg bg-amber-50 text-amber-800 border border-amber-200 flex items-start justify-between gap-2"
        >
          <div className="flex items-start gap-2">
            <span className="font-bold text-amber-700 select-none">!</span>
            <span>{bootstrapError.message}</span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(clearBootstrapError())}
            className="text-amber-600 hover:text-amber-800 font-bold px-1 rounded-sm cursor-pointer"
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}

      <LoginForm />
    </div>
  )
}
