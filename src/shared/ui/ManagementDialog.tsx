// Lucian UX/UI Prompt #436 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#436
import {
  useEffect,
  useId,
  useRef,
  type FormEvent,
  type FormEventHandler,
  type ReactNode,
  type RefObject,
} from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

export function ManagementDialog({
  title,
  onClose,
  children,
  closeDisabled = false,
  size = 'default',
  placement = 'center',
  descriptionId,
  className = '',
}: {
  title: string
  onClose: () => void
  children: ReactNode
  closeDisabled?: boolean
  size?: 'default' | 'wide' | 'xl'
  placement?: 'center' | 'right'
  descriptionId?: string
  className?: string
}) {
  const titleId = useId()
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const trigger = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault()
        event.stopPropagation()
        if (!closeDisabled) onClose()
      }}
      className={`${
        placement === 'right'
          ? 'fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-[min(100vw,480px)]'
          : `m-auto max-h-[92vh] ${
              size === 'xl'
                ? 'w-[min(98vw,1240px)]'
                : size === 'wide'
                  ? 'w-[min(96vw,960px)]'
                  : 'w-[min(94vw,640px)]'
            } rounded-card`
      } overflow-y-auto border border-aqs-border bg-aqs-surface p-0 font-aqs-sans text-aqs-ink shadow-aqs-float backdrop:bg-[#122b31]/45 ${className}`}
    >
      <div className="flex items-center justify-between gap-4 border-b border-aqs-border px-5 py-4 sm:px-6">
        <h2 id={titleId} className="text-[17px] font-bold text-aqs-ink">
          {title}
        </h2>
        <button
          type="button"
          disabled={closeDisabled}
          onClick={onClose}
          aria-label="Đóng"
          className="cursor-pointer rounded-control p-2 text-aqs-ink-muted hover:bg-aqs-surface-subtle hover:text-aqs-ink focus-visible:outline-2 focus-visible:outline-aqs-focus disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </dialog>
  )
}

export const managementFieldClass =
  'mt-1 w-full rounded-control border border-aqs-border-strong bg-aqs-surface px-3 py-2 text-sm text-aqs-ink transition-[border-color,box-shadow] duration-150 focus:border-aqs-focus focus:shadow-[0_0_0_3px_rgba(8,127,140,0.14)] focus:outline-none aria-[invalid=true]:border-aqs-danger disabled:bg-aqs-surface-subtle disabled:text-aqs-ink-faint'

export function ManagementForm({
  children,
  onSubmit,
  onClose,
  readOnly = false,
  submitDisabled = false,
  closeDisabled = false,
  submitLabel,
  formRef,
  className = '',
  submitVariant = 'primary',
  submitLoading = false,
}: {
  children: ReactNode
  onSubmit: FormEventHandler<HTMLFormElement>
  onClose: () => void
  readOnly?: boolean
  submitDisabled?: boolean
  closeDisabled?: boolean
  submitLabel: string
  formRef?: RefObject<HTMLFormElement | null>
  className?: string
  /** Giữ tương thích ngược; form hiện luôn dùng chuẩn thiết kế thống nhất */
  operational?: boolean
  submitVariant?: 'primary' | 'danger'
  submitLoading?: boolean
}) {
  return (
    <form ref={formRef} onSubmit={onSubmit} className={`space-y-5 p-5 sm:p-6 ${className}`} noValidate>
      {children}
      <div className="flex justify-end gap-2 border-t border-aqs-border pt-4">
        <Button type="button" variant="secondary" disabled={closeDisabled} onClick={onClose}>
          {readOnly ? 'Đóng' : 'Hủy'}
        </Button>
        {!readOnly && (
          <Button
            type="submit"
            variant={submitVariant}
            disabled={submitDisabled}
            loading={submitLoading}
          >
            {submitLabel}
          </Button>
        )}
      </div>
    </form>
  )
}

export function ManagementFormField({
  id,
  label,
  children,
  hint,
  error,
}: {
  id: string
  label: string
  children: ReactNode
  hint?: string
  error?: string
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-[13px] font-semibold text-aqs-ink-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-aqs-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-aqs-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function DeleteConfirmDialog({
  title,
  subject,
  description,
  confirmLabel,
  pendingLabel = 'Đang xóa',
  pending,
  error,
  onClose,
  onConfirm,
  asForm = false,
}: {
  title: string
  subject: string
  description: string
  confirmLabel: string
  pendingLabel?: string
  pending: boolean
  error?: string
  onClose: () => void
  onConfirm: (event?: FormEvent<HTMLFormElement>) => void
  asForm?: boolean
}) {
  const descriptionId = useId()
  const content = (
    <div className={`px-6 pb-6 pt-5 ${pending ? 'aqs-u436-deleting' : ''}`}>
      <div
        className="aqs-u436-icon mb-3.5 grid h-[60px] w-[60px] place-items-center rounded-[18px] bg-aqs-danger-soft text-aqs-danger"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 32 32"
          className="h-[38px] w-[38px] overflow-visible fill-none stroke-current"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g className="aqs-u436-document">
            <path d="M12.5 -1.5h5l3 3v8h-8z" fill="var(--ux-surface)" strokeWidth="1.5" />
            <path d="M14.5 3.5h3.5M14.5 6h3.5" strokeWidth="1.5" />
          </g>
          <g className="aqs-u436-lid">
            <path d="M5.5 9.5h21" />
            <path d="M12.5 9V7a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 19.5 7v2" />
          </g>
          <g className="aqs-u436-body">
            <path d="M8 10.5l1.3 14.6a2.4 2.4 0 0 0 2.4 2.2h8.6a2.4 2.4 0 0 0 2.4-2.2L24 10.5" />
            <path d="M13.5 15v7.5M18.5 15v7.5" />
          </g>
        </svg>
      </div>
      <p className="m-0 text-[15px] font-bold text-aqs-ink">{subject}</p>
      <p id={descriptionId} className="mt-1.5 text-[13px] leading-relaxed text-aqs-ink-muted">
        {description}
      </p>
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-control border border-aqs-danger-border bg-aqs-danger-soft px-3 py-2.5 text-[13px] text-aqs-danger-ink"
        >
          {error}
        </p>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {pending ? pendingLabel : ''}
      </p>
      <div className="mt-5 flex flex-col-reverse justify-end gap-2 border-t border-aqs-border pt-4 sm:flex-row">
        <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
          Hủy
        </Button>
        {asForm ? (
          <Button type="submit" variant="danger" loading={pending}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        ) : (
          <Button type="button" variant="danger" loading={pending} onClick={() => onConfirm()}>
            {pending ? pendingLabel : confirmLabel}
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <ManagementDialog
      title={title}
      onClose={onClose}
      closeDisabled={pending}
      descriptionId={descriptionId}
    >
      {asForm ? (
        <form onSubmit={(event) => onConfirm(event)} noValidate>
          {content}
        </form>
      ) : (
        content
      )}
    </ManagementDialog>
  )
}
