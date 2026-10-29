import type { ReactNode } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ManagementPageHeader({ title, description, breadcrumb, group, icon }: {
  title: string
  description: string
  breadcrumb: string
  group?: string
  icon: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <nav aria-label="Breadcrumb" className="mb-1 text-xs text-gray-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/app/dashboard" className="hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600">AquaSuite</Link></li>
            {group && <><li aria-hidden="true">/</li><li>{group}</li></>}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-gray-900">{breadcrumb}</li>
          </ol>
        </nav>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600" aria-hidden="true">{icon}</div>
          <div><h1 className="text-2xl font-bold text-gray-900">{title}</h1><p className="text-xs text-gray-500">{description}</p></div>
        </div>
      </div>
      <Link to="/app/dashboard" className="inline-flex self-start items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-blue-600 sm:self-auto">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Về bảng điều khiển
      </Link>
    </div>
  )
}

export function ManagementFilterBar({ children }: { children: ReactNode }) {
  return <div role="search" aria-label="Tìm kiếm và lọc" className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">{children}</div>
}

export function ManagementSearch({ id, label, value, onChange, placeholder }: {
  id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string
}) {
  return (
    <div className="min-w-0 flex-1 sm:min-w-56">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700">{label}</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        <input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500" />
      </div>
    </div>
  )
}

export function ManagementSelect({ id, label, value, onChange, children }: {
  id: string; label: string; value: string; onChange: (value: string) => void; children: ReactNode
}) {
  return (
    <div className="sm:min-w-44">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-700">{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500">{children}</select>
    </div>
  )
}
