import { ArrowDownToLine, CheckCircle2, Clock } from 'lucide-react'
import type {
  PurchaseOrderItemResponse,
  PurchaseOrderReceiptItemResponse,
} from '../types/purchaseOrder.types'

interface ReceiptProgressTableProps {
  items: PurchaseOrderItemResponse[]
  receipts?: PurchaseOrderReceiptItemResponse[]
}

export function ReceiptProgressTable({ items, receipts = [] }: ReceiptProgressTableProps) {
  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(val)
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val)
  }

  return (
    <div className="space-y-6">
      {/* Tiêu chí tiến độ nhận hàng từng dòng */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-sky-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              Tiến độ nhận hàng theo sản phẩm
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {items.length} mặt hàng
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-100 font-medium">
              <tr>
                <th className="px-4 py-3">Sản phẩm / SKU</th>
                <th className="px-4 py-3 text-center">ĐVT</th>
                <th className="px-4 py-3 text-right">Số lượng đặt</th>
                <th className="px-4 py-3 text-right">Đã nhận</th>
                <th className="px-4 py-3 text-right">Còn lại</th>
                <th className="px-4 py-3 text-center w-48">Tiến độ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((it) => {
                const percent = Math.min(
                  100,
                  Math.round((it.receivedQty / (it.quantity || 1)) * 100)
                )
                const isFullyReceived = it.remainingQty <= 0

                return (
                  <tr key={it.poItemId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{it.productName}</div>
                      <div className="text-xs font-mono text-slate-500">{it.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-slate-600 font-medium">
                      {it.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatNumber(it.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                      {formatNumber(it.receivedQty)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-600">
                      {formatNumber(it.remainingQty)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isFullyReceived ? 'bg-emerald-500' : 'bg-sky-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-medium text-slate-600 w-10 text-right">
                          {percent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danh sách các phiếu nhập kho thực tế */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-slate-800">
              Lịch sử các phiếu nhập kho liên quan
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {receipts.length} đợt nhập
          </span>
        </div>

        {receipts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Chưa có phiếu nhập kho nào được ghi nhận cho đơn mua hàng này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-100 font-medium">
                <tr>
                  <th className="px-4 py-3">Mã phiếu nhập</th>
                  <th className="px-4 py-3">Ngày nhập</th>
                  <th className="px-4 py-3">Số hóa đơn NCC</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Tổng giá trị</th>
                  <th className="px-4 py-3">Thời điểm xác nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((rc) => (
                  <tr key={rc.goodsReceiptId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-sky-600">
                      {rc.receiptCode}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {rc.receiptDate}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {rc.supplierInvoiceNo || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {rc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(rc.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono">
                      {rc.confirmedAt ? new Date(rc.confirmedAt).toLocaleString('vi-VN') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
