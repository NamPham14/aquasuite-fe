import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AlertCircle, CheckCircle2, FileText, ShoppingBag } from 'lucide-react'
import { ManagementDialog, ManagementForm, ManagementFormField, managementFieldClass } from '../../../shared/ui/ManagementDialog'
import { normalizeApiError } from '../../../shared/api/apiError'
import { useGetSalesOrderByIdQuery, useGetSalesOrdersQuery } from '../../sales/api/salesOrderApi'
import { useGetCustomerOptionsQuery } from '../../sales/api/customerApi'
import { useGetSalesCatalogItemsQuery } from '../../sales/api/salesCatalogApi'
import {
  useCreateAdHocWarrantyMutation,
  useCreateWarrantyFromOrderMutation,
  useGetVariantWarrantyInfoQuery,
  useGetWarrantyPoliciesQuery,
} from '../api/warrantyApi'
import {
  createAdHocWarrantySchema,
  createWarrantyFromOrderSchema,
  type CreateAdHocWarrantyValues,
  type CreateWarrantyFromOrderValues,
} from '../schemas/warrantySchemas'

type Mode = 'from-order' | 'ad-hoc'

function todayIsoDate(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addMonthsPreview(startDate: string, months: number): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || months <= 0) return null
  const [y, m, d] = startDate.split('-').map(Number)
  const targetMonthIndex = m - 1 + months
  const targetYear = y + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate()
  const clampedDay = Math.min(d, lastDay)
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
}

