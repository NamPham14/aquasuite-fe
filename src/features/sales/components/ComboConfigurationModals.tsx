import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  FileText,
  Layers,
  Minus,
  Package,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatVnd } from '../../../shared/lib/money.ts'
import { CustomerEditorialModal } from '../../servicedesk/components/CustomerEditorialModal.tsx'
import {
  isSafeHttpUrl,
  SPEC_LABELS,
  type ParsedComboComponent,
} from '../lib/comboComponents.ts'

interface ComboComponentDetailModalProps {
  comboName: string
  components: ParsedComboComponent[]
  activeIndex: number | null
  quantitiesInCart: Record<string, number>
  pendingVariantIds: Record<string, boolean>
  onSelectIndex: (index: number | null) => void
  onAddToCart: (variantId: string, quantity: number) => Promise<boolean>
}

/**
 * Pop-up hiển thị đầy đủ chi tiết từng thiết bị trong cấu hình Combo ngay tại trang Combo,
 * giúp khách xem ảnh, giá, tồn kho, mô tả và thông số kỹ thuật mà không phải thoát trang.
 */
export function ComboComponentDetailModal({
  comboName,
  components,
  activeIndex,
  quantitiesInCart,
  pendingVariantIds,
  onSelectIndex,
  onAddToCart,
}: ComboComponentDetailModalProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({})
  const [justAddedId, setJustAddedId] = useState<string | null>(null)

  if (activeIndex === null || activeIndex < 0 || activeIndex >= components.length) {
    return null
  }

  const comp = components[activeIndex]
  const item = comp.catalogItem
  const imgFailed = item ? Boolean(failedImages[item.variantId]) : true
  const inStock = Boolean(item && item.availableStock > 0)
  const isPending = Boolean(item && pendingVariantIds[item.variantId])
  const inCartQty = item ? quantitiesInCart[item.variantId] ?? 0 : 0
  const specEntries = item?.specifications ? Object.entries(item.specifications) : []
  const orderQty = item ? Math.max(1, Math.min(comp.quantity, Math.floor(item.availableStock) || 1)) : 1

  const handleAddSingle = async () => {
    if (!item || !inStock || isPending) return
    const ok = await onAddToCart(item.variantId, orderQty)
    if (ok) {
      setJustAddedId(item.variantId)
      window.setTimeout(() => setJustAddedId(null), 1800)
    }
  }

  return (
    <CustomerEditorialModal
      eyebrow={`Thiết bị ${String(activeIndex + 1).padStart(2, '0')} / ${String(components.length).padStart(2, '0')} · ${comboName}`}
      title={item?.name ?? comp.displayName}
      onClose={() => onSelectIndex(null)}
      maxWidthClass="w-[min(95vw,820px)]"
    >
      <div className="p-6 space-y-6">
        {!item ? (
          <div className="border border-[#E6E2DA] bg-[#FAF9F6] p-6 space-y-3 text-xs sm:text-sm text-[#57534E]">
            <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#8C6D46]">
              SKU: {comp.sku ?? 'Đang cập nhật'} &middot; Định mức trong gói: x{comp.quantity}
            </p>
            <p className="text-base font-medium text-[#171614]">{comp.displayName}</p>
            <p className="leading-relaxed">
              Thiết bị này hiện không mở bán lẻ riêng trong danh mục công khai hoặc đang tạm ngưng kinh doanh lẻ. Vui lòng liên hệ Showroom để được tư vấn thông số chi tiết.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-5 relative aspect-[4/3.6] bg-[#EFECE6] overflow-hidden border border-[#E6E2DA] flex items-center justify-center">
                {item.imageUrl && !imgFailed ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    onError={() =>
                      setFailedImages((prev) => ({
                        ...prev,
                        [item.variantId]: true,
                      }))
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center">
                    <span className="font-editorial text-2xl tracking-[0.06em] text-[#57534E]">
                      {item.brand || 'AquaSuite'}
                    </span>
                    <span className="mt-2 border-t border-[#D6D1C7] pt-2 text-[11px] font-mono tracking-[0.14em] text-[#78736A]">
                      {item.sku}
                    </span>
                  </div>
                )}
              </div>

              <div className="md:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#78736A]">
                  <span className="font-semibold text-[#8C6D46]">{item.brand}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span>{item.category}</span>
                  <span aria-hidden="true">&middot;</span>
                  <span className="font-mono text-[#171614]">SKU: {item.sku}</span>
                </div>

                <div className="border-y border-[#E6E2DA] py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#78736A] block">
                      Giá bán lẻ tham khảo
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-2xl font-semibold text-[#171614] tabular-nums">
                        {formatVnd(item.sellingPrice)}
                      </span>
                      <span className="text-xs text-[#78736A]">/ {item.unit}</span>
                    </div>
                  </div>

                  {inStock ? (
                    <span className="inline-flex items-center border border-[#C6DDD0] bg-[#EEF5F1] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-semibold text-[#245C42] tabular-nums">
                      Sẵn kho &middot; {item.availableStock} {item.unit}
                    </span>
                  ) : (
                    <span className="inline-flex items-center bg-[#171614]/88 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] font-medium text-[#FAF9F6]">
                      Tạm hết hàng
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 border border-[#E6E2DA] bg-[#FAF9F6] px-2.5 py-1 text-[#171614]">
                    <Layers className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
                    <span>
                      Định mức trong cấu hình: <strong>x{comp.quantity}</strong> {item.unit}
                    </span>
                  </span>
                  {inCartQty > 0 && (
                    <span className="inline-flex items-center gap-1 border border-[#C6DDD0] bg-[#EEF5F1] px-2.5 py-1 text-[#245C42] tabular-nums">
                      Trong giỏ: <strong>{inCartQty}</strong>
                    </span>
                  )}
                </div>

                {item.description && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#78736A] font-semibold">
                      Mô tả thiết bị
                    </p>
                    <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed font-light">
                      {item.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {specEntries.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-[#171614] flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
                  <span>Thông số kỹ thuật &amp; Bảo hành</span>
                </p>
                <div className="border border-[#E6E2DA] overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <tbody className="divide-y divide-[#E6E2DA]">
                      {specEntries.map(([key, rawVal], idx) => {
                        const label = SPEC_LABELS[key] ?? key
                        const values = Array.isArray(rawVal) ? rawVal.map(String) : [String(rawVal)]
                        return (
                          <tr key={key} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAF9F6]'}>
                            <td className="py-2.5 px-4 w-2/5 text-[11px] uppercase tracking-[0.1em] font-medium text-[#78736A] border-r border-[#E6E2DA]">
                              {label}
                            </td>
                            <td className="py-2.5 px-4 font-medium text-[#171614] break-words">
                              <div className="flex flex-wrap gap-2">
                                {values.map((val) =>
                                  isSafeHttpUrl(val) ? (
                                    <a
                                      key={val}
                                      href={val}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 border border-[#D6D1C7] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#171614] hover:border-[#171614] transition-colors"
                                    >
                                      <FileText className="h-3 w-3 text-[#8C6D46]" aria-hidden="true" />
                                      <span>Xem tài liệu</span>
                                    </a>
                                  ) : (
                                    <span key={val}>{val}</span>
                                  ),
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        <div className="pt-4 border-t border-[#E6E2DA] flex flex-wrap items-center justify-between gap-3">
          {components.length > 1 ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onSelectIndex((activeIndex - 1 + components.length) % components.length)
                }
                className="inline-flex items-center gap-1 border border-[#D6D1C7] bg-white px-3 py-2 text-[11px] uppercase tracking-[0.12em] font-medium text-[#171614] hover:border-[#171614] cursor-pointer transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Thiết bị trước</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectIndex((activeIndex + 1) % components.length)}
                className="inline-flex items-center gap-1 border border-[#D6D1C7] bg-white px-3 py-2 text-[11px] uppercase tracking-[0.12em] font-medium text-[#171614] hover:border-[#171614] cursor-pointer transition-colors"
              >
                <span>Thiết bị tiếp</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div />
          )}

          <div className="flex flex-wrap items-center gap-2.5">
            {item && (
              <>
                <Link
                  to={`/products/${encodeURIComponent(item.variantId)}`}
                  onClick={() => onSelectIndex(null)}
                  className="inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#171614] hover:border-[#171614] transition-colors"
                >
                  <span>Trang sản phẩm</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>

                <button
                  type="button"
                  disabled={!inStock || isPending}
                  onClick={() => void handleAddSingle()}
                  className={`inline-flex items-center gap-1.5 border px-5 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                    justAddedId === item.variantId
                      ? 'border-[#245C42] bg-[#245C42] text-white'
                      : 'border-[#171614] bg-[#171614] text-[#FAF9F6] hover:bg-[#2A2825]'
                  }`}
                >
                  {justAddedId === item.variantId ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Đã thêm vào giỏ</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {inStock ? `Thêm x${orderQty} vào giỏ` : 'Tạm hết hàng'}
                      </span>
                    </>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onSelectIndex(null)}
              className="border border-[#D6D1C7] bg-[#FAF9F6] px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#57534E] hover:border-[#171614] hover:text-[#171614] cursor-pointer transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </CustomerEditorialModal>
  )
}

interface ComboComponentPickerModalProps {
  isOpen: boolean
  comboName: string
  components: ParsedComboComponent[]
  quantitiesInCart: Record<string, number>
  pendingVariantIds: Record<string, boolean>
  onClose: () => void
  onInspectComponent: (index: number) => void
  onAddToCart: (variantId: string, quantity: number) => Promise<boolean>
}

function ComboComponentPickerContent({
  comboName,
  components,
  quantitiesInCart,
  pendingVariantIds,
  onClose,
  onInspectComponent,
  onAddToCart,
}: Omit<ComboComponentPickerModalProps, 'isOpen'>) {
  const initialSelections = useMemo(() => {
    const selected: Record<number, boolean> = {}
    const quantities: Record<number, number> = {}
    for (const comp of components) {
      const stock = Math.floor(comp.catalogItem?.availableStock ?? 0)
      selected[comp.index] = Boolean(comp.catalogItem && stock > 0)
      quantities[comp.index] =
        stock > 0 ? Math.max(1, Math.min(comp.quantity, stock)) : comp.quantity
    }
    return { selected, quantities }
  }, [components])

  const [selectedMap, setSelectedMap] = useState<Record<number, boolean>>(
    initialSelections.selected,
  )
  const [qtyMap, setQtyMap] = useState<Record<number, number>>(initialSelections.quantities)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const availableComponents = components.filter(
    (c) => c.catalogItem && c.catalogItem.availableStock > 0,
  )
  const selectedTargets = availableComponents.filter((c) => selectedMap[c.index])
  const estimatedSubtotal = selectedTargets.reduce((sum, c) => {
    const qty = qtyMap[c.index] ?? c.quantity
    return sum + (c.catalogItem?.sellingPrice ?? 0) * qty
  }, 0)

  const handleConfirmSelected = async () => {
    if (selectedTargets.length === 0 || isSubmitting) return
    setIsSubmitting(true)
    try {
      let successCount = 0
      for (const comp of selectedTargets) {
        if (!comp.catalogItem) continue
        const qty = Math.max(
          1,
          Math.min(
            qtyMap[comp.index] ?? comp.quantity,
            Math.floor(comp.catalogItem.availableStock),
          ),
        )
        const ok = await onAddToCart(comp.catalogItem.variantId, qty)
        if (ok) successCount += 1
      }
      if (successCount > 0) {
        toast.success(`Đã thêm ${successCount} thiết bị trong cấu hình vào giỏ hàng`)
        onClose()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <CustomerEditorialModal
      eyebrow="Cấu hình trọn bộ"
      title={`Chọn thiết bị — ${comboName}`}
      onClose={onClose}
      closeDisabled={isSubmitting}
      maxWidthClass="w-[min(95vw,760px)]"
    >
      <div className="p-6 space-y-5">
        {components.length === 0 ? (
          <div className="border-l-2 border-[#8C6D46] bg-[#FAF9F6] px-4 py-3 text-xs text-[#57534E] leading-relaxed">
            Gói Combo này chưa có danh sách thiết bị cấu thành công khai. Bạn có thể xem thêm các thiết bị riêng lẻ tại danh mục Showroom.
          </div>
        ) : (
          availableComponents.length === 0 && (
            <div className="border-l-2 border-[#8C6D46] bg-[#FAF9F6] px-4 py-3 text-xs text-[#57534E] leading-relaxed">
              Hiện các thiết bị trong cấu hình này đang tạm hết tồn kho khả dụng. Bạn vẫn có thể bấm{' '}
              <strong className="text-[#171614]">Xem chi tiết</strong> ở từng thiết bị bên dưới để xem
              giá, mô tả và thông số kỹ thuật mà không cần rời trang.
            </div>
          )
        )}

        {components.length > 0 && (
          <ul className="border border-[#E6E2DA] divide-y divide-[#E6E2DA] bg-white">
            {components.map((comp) => {
              const item = comp.catalogItem
              const maxQty = item ? Math.max(0, Math.floor(item.availableStock)) : 0
              const inStock = maxQty > 0
              const isChecked = inStock && Boolean(selectedMap[comp.index])
              const currentQty = qtyMap[comp.index] ?? comp.quantity
              const isPending = Boolean(item && pendingVariantIds[item.variantId])
              const inCartQty = item ? quantitiesInCart[item.variantId] ?? 0 : 0

              return (
                <li
                  key={`${comp.raw}-${comp.index}`}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    inStock ? 'bg-white' : 'bg-[#FAF9F6]/70'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={!inStock || isSubmitting || isPending}
                      aria-label={`Chọn ${item?.name ?? comp.displayName}`}
                      onChange={(e) =>
                        setSelectedMap((prev) => ({ ...prev, [comp.index]: e.target.checked }))
                      }
                      className="mt-1 h-4 w-4 accent-[#171614] cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />

                    <div className="h-14 w-14 shrink-0 border border-[#E6E2DA] bg-[#EFECE6] overflow-hidden flex items-center justify-center">
                      {item?.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-[#78736A]" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#78736A]">
                        <span className="font-editorial text-xs text-[#8C6D46]">
                          {String(comp.index + 1).padStart(2, '0')}
                        </span>
                        {comp.sku && <span className="font-mono text-[#171614]">{comp.sku}</span>}
                        <span>&middot; Định mức x{comp.quantity}</span>
                        {inCartQty > 0 && (
                          <span className="text-[#245C42] font-semibold">
                            (Trong giỏ: {inCartQty})
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-[#171614] leading-snug">
                        {item?.name ?? comp.displayName}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        {item && (
                          <span className="font-semibold text-[#171614] tabular-nums">
                            {formatVnd(item.sellingPrice)}{' '}
                            <span className="font-normal text-[#78736A]">/ {item.unit}</span>
                          </span>
                        )}
                        {inStock ? (
                          <span className="text-[11px] font-medium text-[#245C42] tabular-nums">
                            Sẵn kho: {item?.availableStock} {item?.unit}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-[#78736A]">
                            Tạm hết hàng (Tồn: 0)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pl-7 sm:pl-0">
                    {inStock && (
                      <div className="inline-flex items-center border border-[#D6D1C7] bg-[#FAF9F6] h-9">
                        <button
                          type="button"
                          disabled={!isChecked || currentQty <= 1 || isSubmitting}
                          aria-label={`Giảm số lượng ${comp.displayName}`}
                          onClick={() =>
                            setQtyMap((prev) => ({
                              ...prev,
                              [comp.index]: Math.max(1, (prev[comp.index] ?? comp.quantity) - 1),
                            }))
                          }
                          className="px-2.5 h-full text-[#57534E] hover:text-[#171614] disabled:opacity-35 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <span className="w-9 text-center text-xs font-semibold tabular-nums bg-white h-full flex items-center justify-center border-x border-[#E6E2DA]">
                          {currentQty}
                        </span>
                        <button
                          type="button"
                          disabled={!isChecked || currentQty >= maxQty || isSubmitting}
                          aria-label={`Tăng số lượng ${comp.displayName}`}
                          onClick={() =>
                            setQtyMap((prev) => ({
                              ...prev,
                              [comp.index]: Math.min(maxQty, (prev[comp.index] ?? comp.quantity) + 1),
                            }))
                          }
                          className="px-2.5 h-full text-[#57534E] hover:text-[#171614] disabled:opacity-35 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onInspectComponent(comp.index)
                      }}
                      className="inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-3 py-2 text-[11px] uppercase tracking-[0.12em] font-semibold text-[#171614] hover:border-[#171614] cursor-pointer transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
                      <span>Xem chi tiết</span>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="pt-4 border-t border-[#E6E2DA] flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#57534E]">
            {selectedTargets.length > 0 ? (
              <span>
                Đã chọn <strong className="text-[#171614]">{selectedTargets.length}</strong> thiết bị
                &middot; Tạm tính:{' '}
                <strong className="text-[#171614] tabular-nums">
                  {formatVnd(estimatedSubtotal)}
                </strong>
              </span>
            ) : (
              <span>Chưa có thiết bị sẵn kho nào được chọn</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="border border-[#D6D1C7] bg-white px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#57534E] hover:border-[#171614] hover:text-[#171614] cursor-pointer transition-colors"
            >
              Đóng
            </button>

            {availableComponents.length > 0 ? (
              <button
                type="button"
                disabled={selectedTargets.length === 0 || isSubmitting}
                onClick={() => void handleConfirmSelected()}
                className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {isSubmitting
                    ? 'Đang thêm vào giỏ...'
                    : `Thêm ${selectedTargets.length} thiết bị vào giỏ`}
                </span>
              </button>
            ) : (
              <Link
                to="/storefront#catalog"
                onClick={onClose}
                className="inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-5 py-2.5 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] transition-colors"
              >
                <span>Xem thiết bị còn hàng</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-[#C5B091]" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </CustomerEditorialModal>
  )
}

/**
 * Wrapper cho phép reset trạng thái chọn thiết bị mỗi lần mở lại Pop-up.
 */
export function ComboComponentPickerModal({
  isOpen,
  ...rest
}: ComboComponentPickerModalProps) {
  if (!isOpen) return null
  return <ComboComponentPickerContent {...rest} />
}
