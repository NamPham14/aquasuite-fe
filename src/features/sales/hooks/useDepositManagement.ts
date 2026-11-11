import { useCallback, useEffect, useRef, useState } from 'react'
import { createDemoDepositRepository } from '../api/demoDepositRepository'
import type { DepositOrder, DepositRepository } from '../types/deposit.types'

export function useDepositManagement() {
  const [repository] = useState<DepositRepository>(createDemoDepositRepository)
  const [orders, setOrders] = useState<DepositOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const mounted = useRef(false)
  const reload = useCallback(async () => {
    setLoading(true); setError('')
    try { const rows = await repository.list(); if (mounted.current) setOrders(rows) }
    catch { if (mounted.current) setError('Không tải được dữ liệu demo. Vui lòng thử lại.') }
    finally { if (mounted.current) setLoading(false) }
  }, [repository])
  useEffect(() => {
    mounted.current = true
    let active = true
    void repository.list().then((rows) => { if (active) { setOrders(rows); setLoading(false) } }).catch(() => { if (active) { setError('Không tải được dữ liệu demo. Vui lòng thử lại.'); setLoading(false) } })
    return () => { active = false; mounted.current = false }
  }, [repository])
  async function run(action: (port: DepositRepository) => Promise<unknown>) {
    if (lock.current) return false
    lock.current = true; setBusy(true); setError('')
    try {
      await action(repository)
      const rows = await repository.list()
      if (mounted.current) setOrders(rows)
      return true
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Không thực hiện được thao tác.'); return false }
    finally { lock.current = false; if (mounted.current) setBusy(false) }
  }
  return { orders, loading, busy, error, reload, run, clearError: () => setError('') }
}