export function CreateWarrantyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated?: (warrantyRecordId: string) => void
}) {
  const [mode, setMode] = useState<Mode>('from-order')
  const [serverError, setServerError] = useState<string | null>(null)

  const [createFromOrder, { isLoading: isCreatingFromOrder }] = useCreateWarrantyFromOrderMutation()
  const [createAdHoc, { isLoading: isCreatingAdHoc }] = useCreateAdHocWarrantyMutation()
  const isSubmitting = isCreatingFromOrder || isCreatingAdHoc

  // Data lookups (tái sử dụng API của sales & catalog)
  const { data: ordersPage } = useGetSalesOrdersQuery({ page: 1, size: 50 })
  const eligibleOrders = useMemo(
    () =>
      (ordersPage?.items ?? []).filter(
        (o) => o.orderStatus !== 'CANCELLED' && o.orderStatus !== 'DRAFT',
      ),
    [ordersPage],
  )
  const { data: customers = [] } = useGetCustomerOptionsQuery()
  const { data: catalogItems = [] } = useGetSalesCatalogItemsQuery()
  const skuItems = useMemo(() => catalogItems.filter((item) => !item.isCombo), [catalogItems])
  const { data: policies = [] } = useGetWarrantyPoliciesQuery()

  // ===== Form 1: Từ đơn hàng =====
  const orderForm = useForm<CreateWarrantyFromOrderValues>({
    resolver: zodResolver(createWarrantyFromOrderSchema),
    defaultValues: {
      orderId: '',
      orderItemId: '',
      serialTracking: false,
      serialNumber: '',
      startDate: todayIsoDate(),
    },
  })

  const selectedOrderId = orderForm.watch('orderId')
  const selectedOrderItemId = orderForm.watch('orderItemId')
  const orderStartDate = orderForm.watch('startDate')

  const { data: selectedOrderDetail } = useGetSalesOrderByIdQuery(selectedOrderId, {
    skip: !selectedOrderId,
  })
  const orderItems = selectedOrderDetail?.items ?? []
  const selectedOrderItem = orderItems.find((it) => it.orderItemId === selectedOrderItemId)
  const orderVariantId = selectedOrderItem?.variantId ?? ''

  const { data: orderVariantInfo } = useGetVariantWarrantyInfoQuery(orderVariantId, {
    skip: !orderVariantId,
  })

  useEffect(() => {
    orderForm.setValue('orderItemId', '')
    orderForm.setValue('serialTracking', false)
    setServerError(null)
  }, [selectedOrderId, orderForm])

  useEffect(() => {
    orderForm.setValue('serialTracking', Boolean(orderVariantInfo?.serialTracking))
  }, [orderVariantInfo, orderForm])

  const orderPolicyInvalid =
    Boolean(orderVariantInfo) &&
    (!orderVariantInfo?.warrantyPolicyId ||
      (orderVariantInfo?.warrantyMonths ?? 0) <= 0 ||
      orderVariantInfo?.policyStatus !== 'ACTIVE')

  // ===== Form 2: Cấp lẻ (Ad-hoc) =====
  const adHocForm = useForm<CreateAdHocWarrantyValues>({
    resolver: zodResolver(createAdHocWarrantySchema),
    defaultValues: {
      customerId: '',
      variantId: '',
      warrantyPolicyId: '',
      serialTracking: false,
      serialNumber: '',
      startDate: todayIsoDate(),
    },
  })

  const adHocVariantId = adHocForm.watch('variantId')
  const adHocPolicyId = adHocForm.watch('warrantyPolicyId')
  const adHocStartDate = adHocForm.watch('startDate')

  const { data: adHocVariantInfo } = useGetVariantWarrantyInfoQuery(adHocVariantId, {
    skip: !adHocVariantId,
  })

  useEffect(() => {
    if (!adHocVariantInfo) return
    adHocForm.setValue('serialTracking', Boolean(adHocVariantInfo.serialTracking))
    if (adHocVariantInfo.warrantyPolicyId && !adHocForm.getValues('warrantyPolicyId')) {
      adHocForm.setValue('warrantyPolicyId', adHocVariantInfo.warrantyPolicyId)
    }
  }, [adHocVariantInfo, adHocForm])

  const effectiveAdHocPolicy = useMemo(() => {
    if (adHocPolicyId) {
      return policies.find((p) => p.warrantyPolicyId === adHocPolicyId) ?? null
    }
    if (adHocVariantInfo?.warrantyPolicyId) {
      return {
        warrantyPolicyId: adHocVariantInfo.warrantyPolicyId,
        policyCode: adHocVariantInfo.policyCode ?? '',
        policyName: adHocVariantInfo.policyName ?? '',
        warrantyMonths: adHocVariantInfo.warrantyMonths,
        warrantyTerms: adHocVariantInfo.warrantyTerms,
        status: adHocVariantInfo.policyStatus ?? 'ACTIVE',
      }
    }
    return null
  }, [adHocPolicyId, adHocVariantInfo, policies])

  const adHocPolicyInvalid =
    Boolean(adHocVariantId) &&
    (!effectiveAdHocPolicy || (effectiveAdHocPolicy.warrantyMonths ?? 0) <= 0)

  const handleSubmitFromOrder = async (values: CreateWarrantyFromOrderValues) => {
    setServerError(null)
    if (orderPolicyInvalid) {
      setServerError('SKU này chưa có chính sách bảo hành hợp lệ (> 0 tháng).')
      return
    }
    try {
      const created = await createFromOrder({
        orderItemId: values.orderItemId,
        serialNumber: values.serialNumber?.trim() || undefined,
        startDate: values.startDate,
      }).unwrap()
      toast.success(`Đã cấp thẻ bảo hành ${created.warrantyCode}.`)
      onCreated?.(created.warrantyRecordId)
      onClose()
    } catch (err) {
      const normalized = normalizeApiError(err)
      setServerError(normalized.message)
      toast.error(normalized.message)
    }
  }

  const handleSubmitAdHoc = async (values: CreateAdHocWarrantyValues) => {
    setServerError(null)
    if (adHocPolicyInvalid) {
      setServerError('Vui lòng chọn chính sách bảo hành có thời hạn > 0 tháng.')
      return
    }
    try {
      const created = await createAdHoc({
        customerId: values.customerId,
        variantId: values.variantId,
        warrantyPolicyId: values.warrantyPolicyId?.trim() || undefined,
        serialNumber: values.serialNumber?.trim() || undefined,
        startDate: values.startDate,
      }).unwrap()
      toast.success(`Đã cấp thẻ bảo hành ${created.warrantyCode}.`)
      onCreated?.(created.warrantyRecordId)
      onClose()
    } catch (err) {
      const normalized = normalizeApiError(err)
      setServerError(normalized.message)
      toast.error(normalized.message)
    }
  }

  const orderEndPreview =
    orderVariantInfo && (orderVariantInfo.warrantyMonths ?? 0) > 0
      ? addMonthsPreview(orderStartDate, orderVariantInfo.warrantyMonths)
      : null

  const adHocEndPreview =
    effectiveAdHocPolicy && effectiveAdHocPolicy.warrantyMonths > 0
      ? addMonthsPreview(adHocStartDate, effectiveAdHocPolicy.warrantyMonths)
      : null

  return (
    <ManagementDialog title="Cấp thẻ bảo hành điện tử" onClose={onClose} closeDisabled={isSubmitting}>
      <div className="border-b border-slate-100 px-5 pt-3 sm:px-6">
        <div className="flex gap-2" role="tablist" aria-label="Phương thức cấp thẻ">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'from-order'}
            onClick={() => {
              setMode('from-order')
              setServerError(null)
            }}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              mode === 'from-order'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Từ đơn hàng
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'ad-hoc'}
            onClick={() => {
              setMode('ad-hoc')
              setServerError(null)
            }}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
              mode === 'ad-hoc'
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Cấp lẻ (Ad-hoc)
          </button>
        </div>
      </div>

      {mode === 'from-order' ? (
        <ManagementForm
          onSubmit={orderForm.handleSubmit(handleSubmitFromOrder)}
          onClose={onClose}
          submitDisabled={isSubmitting || orderPolicyInvalid}
          closeDisabled={isSubmitting}
          submitLabel={isSubmitting ? 'Đang tạo...' : 'Cấp thẻ bảo hành'}
        >
          {serverError && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <ManagementFormField
            id="wo-order-id"
            label="Đơn hàng *"
            error={orderForm.formState.errors.orderId?.message}
          >
            <select
              id="wo-order-id"
              className={managementFieldClass}
              {...orderForm.register('orderId')}
            >
              <option value="">-- Chọn đơn hàng (Đang xử lý / Hoàn tất) --</option>
              {eligibleOrders.map((o) => (
                <option key={o.orderId} value={o.orderId}>
                  {o.orderCode} - {o.customerName || 'Khách lẻ'} ({o.orderStatus})
                </option>
              ))}
            </select>
          </ManagementFormField>

          <ManagementFormField
            id="wo-order-item-id"
            label="Sản phẩm trong đơn *"
            error={orderForm.formState.errors.orderItemId?.message}
          >
            <select
              id="wo-order-item-id"
              disabled={!selectedOrderId || orderItems.length === 0}
              className={managementFieldClass}
              {...orderForm.register('orderItemId')}
            >
              <option value="">
                {!selectedOrderId
                  ? '-- Chọn đơn hàng trước --'
                  : orderItems.length === 0
                    ? '-- Đơn hàng không có dòng sản phẩm --'
                    : '-- Chọn dòng sản phẩm --'}
              </option>
              {orderItems.map((it) => (
                <option key={it.orderItemId} value={it.orderItemId}>
                  {it.sku} - {it.productName} ({it.variantName}) × {it.quantity}
                </option>
              ))}
            </select>
          </ManagementFormField>

          {orderVariantInfo && (
            <div
              className={`rounded-lg border p-3 text-xs ${
                orderPolicyInvalid
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-sky-200 bg-sky-50 text-sky-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold">
                {orderPolicyInvalid ? (
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-sky-600" />
                )}
                <span>
                  {orderPolicyInvalid
                    ? 'Sản phẩm chưa gắn chính sách bảo hành hợp lệ (> 0 tháng).'
                    : `Chính sách: ${orderVariantInfo.policyName} (${orderVariantInfo.warrantyMonths} tháng)`}
                </span>
              </div>
              <p className="mt-1 text-[11px]">
                Quản lý Serial: <strong>{orderVariantInfo.serialTracking ? 'Bắt buộc nhập Serial' : 'Không bắt buộc Serial'}</strong>
                {orderEndPreview && (
                  <>
                    {' '}• Hết hạn dự kiến: <strong>{orderEndPreview}</strong>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ManagementFormField
              id="wo-serial"
              label={orderVariantInfo?.serialTracking ? 'Số Serial / Barcode *' : 'Số Serial / Barcode'}
              error={orderForm.formState.errors.serialNumber?.message}
              hint={orderVariantInfo?.serialTracking ? 'Bắt buộc do SKU bật theo dõi serial' : 'Không bắt buộc với SKU này'}
            >
              <input
                id="wo-serial"
                type="text"
                maxLength={255}
                placeholder="VD: SN-2026-0001"
                className={managementFieldClass}
                {...orderForm.register('serialNumber')}
              />
            </ManagementFormField>

            <ManagementFormField
              id="wo-start-date"
              label="Ngày kích hoạt *"
              error={orderForm.formState.errors.startDate?.message}
            >
              <input
                id="wo-start-date"
                type="date"
                className={managementFieldClass}
                {...orderForm.register('startDate')}
              />
            </ManagementFormField>
          </div>
        </ManagementForm>
      ) : (
        <ManagementForm
          onSubmit={adHocForm.handleSubmit(handleSubmitAdHoc)}
          onClose={onClose}
          submitDisabled={isSubmitting || adHocPolicyInvalid}
          closeDisabled={isSubmitting}
          submitLabel={isSubmitting ? 'Đang tạo...' : 'Cấp thẻ bảo hành'}
        >
          {serverError && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <ManagementFormField
            id="wa-customer-id"
            label="Khách hàng *"
            error={adHocForm.formState.errors.customerId?.message}
          >
            <select
              id="wa-customer-id"
              className={managementFieldClass}
              {...adHocForm.register('customerId')}
            >
              <option value="">-- Chọn khách hàng --</option>
              {customers.map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  {c.customerName} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </ManagementFormField>

          <ManagementFormField
            id="wa-variant-id"
            label="Sản phẩm (SKU) *"
            error={adHocForm.formState.errors.variantId?.message}
          >
            <select
              id="wa-variant-id"
              className={managementFieldClass}
              {...adHocForm.register('variantId')}
            >
              <option value="">-- Chọn SKU sản phẩm --</option>
              {skuItems.map((item) => (
                <option key={item.variantId} value={item.variantId}>
                  {item.sku} - {item.name}
                </option>
              ))}
            </select>
          </ManagementFormField>

          <ManagementFormField
            id="wa-policy-id"
            label="Chính sách bảo hành *"
            error={adHocForm.formState.errors.warrantyPolicyId?.message}
            hint={
              adHocVariantInfo?.policyName
                ? `Mặc định của SKU: ${adHocVariantInfo.policyName} (${adHocVariantInfo.warrantyMonths} tháng)`
                : 'Chọn chính sách áp dụng cho thẻ bảo hành'
            }
          >
            <select
              id="wa-policy-id"
              className={managementFieldClass}
              {...adHocForm.register('warrantyPolicyId')}
            >
              <option value="">-- Dùng chính sách mặc định của SKU --</option>
              {policies.map((p) => (
                <option key={p.warrantyPolicyId} value={p.warrantyPolicyId}>
                  {p.policyCode} - {p.policyName} ({p.warrantyMonths} tháng)
                </option>
              ))}
            </select>
          </ManagementFormField>

          {adHocVariantId && (
            <div
              className={`rounded-lg border p-3 text-xs ${
                adHocPolicyInvalid
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-sky-200 bg-sky-50 text-sky-900'
              }`}
            >
              <p className="font-semibold">
                {adHocPolicyInvalid
                  ? 'Chưa có chính sách bảo hành hợp lệ (> 0 tháng) được áp dụng.'
                  : `Áp dụng: ${effectiveAdHocPolicy?.policyName} (${effectiveAdHocPolicy?.warrantyMonths} tháng)`}
              </p>
              <p className="mt-1 text-[11px]">
                Quản lý Serial: <strong>{adHocVariantInfo?.serialTracking ? 'Bắt buộc nhập Serial' : 'Không bắt buộc Serial'}</strong>
                {adHocEndPreview && (
                  <>
                    {' '}• Hết hạn dự kiến: <strong>{adHocEndPreview}</strong>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ManagementFormField
              id="wa-serial"
              label={adHocVariantInfo?.serialTracking ? 'Số Serial / Barcode *' : 'Số Serial / Barcode'}
              error={adHocForm.formState.errors.serialNumber?.message}
            >
              <input
                id="wa-serial"
                type="text"
                maxLength={255}
                placeholder="VD: SN-2026-0001"
                className={managementFieldClass}
                {...adHocForm.register('serialNumber')}
              />
            </ManagementFormField>

            <ManagementFormField
              id="wa-start-date"
              label="Ngày kích hoạt *"
              error={adHocForm.formState.errors.startDate?.message}
            >
              <input
                id="wa-start-date"
                type="date"
                className={managementFieldClass}
                {...adHocForm.register('startDate')}
              />
            </ManagementFormField>
          </div>
        </ManagementForm>
      )}
    </ManagementDialog>
  )
}

