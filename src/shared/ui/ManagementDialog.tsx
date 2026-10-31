import { useEffect, useRef, type FormEventHandler, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function ManagementDialog({ title, onClose, children, closeDisabled = false }: { title: string; onClose: () => void; children: ReactNode; closeDisabled?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => { dialog?.close() }
  }, [])
  return (
    <dialog ref={ref} aria-labelledby="management-dialog-title" onCancel={(event) => { event.preventDefault(); if (!closeDisabled) onClose() }} className="m-auto max-h-[90vh] w-[min(94vw,640px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
        <h2 id="management-dialog-title" className="text-lg font-semibold">{title}</h2>
        <button type="button" disabled={closeDisabled} onClick={onClose} aria-label="Đóng" className="rounded-md p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50"><X className="h-5 w-5" /></button>
      </div>
      {children}
    </dialog>
  )
}

export const managementFieldClass = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-600'

export function ManagementForm({ children, onSubmit, onClose, readOnly = false, submitDisabled = false, closeDisabled = false, submitLabel }: { children: ReactNode; onSubmit: FormEventHandler<HTMLFormElement>; onClose: () => void; readOnly?: boolean; submitDisabled?: boolean; closeDisabled?: boolean; submitLabel: string }) {
  return <form onSubmit={onSubmit} className="space-y-5 p-5 sm:p-6" noValidate>
    {children}
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button type="button" disabled={closeDisabled} onClick={onClose} className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50">{readOnly ? 'Đóng' : 'Hủy'}</button>
      {!readOnly && <button type="submit" disabled={submitDisabled} className="min-h-10 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-50">{submitLabel}</button>}
    </div>
  </form>
}

export function ManagementFormField({ id, label, children, hint, error }: { id: string; label: string; children: ReactNode; hint?: string; error?: string }) {
  return <div className="min-w-0"><label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>{children}{error ? <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-700">{error}</p> : hint ? <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p> : null}</div>
}
