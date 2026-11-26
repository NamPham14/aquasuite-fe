import type { ReactNode } from 'react'
import { Eye, Pencil, ShieldMinus, ShieldPlus, Trash2 } from 'lucide-react'

export type ManagementActionVariant = 'view' | 'edit' | 'delete' | 'assign' | 'remove'

const actionStyle: Record<ManagementActionVariant, string> = {
  view: 'border-aqs-border-strong bg-aqs-surface text-aqs-ink hover:bg-aqs-surface-subtle',
  edit: 'border-aqs-accent-border bg-aqs-accent-soft text-aqs-accent-hover hover:bg-aqs-surface-active',
  delete: 'border-aqs-danger-border bg-aqs-danger-soft text-aqs-danger hover:bg-aqs-danger-soft-hover',
  assign: 'border-aqs-accent bg-aqs-accent text-white hover:bg-aqs-accent-hover',
  remove: 'border-aqs-danger-border bg-aqs-danger-soft text-aqs-danger hover:bg-aqs-danger-soft-hover',
}

const actionIcon: Record<ManagementActionVariant, ReactNode> = {
  view: <Eye aria-hidden="true" className="h-3.5 w-3.5" />,
  edit: <Pencil aria-hidden="true" className="h-3.5 w-3.5" />,
  delete: <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />,
  assign: <ShieldPlus aria-hidden="true" className="h-3.5 w-3.5" />,
  remove: <ShieldMinus aria-hidden="true" className="h-3.5 w-3.5" />,
}

export function ManagementActionButton({
  variant,
  label,
  ariaLabel,
  onClick,
  disabled = false,
}: {
  variant: ManagementActionVariant
  label: string
  ariaLabel: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex min-h-[34px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-control border px-2.5 text-[12.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-focus disabled:cursor-not-allowed disabled:opacity-50 ${actionStyle[variant]}`}
    >
      {actionIcon[variant]}
      {label}
    </button>
  )
}

export function ManagementRowActions({
  actions,
}: {
  actions: readonly {
    variant: Extract<ManagementActionVariant, 'view' | 'edit' | 'delete'>
    label: string
    ariaLabel: string
    onClick: () => void
    disabled?: boolean
  }[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {actions.map((action) => (
        <ManagementActionButton key={action.variant} {...action} />
      ))}
    </div>
  )
}
