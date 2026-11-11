import { useEffect, useRef, useState } from 'react'
import { useStore } from 'react-redux'
import { toast } from 'sonner'
import { useChangeBundlePublicationMutation, useCreateBundleMutation, useDeleteBundleMutation, useGetBundlesQuery, useLazyGetBundleQuery, useUpdateBundleMutation } from '../api/bundleApi'
import type { Bundle, BundleDefinition, BundleListParams } from '../types/bundle.types'
import { bundleError } from '../lib/bundle'

export type BundleAction = 'view' | 'edit' | 'delete' | 'publish' | 'unpublish'
type Dialog = { mode: 'create' } | { mode: BundleAction; bundle: Bundle }
type SessionStore = { auth: { sessionGeneration: number } }

/** Owns server filters, fresh details, confirmations and write uncertainty; pages only compose UI. */
export function useBundleManagement() {
  const store = useStore<SessionStore>()
  const [filters, setFilters] = useState<BundleListParams>({ page: 0, size: 20 })
  const list = useGetBundlesQuery(filters)
  const [load] = useLazyGetBundleQuery()
  const [create] = useCreateBundleMutation()
  const [update] = useUpdateBundleMutation()
  const [publication] = useChangeBundlePublicationMutation()
  const [remove] = useDeleteBundleMutation()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [pending, setPending] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [error, setError] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [blocked, setBlocked] = useState(false)
  const [forbidden, setForbidden] = useState(false)
  const [revision, setRevision] = useState(0)
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const current = (generation: number) => mounted.current && store.getState().auth.sessionGeneration === generation
  function fail(cause: unknown, write = false) {
    const result = bundleError(cause)
    if (result.forbidden) { setForbidden(true); setDialog(null) }
    setError(result.uncertain && write ? 'Chưa xác nhận được kết quả trên máy chủ. Không gửi lại. Hãy đóng hộp thoại và tìm mã combo, hoặc tải lại dữ liệu trước khi tiếp tục.' : result.message)
    setFields(Object.fromEntries(result.errors?.map((item) => [item.field, item.message]) ?? []))
    setBlocked(write && (result.stale || result.uncertain))
  }
  function resetErrors() { setError(''); setFields({}); setBlocked(false) }
  function changeFilters(patch: Partial<BundleListParams>) {
    setFilters((previous) => ({ ...previous, ...patch, page: patch.page ?? 0 }))
  }
  function createNew() { if (busy.current) return; resetErrors(); setDialog({ mode: 'create' }) }
  function close() { if (!busy.current) { setDialog(null); resetErrors() } }
  async function open(mode: BundleAction, bundle: Bundle, reloading = false) {
    if (busy.current) return
    busy.current = true; setLoadingDetail(true)
    if (!reloading) resetErrors()
    const generation = store.getState().auth.sessionGeneration
    try {
      const fresh = await load(bundle.bundleId, false).unwrap()
      if (current(generation)) { resetErrors(); setDialog({ mode, bundle: fresh }); setRevision((value) => value + 1) }
    } catch (cause) { if (current(generation)) { fail(cause); if (reloading) setBlocked(true) } }
    finally { busy.current = false; if (current(generation)) setLoadingDetail(false) }
  }
  async function reloadDialog() {
    if (!dialog || dialog.mode === 'create' || busy.current) return
    // Explicit action discards the old form only after fresh detail succeeds.
    const previous = dialog
    await open(previous.mode, previous.bundle, true)
  }
  async function write(operation: () => Promise<unknown>, message: string) {
    if (busy.current || blocked) return
    busy.current = true; setPending(true); resetErrors()
    const generation = store.getState().auth.sessionGeneration
    try {
      await operation()
      if (current(generation)) {
        setDialog(null); toast.success(message)
        // Refetch even if mutation invalidation occurred while a response was pending.
        void list.refetch()
      }
    } catch (cause) { if (current(generation)) fail(cause, true) }
    finally { busy.current = false; if (current(generation)) setPending(false) }
  }
  async function save(definition: BundleDefinition) {
    if (!dialog) return
    if (dialog.mode === 'create') await write(() => create(definition).unwrap(), 'Đã tạo bản nháp combo. Bạn có thể công bố sau khi kiểm tra.')
    else if (dialog.mode === 'edit' && dialog.bundle.publicationStatus !== 'PUBLISHED') {
      const bundle = dialog.bundle
      await write(() => update({ id: bundle.bundleId, data: { ...definition, expectedVersion: bundle.version } }).unwrap(), 'Đã cập nhật combo.')
    }
  }
  async function confirm() {
    if (!dialog || dialog.mode === 'create') return
    const { mode, bundle } = dialog
    const versioned = { id: bundle.bundleId, expectedVersion: bundle.version }
    if (mode === 'delete') await write(() => remove(versioned).unwrap(), 'Đã xóa combo.')
    if (mode === 'publish' || mode === 'unpublish') await write(() => publication({ ...versioned, publicationStatus: mode === 'publish' ? 'PUBLISHED' : 'UNPUBLISHED' }).unwrap(), mode === 'publish' ? 'Đã công bố combo.' : 'Đã ngừng công bố combo.')
  }
  async function retry() {
    if (busy.current) return
    resetErrors()
    const response = await list.refetch()
    if (response.error) fail(response.error)
    else setForbidden(false)
  }
  const listForbidden = list.isError && bundleError(list.error).forbidden
  return { filters, changeFilters, list, dialog, pending, loadingDetail, error, fields, blocked, forbidden: forbidden || listForbidden, revision, createNew, close, open, reloadDialog, save, confirm, retry }
}
