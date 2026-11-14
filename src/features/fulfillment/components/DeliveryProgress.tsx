import { Check, Circle, Clock3 } from 'lucide-react'
import type { DeliveryDetail } from '../types/delivery.types'
import { DeliveryPanel } from './DeliveryUi'
import { deliveryDate } from './deliveryPresentation'

export function DeliveryProgress({ detail }: { detail: DeliveryDetail }) {
  const row = detail.delivery
  const steps = [
    { label: 'Xác nhận xuất kho', date: row.confirmedAt ?? row.dispatchDate },
    { label: detail.shipperName ? `Phân công ${detail.shipperName}` : 'Phân công shipper', date: row.assignedAt },
    { label: 'Nhận hàng đi giao', date: row.startedAt },
    { label: 'Đã giao thành công', date: row.deliveredAt },
  ]
  const current = row.deliveryStatus === 'DRAFT' ? -1 : row.deliveryStatus === 'DISPATCHED' ? 0 : row.deliveryStatus === 'ASSIGNED' ? 1 : row.deliveryStatus === 'IN_TRANSIT' ? 2 : row.deliveryStatus === 'DELIVERED' ? 3 : -1
  const stopped = row.deliveryStatus === 'FAILED' || row.deliveryStatus === 'CANCELLED'
  return <DeliveryPanel title="Theo dõi tiến độ">
    <ol className="py-1" aria-label="Các mốc giao hàng">
      {steps.map((step, index) => {
        const recorded = !!step.date
        const active = current === index
        return <li key={index} aria-current={active ? 'step' : undefined} className="relative flex gap-4 pb-7 last:pb-0">
          {index < steps.length - 1 && <span aria-hidden="true" className={`absolute bottom-0 left-3 top-6 w-px ${recorded && steps[index + 1].date ? 'bg-sky-300' : 'bg-slate-200'}`} />}
          <span aria-hidden="true" className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${recorded ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-400'} ${active ? 'ring-2 ring-sky-600 ring-offset-2' : ''}`}>
            {recorded ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-2.5 w-2.5" />}
          </span>
          <div className="min-w-0 pt-0.5"><p className={`break-words text-sm ${recorded || active ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>{step.label}{active && <span className="ml-2 text-xs font-medium text-sky-700">Hiện tại</span>}</p>
            {step.date ? <time dateTime={step.date} className="mt-1 block text-xs tabular-nums text-slate-500">{deliveryDate(step.date)}</time> : <p className="mt-1 text-xs text-slate-500">Chưa ghi nhận thời điểm</p>}
          </div>
        </li>
      })}
    </ol>
    {row.deliveryStatus === 'DRAFT' && <p className="mt-4 text-sm text-slate-600">Phiếu đang ở trạng thái nháp, chưa xác nhận xuất kho.</p>}
    {row.deliveryStatus === 'RESCHEDULED' && <p className="mt-4 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-900"><Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><span>Đang chờ giao lại.{row.scheduledDate ? ` Hẹn giao: ${deliveryDate(row.scheduledDate)}.` : ' Chưa có lịch hẹn mới.'}</span></p>}
    {stopped && <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-800">{row.deliveryStatus === 'FAILED' ? 'Giao thất bại. Xem lý do trong ghi chú của đợt giao.' : 'Phiếu đã hủy.'}</p>}
  </DeliveryPanel>
}
