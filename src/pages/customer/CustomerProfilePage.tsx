import { Link } from 'react-router-dom'
import { ClipboardList, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../../features/iam/hooks/useAuth.ts'

export function CustomerProfilePage() {
  const { user } = useAuth()
  const isCustomer = user?.roles?.includes('CUSTOMER') ?? false

  return <div className="mx-auto max-w-4xl space-y-5">
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-700"><UserRound className="h-5 w-5" /></div>
        <div><p className="text-sm text-slate-500">Tài khoản của tôi</p><h1 className="text-xl font-bold text-slate-900">{user?.username || 'Khách hàng AquaSuite'}</h1><p className="mt-1 text-sm text-slate-600">{user?.email}</p></div>
      </div>
    </section>

    {!isCustomer ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Trang này dành cho tài khoản khách hàng. Vui lòng sử dụng hệ thống quản lý cửa hàng cho nghiệp vụ nội bộ.</section> : (
      <section className="grid gap-4 sm:grid-cols-2">
        <Link to="/profile/warranties" className="group rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-sky-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
          <ShieldCheck className="h-6 w-6 text-sky-700" /><h2 className="mt-4 font-semibold text-slate-900 group-hover:text-sky-800">Bảo hành của tôi</h2><p className="mt-1 text-sm leading-6 text-slate-600">Tra cứu thời hạn, số serial, điều khoản bảo hành và gửi yêu cầu bảo hành cho sản phẩm còn hiệu lực.</p>
        </Link>
        <Link to="/profile/warranty-tickets" className="group rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-sky-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500">
          <ClipboardList className="h-6 w-6 text-sky-700" /><h2 className="mt-4 font-semibold text-slate-900 group-hover:text-sky-800">Yêu cầu bảo hành của tôi</h2><p className="mt-1 text-sm leading-6 text-slate-600">Theo dõi các yêu cầu đã gửi cho đội ngũ kỹ thuật.</p>
        </Link>
      </section>
    )}
  </div>
}
