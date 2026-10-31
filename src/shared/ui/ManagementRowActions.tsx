import type { ReactNode } from 'react'
import { Eye, Pencil, ShieldMinus, ShieldPlus, Trash2 } from 'lucide-react'

export type ManagementActionVariant = 'view' | 'edit' | 'delete' | 'assign' | 'remove'

const actionStyle: Record<ManagementActionVariant, string> = {
  view: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  edit: 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100',
  delete: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  assign: 'border-sky-700 bg-sky-700 text-white hover:bg-sky-800',
  remove: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
}

const actionIcon: Record<ManagementActionVariant, ReactNode> = {
  view: <Eye aria-hidden="true" className="h-4 w-4" />,
  edit: <Pencil aria-hidden="true" className="h-4 w-4" />,
  delete: <Trash2 aria-hidden="true" className="h-4 w-4" />,
  assign: <ShieldPlus aria-hidden="true" className="h-4 w-4" />,
  remove: <ShieldMinus aria-hidden="true" className="h-4 w-4" />,
}

export function ManagementActionButton({ variant, label, ariaLabel, onClick, disabled = false }: {
  variant: ManagementActionVariant
  label: string
  ariaLabel: string
  onClick: () => void
  disabled?: boolean
}) {
  return <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50 ${actionStyle[variant]}`}
  >
    {actionIcon[variant]}
    {label}
  </button>
}

export function ManagementRowActions({ actions }: {
  actions: readonly {
    variant: Extract<ManagementActionVariant, 'view' | 'edit' | 'delete'>
    label: string
    ariaLabel: string
    onClick: () => void
    disabled?: boolean
  }[]
}) {
  return <div className="flex flex-wrap items-center gap-2">
    {actions.map((action) => <ManagementActionButton key={action.variant} {...action} />)}
  </div>
}
