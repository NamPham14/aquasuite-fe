import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import { normalizeApiError } from '../../../shared/api/apiError'
import { loginSchema, type LoginFormData } from '../schemas/login.schema'
import { useAuth } from '../hooks/useAuth'

/** Form đăng nhập: validate bằng loginSchema, gọi useAuth.login và hiển thị lỗi phù hợp. */
export function LoginForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  // Sau validation, chờ login hoàn tất rồi chuyển dashboard; không điều hướng khi kết quả đã cũ.
  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await login({
        email: data.email,
        password: data.password,
      })

      if (result) {
        navigate('/app/dashboard', { replace: true })
      }
    } catch (err: unknown) {
      const apiError = normalizeApiError(err)
      if (apiError.code === 'AUTH_003') {
        setErrorMessage('Email hoặc mật khẩu không chính xác.')
      } else if (apiError.code === 'AUTH_008') {
        setErrorMessage('Tài khoản của bạn đã bị vô hiệu hóa hoặc không ở trạng thái hoạt động.')
      } else if (apiError.code === 'AUTH_009' || apiError.status === 'FETCH_ERROR') {
        setErrorMessage('Dịch vụ xác thực tạm thời không khả dụng. Vui lòng thử lại sau.')
      } else {
        setErrorMessage(apiError.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại.')
      }
    } finally {
      setIsSubmitting(false)
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
      aria-label="Form đăng nhập"
    >
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3 text-sm rounded-lg bg-red-50 text-red-700 border border-red-200"
        >
          {errorMessage}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          disabled={isSubmitting}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="admin@aquasuite.vn"
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Mật khẩu
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          disabled={isSubmitting}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
          {...register('password')}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
            errors.password ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="••••••••"
        />
        {errors.password && (
          <p id="password-error" className="mt-1 text-xs text-red-600">
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Đang đăng nhập...
          </span>
        ) : (
          'Đăng nhập'
        )}
      </button>
    </form>
  )
}
