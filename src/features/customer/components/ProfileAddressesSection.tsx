import { useState } from 'react'
import {
  CheckCircle2,
  Edit3,
  MapPin,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import {
  useCreateDeliveryAddressMutation,
  useDeleteDeliveryAddressMutation,
  useGetMyAddressesQuery,
  useSetDefaultDeliveryAddressMutation,
  useUpdateDeliveryAddressMutation,
} from '../api/profileApi.ts'
import type {
  DeliveryAddressDto,
  UpsertDeliveryAddressRequest,
} from '../types/profile.types.ts'

const ADDRESS_LABELS = ['Nhà riêng', 'Công trình', 'Văn phòng', 'Biệt thự']

const EMPTY_FORM: UpsertDeliveryAddressRequest = {
  recipientName: '',
  phone: '',
  province: '',
  district: '',
  ward: '',
  streetAddress: '',
  label: 'Nhà riêng',
  isDefault: false,
}

/**
 * Tab Quản lý CRUD Sổ địa chỉ giao hàng (/api/v1/profile/addresses).
 */
export function ProfileAddressesSection() {
  const { data: addresses = [], isLoading } = useGetMyAddressesQuery()
  const [createAddress, { isLoading: isCreating }] = useCreateDeliveryAddressMutation()
  const [updateAddress, { isLoading: isUpdating }] = useUpdateDeliveryAddressMutation()
  const [deleteAddress, { isLoading: isDeleting }] = useDeleteDeliveryAddressMutation()
  const [setDefaultAddress, { isLoading: isSettingDefault }] = useSetDefaultDeliveryAddressMutation()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<UpsertDeliveryAddressRequest>(EMPTY_FORM)

  const openCreateForm = () => {
    setEditingId(null)
    setForm({
      ...EMPTY_FORM,
      isDefault: addresses.length === 0,
    })
    setIsFormOpen(true)
  }

  const openEditForm = (addr: DeliveryAddressDto) => {
    setEditingId(addr.addressId)
    setForm({
      recipientName: addr.recipientName,
      phone: addr.phone,
      province: addr.province,
      district: addr.district,
      ward: addr.ward,
      streetAddress: addr.streetAddress,
      label: addr.label || 'Nhà riêng',
      isDefault: addr.isDefault,
    })
    setIsFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.recipientName.trim()) {
      toast.error('Tên người nhận không được để trống')
      return
    }
    if (!/^0\d{9}$/.test(form.phone.trim())) {
      toast.error('Số điện thoại nhận hàng phải gồm 10 chữ số, bắt đầu bằng số 0')
      return
    }
    if (
      !form.province.trim() ||
      !form.district.trim() ||
      !form.ward.trim() ||
      !form.streetAddress.trim()
    ) {
      toast.error('Vui lòng nhập đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã và Số nhà/Đường')
      return
    }

    const payload: UpsertDeliveryAddressRequest = {
      recipientName: form.recipientName.trim(),
      phone: form.phone.trim(),
      province: form.province.trim(),
      district: form.district.trim(),
      ward: form.ward.trim(),
      streetAddress: form.streetAddress.trim(),
      label: form.label?.trim() || undefined,
      isDefault: Boolean(form.isDefault),
    }

    try {
      if (editingId) {
        await updateAddress({ id: editingId, body: payload }).unwrap()
        toast.success('Đã cập nhật địa chỉ giao hàng')
      } else {
        await createAddress(payload).unwrap()
        toast.success('Đã thêm địa chỉ giao hàng mới')
      }
      setIsFormOpen(false)
      setEditingId(null)
    } catch (err) {
      toast.error(normalizeApiError(err).message)
    }
  }

  const handleDelete = async (addressId: string) => {
    try {
      await deleteAddress(addressId).unwrap()
      setConfirmDeleteId(null)
      toast.success('Đã xóa địa chỉ giao hàng')
    } catch (err) {
      toast.error(normalizeApiError(err).message)
    }
  }

  const handleSetDefault = async (addressId: string) => {
    try {
      await setDefaultAddress(addressId).unwrap()
      toast.success('Đã đặt làm địa chỉ nhận hàng mặc định')
    } catch (err) {
      toast.error(normalizeApiError(err).message)
    }
  }

  const isBusy = isCreating || isUpdating

  return (
    <div className="rounded-3xl border border-sky-200/80 bg-white/95 p-5 sm:p-7 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            Sổ địa chỉ giao hàng ({addresses.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thêm, chỉnh sửa và chọn địa chỉ nhận hàng mặc định khi đặt hàng trực tuyến.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="aqua-shine-btn inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-2 text-xs font-bold text-white hover:from-sky-500 hover:to-cyan-500 shadow-md shadow-sky-500/20 transition cursor-pointer"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Thêm địa chỉ mới</span>
        </button>
      </div>

      {/* Form Thêm / Sửa Địa chỉ */}
      {isFormOpen && (
        <form
          onSubmit={(e) => void handleSave(e)}
          className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-900">
              {editingId ? 'Chỉnh sửa địa chỉ giao hàng' : 'Thêm địa chỉ giao hàng mới'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              aria-label="Đóng biểu mẫu địa chỉ"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tên người nhận <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.recipientName}
                onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Số điện thoại nhận hàng <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Ví dụ: 0987654321"
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tỉnh / Thành phố <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                placeholder="TP. Hồ Chí Minh / Hà Nội"
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Quận / Huyện <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                placeholder="Quận 1 / Cầu Giấy"
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Phường / Xã <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.ward}
                onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))}
                placeholder="Phường Bến Nghé"
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Số nhà, tên đường <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.streetAddress}
                onChange={(e) => setForm((f) => ({ ...f, streetAddress: e.target.value }))}
                placeholder="123 Đường Lê Lợi"
                className="w-full h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-slate-700 mr-1">Nhãn:</span>
              {ADDRESS_LABELS.map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, label: lbl }))}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    form.label === lbl
                      ? 'bg-sky-600 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-sky-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(form.isDefault)}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="rounded accent-sky-600"
              />
              <span>Đặt làm địa chỉ mặc định</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-sky-200/60">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
            >
              {isBusy ? 'Đang lưu...' : editingId ? 'Cập nhật địa chỉ' : 'Lưu địa chỉ mới'}
            </button>
          </div>
        </form>
      )}

      {/* Danh sách địa chỉ */}
      {isLoading ? (
        <div className="py-10 text-center text-xs text-slate-500">Đang tải sổ địa chỉ...</div>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-2">
          <MapPin className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-800">Chưa có địa chỉ giao hàng nào</p>
          <p className="text-xs text-slate-500">
            Thêm địa chỉ nhận hàng giúp thanh toán nhanh chỉ với 1 lần chọn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {addresses.map((addr) => (
            <div
              key={addr.addressId}
              className={`rounded-2xl border p-4 transition ${
                addr.isDefault
                  ? 'border-sky-300 bg-sky-50/40'
                  : 'border-slate-200 bg-white hover:border-sky-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">
                      {addr.recipientName}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      • {addr.phone}
                    </span>
                    {addr.label && (
                      <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                        {addr.label}
                      </span>
                    )}
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {addr.addressText}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {!addr.isDefault && (
                    <button
                      type="button"
                      disabled={isSettingDefault}
                      onClick={() => void handleSetDefault(addr.addressId)}
                      className="inline-flex items-center gap-1 rounded-xl border border-sky-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-sky-700 hover:bg-sky-50 transition cursor-pointer"
                    >
                      <Star className="h-3 w-3" aria-hidden="true" />
                      <span>Đặt mặc định</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openEditForm(addr)}
                    aria-label={`Sửa địa chỉ ${addr.recipientName}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700 transition cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" aria-hidden="true" />
                    <span>Sửa</span>
                  </button>

                  {confirmDeleteId !== addr.addressId ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(addr.addressId)}
                      aria-label={`Xóa địa chỉ ${addr.recipientName}`}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      <span>Xóa</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1 rounded-xl bg-rose-50 border border-rose-200 px-2 py-1">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void handleDelete(addr.addressId)}
                        className="rounded-lg bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                      >
                        Xác nhận xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 cursor-pointer"
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

