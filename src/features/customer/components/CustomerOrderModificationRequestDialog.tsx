import { useState, type FormEvent } from 'react'
import { ArrowLeftRight, MapPin, Plus, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import { formatVnd } from '../../../shared/lib/money.ts'
import { useGetSalesCatalogItemsQuery } from '../../sales/api/salesCatalogApi.ts'
import { useCreateMyOrderModificationRequestMutation } from '../../sales/api/orderModificationRequestApi.ts'
import type {
  CreateMyOrderModificationRequestPayload,
  CreateOrderModificationItemPayload,
  OrderModificationRequestType,
} from '../../sales/types/orderModificationRequest.types.ts'
import type { SalesOrderDetailResponse, SalesOrderItemResponse } from '../../sales/types/salesOrder.types.ts'
import { CustomerEditorialModal, editorialFieldClass } from '../../servicedesk/components/CustomerEditorialModal.tsx'

const REQUEST_TYPE_LABEL: Record<OrderModificationRequestType, string> = {
  ADDRESS_CHANGE: 'Đổi địa chỉ giao hàng',
  ITEM_CHANGE: 'Đổi hàng / giảm mặt hàng',
  FULL_CANCELLATION: 'Hủy toàn bộ đơn hàng',
}

interface CustomerOrderModificationRequestDialogProps {
  order?: SalesOrderDetailResponse
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  onClose: () => void
}

interface RequestItemForm extends CreateOrderModificationItemPayload {
  orderItemId: string
}

export function CustomerOrderModificationRequestDialog({
  order,
  isLoading,
  isError,
  onRetry,
  onClose,
}: CustomerOrderModificationRequestDialogProps) {
  const [requestType, setRequestType] = useState<OrderModificationRequestType>('ADDRESS_CHANGE')
  const [customerReason, setCustomerReason] = useState('')
  const [requestedDeliveryAddress, setRequestedDeliveryAddress] = useState<string | null>(null)
  const [items, setItems] = useState<RequestItemForm[]>([])
  const [validationMessage, setValidationMessage] = useState('')
  const [createRequest, createState] = useCreateMyOrderModificationRequestMutation()
  const catalogQuery = useGetSalesCatalogItemsQuery(undefined, {
    skip: requestType !== 'ITEM_CHANGE',
  })

  const catalogOptions = (catalogQuery.data ?? []).filter((item) => !item.isCombo)
  const requestableOrderItems = order
    ? order.items.filter((item) => item.quantity > 0
      && (order.orderStatus !== 'PENDING_CONFIRMATION' || !item.comboId))
    : []

  function updateItem(index: number, patch: Partial<RequestItemForm>) {
    setItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )))
    setValidationMessage('')
  }

  function addItem() {
    setItems((current) => [...current, { orderItemId: '', changeAction: 'REDUCE' }])
    setValidationMessage('')
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!order) return
    if (order.orderStatus !== 'PROCESSING' && order.orderStatus !== 'PENDING_CONFIRMATION') {
      setValidationMessage('Chỉ gửi yêu cầu với đơn hàng đang chờ xác nhận hoặc đang xử lý.')
      return
    }
    if (requestType === 'ITEM_CHANGE' && order.orderStatus === 'PENDING_CONFIRMATION'
      && (order.paymentMethod !== 'CASH' || order.paymentStatus !== 'UNPAID')) {
      setValidationMessage('Chỉ có thể yêu cầu đổi sản phẩm trước khi xác nhận với đơn COD chưa thanh toán.')
      return
    }

    const reason = customerReason.trim()
    if (!reason || reason.length > 1000) {
      setValidationMessage('Vui lòng nhập lý do từ 1 đến 1000 ký tự.')
      return
    }

    if (requestType === 'ADDRESS_CHANGE') {
      const address = (requestedDeliveryAddress ?? order.deliveryAddress ?? '').trim()
      if (!address || address.length > 500) {
        setValidationMessage('Vui lòng nhập địa chỉ mới, tối đa 500 ký tự.')
        return
      }
    }

    let requestItems: CreateOrderModificationItemPayload[] | undefined
    if (requestType === 'ITEM_CHANGE') {
      if (items.length === 0 || items.some((item) => !item.orderItemId)) {
        setValidationMessage('Thêm ít nhất một mặt hàng và chọn mặt hàng cần thay đổi.')
        return
      }
      if (new Set(items.map((item) => item.orderItemId)).size !== items.length) {
        setValidationMessage('Mỗi mặt hàng chỉ được chọn một lần.')
        return
      }
      const orderItemsById = new Map(order.items.map((item) => [item.orderItemId, item]))
      const invalidItem = items.some((item) => {
        const orderItem = orderItemsById.get(item.orderItemId)
        if (!orderItem) return true
        if (item.changeAction === 'REDUCE') {
          return item.requestedQuantity === undefined
            || !Number.isFinite(item.requestedQuantity)
            || item.requestedQuantity <= 0
            || item.requestedQuantity >= orderItem.quantity
            || Math.abs(item.requestedQuantity * 100 - Math.round(item.requestedQuantity * 100)) > 1e-8
        }
        if (item.changeAction === 'SWAP') {
          return !item.requestedVariantId
            || item.requestedVariantId === orderItem.variantId
            || !catalogOptions.some((option) => option.variantId === item.requestedVariantId)
        }
        return false
      })
      if (invalidItem) {
        setValidationMessage('Kiểm tra lại số lượng hoặc sản phẩm thay thế đã chọn.')
        return
      }
      requestItems = items.map((item) => ({
        orderItemId: item.orderItemId,
        changeAction: item.changeAction,
        ...(item.changeAction === 'REDUCE' ? { requestedQuantity: item.requestedQuantity } : {}),
        ...(item.changeAction === 'SWAP' ? { requestedVariantId: item.requestedVariantId } : {}),
      }))
    }

    const body: CreateMyOrderModificationRequestPayload = {
      requestType,
      customerReason: reason,
      ...(requestType === 'ADDRESS_CHANGE'
        ? { requestedDeliveryAddress: (requestedDeliveryAddress ?? order.deliveryAddress ?? '').trim() }
        : {}),
      ...(requestType === 'ITEM_CHANGE' ? { items: requestItems } : {}),
    }

    void createRequest({ orderId: order.orderId, body })
      .unwrap()
      .then((receipt) => {
        toast.success(`Đã gửi yêu cầu ${REQUEST_TYPE_LABEL[receipt.requestType].toLowerCase()} cho đơn ${order.orderCode}.`)
        onClose()
      })
      .catch((error: unknown) => toast.error(normalizeApiError(error).message))
  }

  return (
    <CustomerEditorialModal
      eyebrow="Đơn hàng của tôi"
      title={order ? `Gửi yêu cầu · ${order.orderCode}` : 'Gửi yêu cầu đổi / hủy đơn'}
      onClose={onClose}
      closeDisabled={createState.isLoading}
      maxWidthClass="w-[min(95vw,760px)]"
    >
      {isLoading ? (
        <div className="p-8 text-center text-xs text-[#78736A]" role="status">Đang tải chi tiết đơn hàng...</div>
      ) : isError || !order ? (
        <div className="space-y-3 p-8 text-center" role="alert">
          <p className="text-sm text-[#991B1B]">Không thể tải chi tiết đơn hàng để tạo yêu cầu.</p>
          <button type="button" onClick={onRetry} className="border border-[#171614] px-4 py-2 text-xs font-semibold">
            Thử tải lại
          </button>
        </div>
      ) : order.orderStatus !== 'PROCESSING' && order.orderStatus !== 'PENDING_CONFIRMATION' ? (
        <div className="p-8 text-center text-sm text-[#854D0E]">
          Đơn hàng không còn ở trạng thái chờ xác nhận hoặc đang xử lý nên không thể gửi yêu cầu.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-2 border border-[#E6D3B3] bg-[#FAF5EB] p-3 text-xs leading-relaxed text-[#854D0E]">
            <ArrowLeftRight className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>Đây là yêu cầu chờ nhân viên xem xét. Gửi yêu cầu chưa làm thay đổi hoặc hủy đơn hàng của bạn.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="border border-[#E6E2DA] bg-[#FAF9F6] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Trạng thái</p>
              <p className="mt-1 text-xs font-semibold text-[#171614]">
                {order.orderStatus === 'PENDING_CONFIRMATION' ? 'Chờ xác nhận' : 'Đang xử lý'}
              </p>
            </div>
            {order.orderStatus === 'PENDING_CONFIRMATION'
              && (order.paymentMethod !== 'CASH' || order.paymentStatus !== 'UNPAID') && (
                <p className="border border-[#E6D3B3] bg-[#FAF5EB] p-3 text-xs leading-relaxed text-[#854D0E]">
                  Đơn thanh toán chuyển khoản hoặc đã thanh toán không thể đổi sản phẩm khi đang chờ xác nhận.
                  Bạn vẫn có thể yêu cầu đổi địa chỉ hoặc hủy đơn để nhân viên xem xét.
                </p>
              )}
            <div className="border border-[#E6E2DA] bg-[#FAF9F6] p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#78736A]">Giá trị đơn</p>
              <p className="mt-1 text-xs font-semibold tabular-nums text-[#171614]">{formatVnd(order.totalAmount)}</p>
            </div>
          </div>

          <label className="block text-xs font-semibold text-[#171614]">
            Loại yêu cầu
            <select
              value={requestType}
              onChange={(event) => {
                setRequestType(event.target.value as OrderModificationRequestType)
                setItems([])
                setValidationMessage('')
              }}
              className={editorialFieldClass}
            >
              <option value="ADDRESS_CHANGE">{REQUEST_TYPE_LABEL.ADDRESS_CHANGE}</option>
              <option
                value="ITEM_CHANGE"
                disabled={order.orderStatus === 'PENDING_CONFIRMATION'
                  && (order.paymentMethod !== 'CASH' || order.paymentStatus !== 'UNPAID')}
              >
                {REQUEST_TYPE_LABEL.ITEM_CHANGE}
              </option>
              <option value="FULL_CANCELLATION">{REQUEST_TYPE_LABEL.FULL_CANCELLATION}</option>
            </select>
          </label>

          {requestType === 'ADDRESS_CHANGE' && (
            <label className="block text-xs font-semibold text-[#171614]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
                Địa chỉ giao hàng mới
              </span>
              <textarea
                value={requestedDeliveryAddress ?? order.deliveryAddress ?? ''}
                onChange={(event) => setRequestedDeliveryAddress(event.target.value)}
                maxLength={500}
                rows={3}
                className={editorialFieldClass}
                placeholder="Nhập địa chỉ bạn muốn nhận hàng"
                required
              />
            </label>
          )}

          {requestType === 'ITEM_CHANGE' && (
            <section className="space-y-3" aria-labelledby="change-items-heading">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 id="change-items-heading" className="text-xs font-semibold text-[#171614]">Mặt hàng cần thay đổi</h3>
                  <p className="mt-1 text-[11px] text-[#78736A]">
                    Chọn giảm số lượng, bỏ mặt hàng hoặc đề xuất sản phẩm thay thế.
                    {order.orderStatus === 'PENDING_CONFIRMATION'
                      ? ' Đơn chờ xác nhận chỉ hỗ trợ đổi hàng khi thanh toán COD và chưa thanh toán.'
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 border border-[#D6D1C7] px-3 text-[11px] font-semibold text-[#171614] hover:border-[#171614]"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Thêm mặt hàng
                </button>
              </div>

              {requestableOrderItems.length === 0 && (
                <p className="border border-[#E5B8B8] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
                  Đơn hàng không có mặt hàng có thể yêu cầu thay đổi.
                </p>
              )}
              {items.map((item, index) => {
                const currentItem = order.items.find((candidate) => candidate.orderItemId === item.orderItemId)
                const alreadySelected = new Set(items.flatMap((selected, selectedIndex) => (
                  selectedIndex !== index && selected.orderItemId ? [selected.orderItemId] : []
                )))
                return (
                  <div key={index} className="grid gap-3 border border-[#E6E2DA] bg-white p-3 sm:grid-cols-2">
                    <label className="block text-[11px] font-semibold text-[#57534E]">
                      Mặt hàng
                      <select
                        value={item.orderItemId}
                        onChange={(event) => updateItem(index, { orderItemId: event.target.value })}
                        className={editorialFieldClass}
                        required
                      >
                        <option value="">Chọn mặt hàng trong đơn</option>
                        {requestableOrderItems.filter((orderItem) => (
                          !alreadySelected.has(orderItem.orderItemId)
                        )).map((orderItem: SalesOrderItemResponse) => (
                          <option key={orderItem.orderItemId} value={orderItem.orderItemId}>
                            {orderItem.productName} · {orderItem.variantName} (SL {orderItem.quantity})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[11px] font-semibold text-[#57534E]">
                      Thao tác
                      <select
                        value={item.changeAction}
                        onChange={(event) => updateItem(index, {
                          changeAction: event.target.value as RequestItemForm['changeAction'],
                          requestedQuantity: undefined,
                          requestedVariantId: undefined,
                        })}
                        className={editorialFieldClass}
                      >
                        <option value="REDUCE">Giảm số lượng</option>
                        <option value="REMOVE">Bỏ mặt hàng</option>
                        <option value="SWAP">Đổi sang sản phẩm khác</option>
                      </select>
                    </label>
                    {item.changeAction === 'REDUCE' && (
                      <label className="block text-[11px] font-semibold text-[#57534E]">
                        Số lượng mong muốn
                        <input
                          type="number"
                          min="0.01"
                          max={currentItem ? Math.max(0, currentItem.quantity - 0.01) : undefined}
                          step="0.01"
                          value={item.requestedQuantity ?? ''}
                          onChange={(event) => updateItem(index, {
                            requestedQuantity: event.target.value ? Number(event.target.value) : undefined,
                          })}
                          className={editorialFieldClass}
                          required
                        />
                      </label>
                    )}
                    {item.changeAction === 'SWAP' && (
                      <label className="block text-[11px] font-semibold text-[#57534E]">
                        Sản phẩm thay thế
                        <select
                          value={item.requestedVariantId ?? ''}
                          onChange={(event) => updateItem(index, { requestedVariantId: event.target.value || undefined })}
                          className={editorialFieldClass}
                          disabled={catalogQuery.isLoading || catalogQuery.isError}
                          required
                        >
                          <option value="">
                            {catalogQuery.isLoading ? 'Đang tải sản phẩm…' : 'Chọn sản phẩm thay thế'}
                          </option>
                          {catalogOptions.filter((option) => option.variantId !== currentItem?.variantId).map((option) => (
                            <option key={option.variantId} value={option.variantId}>
                              {option.sku} · {option.name} · {formatVnd(option.sellingPrice)}
                            </option>
                          ))}
                        </select>
                        {catalogQuery.isError && (
                          <span className="mt-1 block font-normal text-[#991B1B]">
                            Không tải được danh sách sản phẩm.
                            <button
                              type="button"
                              onClick={() => void catalogQuery.refetch()}
                              className="ml-1 font-semibold underline"
                            >
                              Thử lại
                            </button>
                          </span>
                        )}
                      </label>
                    )}
                    <div className="flex items-end justify-end">
                      <button
                        type="button"
                        onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        className="inline-flex h-9 cursor-pointer items-center gap-1.5 border border-[#E5B8B8] px-3 text-[11px] font-semibold text-[#991B1B] hover:bg-[#FEF2F2]"
                        aria-label={`Bỏ mặt hàng yêu cầu số ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Bỏ dòng
                      </button>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          <label className="block text-xs font-semibold text-[#171614]">
            Lý do gửi yêu cầu
            <textarea
              value={customerReason}
              onChange={(event) => setCustomerReason(event.target.value)}
              maxLength={1000}
              rows={3}
              className={editorialFieldClass}
              placeholder="Cho nhân viên biết lý do bạn muốn thay đổi đơn hàng"
              required
            />
          </label>

          {validationMessage && (
            <p className="border border-[#E5B8B8] bg-[#FEF2F2] px-3 py-2 text-xs text-[#991B1B]" role="alert">
              {validationMessage}
            </p>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-[#E6E2DA] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={createState.isLoading}
              className="h-9 cursor-pointer border border-[#D6D1C7] px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#57534E] hover:border-[#171614] disabled:opacity-50"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={createState.isLoading || (requestType === 'ITEM_CHANGE' && items.length === 0)}
              className="inline-flex h-9 cursor-pointer items-center gap-2 border border-[#171614] bg-[#171614] px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#2A2825] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {createState.isLoading ? 'Đang gửi…' : 'Gửi yêu cầu'}
            </button>
          </div>
        </form>
      )}
    </CustomerEditorialModal>
  )
}
