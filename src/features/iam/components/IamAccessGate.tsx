import { useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { ShieldAlert } from 'lucide-react'
import type { AppDispatch, RootState } from '../../../app/store'
import { beginIamProbe, finishIamProbe } from '../model/iamAccessSlice'
import { iamAccessApi } from '../api/iamAccessApi'
import { Button } from '../../../shared/ui/Button'
import { Notice } from '../../../shared/ui/Badge'
import { ManagementPageShell } from '../../../shared/ui/ManagementPage'

export function IamAccessGate({ children }: { children: React.ReactNode }) {
  const status = useSelector((state: RootState) => state.iamAccess.status)
  const dispatch = useDispatch<AppDispatch>()
  const store = useStore<RootState>()
  const [error, setError] = useState('')
  async function probe() {
    if (store.getState().iamAccess.status !== 'denied') return
    setError('')
    dispatch(beginIamProbe())
    const before = store.getState()
    const epoch = before.iamAccess.epoch
    const generation = before.auth.sessionGeneration
    const request = dispatch(
      iamAccessApi.endpoints.probe.initiate(undefined, { forceRefetch: true, subscribe: false }),
    )
    try {
      const response = await request.unwrap()
      const current = store.getState()
      if (
        current.auth.sessionGeneration !== generation ||
        current.iamAccess.epoch !== epoch ||
        current.iamAccess.status !== 'checking'
      )
        return
      const canonical = ['SHOP_OWNER', 'SALES_STAFF', 'ACCOUNTANT', 'SHIPPER', 'CUSTOMER']
      const valid =
        response.success === true &&
        Array.isArray(response.data) &&
        response.data.length === canonical.length &&
        response.data.every(
          (role, index) =>
            typeof role.id === 'string' &&
            role.id.length > 0 &&
            role.code === canonical[index] &&
            (role.description == null || typeof role.description === 'string') &&
            typeof role.active === 'boolean' &&
            Array.isArray(role.permissions) &&
            role.permissions.every(
              (permission) =>
                typeof permission.id === 'string' &&
                permission.id.length > 0 &&
                typeof permission.code === 'string' &&
                (permission.description == null || typeof permission.description === 'string'),
            ),
        )
      dispatch(finishIamProbe({ epoch, allowed: valid }))
      if (valid) dispatch(iamAccessApi.util.resetApiState())
      else setError('Không thể xác nhận quyền truy cập. Vui lòng thử lại.')
    } catch {
      const current = store.getState()
      if (
        current.auth.sessionGeneration !== generation ||
        current.iamAccess.epoch !== epoch ||
        current.iamAccess.status !== 'checking'
      )
        return
      dispatch(finishIamProbe({ epoch, allowed: false }))
      setError('Chưa thể xác nhận quyền truy cập. Vui lòng thử lại.')
    }
  }
  if (status === 'denied' || status === 'checking') {
    return (
      <ManagementPageShell>
        <section
          className="flex flex-col items-start gap-3.5 rounded-card border border-aqs-border bg-aqs-surface p-6"
          role="alert"
        >
          <div className="flex items-center gap-2.5 text-aqs-danger">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            <h1 className="m-0 text-xl font-bold text-aqs-ink">Không có quyền truy cập</h1>
          </div>
          <p className="m-0 text-sm text-aqs-ink-muted">
            Máy chủ không cho phép tài khoản này quản lý vai trò và quyền.
          </p>
          {error && (
            <Notice tone="danger" role="alert">
              {error}
            </Notice>
          )}
          <Button
            type="button"
            variant="primary"
            loading={status === 'checking'}
            disabled={status === 'checking'}
            onClick={() => void probe()}
          >
            {status === 'checking' ? 'Đang kiểm tra...' : 'Kiểm tra lại quyền'}
          </Button>
        </section>
      </ManagementPageShell>
    )
  }
  return <>{children}</>
}
