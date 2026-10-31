import { useState } from 'react'
import { useStore } from 'react-redux'
import { useAppDispatch, useAppSelector, type RootState } from '../../app/store'
import { beginIamProbe, finishIamProbe, iamAccessApi } from '../../features/iam'

export function IamAccessGate({ children }: { children: React.ReactNode }) {
  const status = useAppSelector((state) => state.iamAccess.status)
  const dispatch = useAppDispatch()
  const store = useStore<RootState>()
  const [error, setError] = useState('')
  async function probe() {
    if (store.getState().iamAccess.status !== 'denied') return
    setError('')
    dispatch(beginIamProbe())
    const before = store.getState()
    const epoch = before.iamAccess.epoch
    const generation = before.auth.sessionGeneration
    const request = dispatch(iamAccessApi.endpoints.probe.initiate(undefined, { forceRefetch: true, subscribe: false }))
    try {
      const response = await request.unwrap()
      const current = store.getState()
      if (current.auth.sessionGeneration !== generation || current.iamAccess.epoch !== epoch || current.iamAccess.status !== 'checking') return
      const canonical = ['SHOP_OWNER', 'SALES_STAFF', 'ACCOUNTANT', 'TECHNICAL_STAFF', 'SHIPPER', 'CUSTOMER']
      const valid = response.success === true && Array.isArray(response.data) && response.data.length === canonical.length && response.data.every((role, index) => typeof role.id === 'string' && role.id.length > 0 && role.code === canonical[index] && (role.description == null || typeof role.description === 'string') && typeof role.active === 'boolean' && Array.isArray(role.permissions) && role.permissions.every((permission) => typeof permission.id === 'string' && permission.id.length > 0 && typeof permission.code === 'string' && (permission.description == null || typeof permission.description === 'string')))
      dispatch(finishIamProbe({ epoch, allowed: valid }))
      if (valid) dispatch(iamAccessApi.util.resetApiState())
      else setError('Không thể xác nhận quyền truy cập. Vui lòng thử lại.')
    } catch {
      const current = store.getState()
      if (current.auth.sessionGeneration !== generation || current.iamAccess.epoch !== epoch || current.iamAccess.status !== 'checking') return
      dispatch(finishIamProbe({ epoch, allowed: false }))
      setError('Chưa thể xác nhận quyền truy cập. Vui lòng thử lại.')
    }
  }
  if (status === 'denied' || status === 'checking') return <section className="rounded-lg border border-slate-200 bg-white p-6" role="alert"><h1 className="text-xl font-semibold text-slate-900">Không có quyền truy cập</h1><p className="mt-2 text-sm text-slate-600">Máy chủ không cho phép tài khoản này quản lý vai trò và quyền.</p>{error && <p className="mt-2 text-sm text-red-700">{error}</p>}<button type="button" onClick={() => void probe()} disabled={status === 'checking'} className="mt-4 min-h-10 rounded-md bg-sky-700 px-4 text-sm font-semibold text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-sky-600">{status === 'checking' ? 'Đang kiểm tra...' : 'Kiểm tra lại quyền'}</button></section>
  return <>{children}</>
}
