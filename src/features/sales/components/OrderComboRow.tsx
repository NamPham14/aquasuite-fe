import type { SalesOrderDisplayItemResponse } from '../types/salesOrder.types'

export function OrderComboRow({ row, formatMoney }: {
  row: SalesOrderDisplayItemResponse
  formatMoney: (value?: number) => string
}) {
  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-4 py-2.5">
        <div className="font-semibold text-slate-900">{row.productName}</div>
        <span className="text-[10px] font-medium text-indigo-700">Combo</span>
        <details className="mt-1 text-[11px] text-slate-600">
          <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-sky-600">
            Xem {row.components.length} sản phẩm thành phần
          </summary>
          <ul className="mt-2 space-y-1.5">
            {row.components.map((item) => (
              <li key={item.orderItemId}>
                <span className="font-medium">{item.variantName || item.sku}</span>
                <span className="block text-slate-500">{item.sku} · SL: {item.quantity}</span>
              </li>
            ))}
          </ul>
        </details>
      </td>
      <td className="px-3 py-2.5 font-mono text-slate-600">{row.sku || 'Chưa có mã lưu'}</td>
      <td className="px-3 py-2.5 text-right font-medium">{row.unitPrice == null ? 'Chưa có giá lưu' : formatMoney(row.unitPrice)}</td>
      <td className="px-3 py-2.5 text-center font-semibold whitespace-nowrap">
        {row.quantity == null ? 'Chưa rõ số bộ' : `${row.quantity} bộ`}
      </td>
      <td className="px-3 py-2.5 text-right text-slate-500">{row.discountAmount != null && row.discountAmount > 0 ? formatMoney(row.discountAmount) : '-'}</td>
      <td className="px-4 py-2.5 text-right font-bold text-slate-900">{formatMoney(row.lineTotal)}</td>
    </tr>
  )
}
