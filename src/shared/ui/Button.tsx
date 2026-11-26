import {
  cloneElement,
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'danger-outline'
export type ButtonSize = 'sm' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-aqs-accent text-white hover:bg-aqs-accent-hover',
  secondary:
    'border-aqs-border-strong bg-aqs-surface text-aqs-ink hover:bg-aqs-surface-subtle',
  quiet:
    'border-transparent bg-transparent text-aqs-ink-muted hover:bg-aqs-surface-subtle hover:text-aqs-ink',
  danger: 'border-transparent bg-aqs-danger text-white hover:bg-aqs-danger-hover',
  'danger-outline':
    'border-aqs-danger-border bg-aqs-danger-soft text-aqs-danger hover:border-aqs-danger hover:bg-aqs-danger-soft-hover',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[34px] gap-1.5 px-2.5 text-[12.5px] [&_svg]:h-3.5 [&_svg]:w-3.5',
  md: 'min-h-10 gap-2 px-3.5 text-sm [&_svg]:h-4 [&_svg]:w-4',
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    icon?: ReactNode
  }
>(function Button(
  {
    type = 'button',
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    children,
    className = '',
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-control border font-semibold leading-none transition-[background-color,border-color,color,transform] duration-150 hover:not-disabled:-translate-y-px active:not-disabled:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-focus disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transform-none motion-reduce:transition-none [&_svg]:shrink-0 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="aqs-animate-spin inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  )
})

export function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: string
  children: ReactElement<Record<string, unknown>>
  side?: 'top' | 'bottom'
}) {
  const id = useId()
  const describedBy = children.props['aria-describedby']
  const positionClass =
    side === 'bottom'
      ? 'top-[calc(100%+8px)] -translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0'
      : 'bottom-[calc(100%+8px)] translate-y-1 group-hover/tip:translate-y-0 group-focus-within/tip:translate-y-0'

  return (
    <span className="group/tip relative inline-flex">
      {cloneElement(children, {
        'aria-describedby': describedBy ? `${describedBy} ${id}` : id,
      })}
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none invisible absolute left-1/2 z-50 w-max max-w-[240px] -translate-x-1/2 rounded-[5px] bg-aqs-ink px-2 py-1.5 text-xs font-medium leading-snug text-white opacity-0 transition-[opacity,transform] duration-150 group-hover/tip:visible group-hover/tip:opacity-100 group-hover/tip:delay-300 group-focus-within/tip:visible group-focus-within/tip:opacity-100 group-focus-within/tip:delay-300 motion-reduce:transition-none ${positionClass}`}
      >
        {label}
      </span>
    </span>
  )
}

const iconToneClasses = {
  quiet:
    'border-aqs-border bg-aqs-surface text-aqs-ink-muted hover:bg-aqs-surface-subtle hover:text-aqs-ink',
  accent:
    'border-aqs-accent-border-strong bg-aqs-accent-soft text-aqs-accent-hover hover:bg-aqs-surface-active',
  warning:
    'border-aqs-warning-border bg-aqs-warning-soft text-aqs-warning hover:brightness-95',
  danger:
    'border-aqs-danger-border bg-aqs-danger-soft text-aqs-danger hover:bg-aqs-danger-soft-hover',
} as const

export function IconButton({
  label,
  icon,
  tone = 'quiet',
  size = 'md',
  onClick,
  disabled = false,
  className = '',
}: {
  label: string
  icon: ReactNode
  tone?: keyof typeof iconToneClasses
  size?: 'sm' | 'md'
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  const dim = size === 'sm' ? 'h-8 w-8 [&_svg]:h-3.5 [&_svg]:w-3.5' : 'h-9 w-9 [&_svg]:h-4 [&_svg]:w-4'
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={`inline-grid cursor-pointer place-items-center rounded-control border transition-[background-color,border-color,color,transform] duration-150 hover:not-disabled:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aqs-focus disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transform-none motion-reduce:transition-none ${dim} ${iconToneClasses[tone]} ${className}`}
      >
        {icon}
      </button>
    </Tooltip>
  )
}

/** Sakuga VFX beats: press anticipation -> accent ticks on hit -> spring settle. */
export function SakugaActionButton({
  children,
  icon,
  onClick,
  disabled = false,
  className = '',
}: {
  children: ReactNode
  icon?: ReactNode
  onClick: () => void
  disabled?: boolean
  className?: string
}) {
  const [reacting, setReacting] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  function handleClick() {
    if (disabled) return
    setReacting(false)
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => setReacting(true))
    } else {
      setReacting(true)
    }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setReacting(false), 520)
    onClick()
  }

  return (
    <span className={`relative isolate inline-flex ${reacting ? 'aqs-sakuga-hit' : ''} ${className}`}>
      <span className="aqs-sakuga-ticks pointer-events-none absolute -inset-3 -z-10" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <Button type="button" variant="primary" icon={icon} disabled={disabled} onClick={handleClick} className="w-full">
        {children}
      </Button>
    </span>
  )
}
