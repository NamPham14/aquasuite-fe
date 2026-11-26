import type { ReactNode } from 'react'

export type StatusTone = 'positive' | 'warning' | 'neutral' | 'danger' | 'accent'

const statusToneClasses: Record<StatusTone, string> = {
  positive: 'border-aqs-positive-border bg-aqs-positive-soft text-aqs-positive',
  warning: 'border-aqs-warning-border bg-aqs-warning-soft text-aqs-warning',
  neutral: 'border-aqs-border bg-aqs-surface-subtle text-aqs-ink-muted',
  danger: 'border-aqs-danger-border bg-aqs-danger-soft text-aqs-danger',
  accent: 'border-aqs-accent-border bg-aqs-accent-soft text-aqs-accent-hover',
}

export function StatusBadge({
  tone,
  children,
  className = '',
}: {
  tone: StatusTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1.5 whitespace-nowrap rounded-chip border px-2 py-0.5 text-xs font-semibold ${statusToneClasses[tone]} ${className}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  )
}

export function CodeChip({
  children,
  tone = 'accent',
  title,
  className = '',
}: {
  children: ReactNode
  tone?: 'accent' | 'neutral'
  title?: string
  className?: string
}) {
  const toneClass =
    tone === 'accent'
      ? 'border-aqs-border bg-aqs-surface-subtle text-aqs-accent-hover'
      : 'border-aqs-border bg-aqs-surface-subtle text-aqs-ink-muted'
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-chip border px-2 py-0.5 text-xs font-bold tracking-[0.01em] ${toneClass} ${className}`}
    >
      {children}
    </span>
  )
}

export type NoticeTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success'

const noticeToneClasses: Record<NoticeTone, string> = {
  neutral: 'border-aqs-border bg-aqs-surface-subtle text-aqs-ink-muted',
  info: 'border-aqs-accent-border bg-aqs-accent-soft text-aqs-accent-ink',
  warning: 'border-aqs-warning-border bg-aqs-warning-soft text-aqs-warning-ink',
  danger: 'border-aqs-danger-border bg-aqs-danger-soft text-aqs-danger-ink',
  success: 'border-aqs-positive-border bg-aqs-positive-soft text-aqs-positive-ink',
}

export function Notice({
  tone = 'neutral',
  title,
  children,
  role,
  className = '',
}: {
  tone?: NoticeTone
  title?: string
  children: ReactNode
  role?: 'alert' | 'status'
  className?: string
}) {
  return (
    <div
      role={role}
      className={`rounded-card border px-3.5 py-3 text-[13px] leading-relaxed ${noticeToneClasses[tone]} ${className}`}
    >
      {title && <p className="mb-0.5 font-bold text-aqs-ink">{title}</p>}
      <div>{children}</div>
    </div>
  )
}
