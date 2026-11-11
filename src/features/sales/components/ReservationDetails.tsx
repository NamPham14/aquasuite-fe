import { useState } from 'react'
import { ManagementDialog } from '../../../shared/ui/ManagementDialog'
import { ReservationWorkspace } from './ReservationWorkspace'

export function ReservationDetails({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [blocked, setBlocked] = useState(false)
  return <ManagementDialog title="Cọc & hàng giữ" size="wide" closeDisabled={blocked} onClose={() => { if (!blocked) onClose() }}>
    <ReservationWorkspace key={orderId} orderId={orderId} onBlockedChange={setBlocked} />
  </ManagementDialog>
}
