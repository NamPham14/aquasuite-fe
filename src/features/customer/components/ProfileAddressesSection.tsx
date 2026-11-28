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
    <div className="border border-[#E6E2DA] bg-white p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
            Địa điểm nhận hàng
          </p>
          <h2 className="font-editorial text-xl font-normal text-[#171614] mt-0.5">
            Sổ địa chỉ giao hàng ({addresses.length})
          </h2>
          <p className="text-xs text-[#6B6760] mt-1">
            Quản lý địa chỉ nhà riêng hoặc công trình để đặt hàng nhanh hơn.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateForm}
          className="h-10 inline-flex items-center gap-1.5 border border-[#171614] bg-[#171614] px-4 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 text-[#C5B091]" aria-hidden="true" />
          <span>Thêm địa chỉ mới</span>
        </button>
      </div>

      {/* Form Thêm / Sửa Địa chỉ */}
      {isFormOpen && (
        <form
          onSubmit={(e) => void handleSave(e)}
          className="border border-[#171614] bg-[#FAF9F6] p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E2DA]">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#171614]">
              {editingId ? 'Chỉnh sửa địa chỉ giao hàng' : 'Thêm địa chỉ giao hàng mới'}
            </h3>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              aria-label="Đóng biểu mẫu địa chỉ"
              className="p-1 text-[#78736A] hover:text-[#171614] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5">
                Tên người nhận <span className="text-[#991B1B]">*</span>
              </label>
              <input
                type="text"
                value={form.recipientName}
                onChange={(e) => setForm((f) => ({ ...f, recipientName: e.target.value }))}
                placeholder="Ví dụ: Nguyễn Văn A"
                className="w-full h-10 border border-[#D6D1C7] bg-white px-3 text-xs text-[#171614] focus:border-[#171614] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5">
                Số điện thoại nhận hàng <span className="text-[#991B1B]">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Ví dụ: 0987654321"
                className="w-full h-10 border border-[#D6D1C7] bg-white px-3 text-xs text-[#171614] focus:border-[#171614] focus:outline-none tabular-nums"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5">
                Tỉnh / Thành phố <span className="text-[#991B1B]">*</span>
              </label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                placeholder="TP. Hồ Chí Minh / Hà Nội"
                className="w-full h-10 border border-[#D6D1C7] bg-white px-3 text-xs text-[#171614] focus:border-[#171614] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5">
                Quận / Huyện <span className="text-[#991B1B]">*</span>
              </label>
              <input
                type="text"
                value={form.district}
                onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                placeholder="Quận 1 / Cầu Giấy"
                className="w-full h-10 border border-[#D6D1C7] bg-white px-3 text-xs text-[#171614] focus:border-[#171614] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5">
                Phường / Xã <span className="text-[#991B1B]">*</span>
              </label>
              <input
                type="text"
                value={form.ward}
                onChange={(e) => setForm((f) => ({ ...f, ward: e.target.value }))}
                placeholder="Phường Bến Nghé"
                className="w-full h-10 border border-[#D6D1C7] bg-white px-3 text-xs text-[#171614] focus:border-[#171614] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5">
                Số nhà, tên đường <span className="text-[#991B1B]">*</span>
              </label>
              <input
                type="text"
                value={form.streetAddress}
                onChange={(e) => setForm((f) => ({ ...f, streetAddress: e.target.value }))}
                placeholder="123 Đường Lê Lợi"
                className="w-full h-10 border border-[#D6D1C7] bg-white px-3 text-xs text-[#171614] focus:border-[#171614] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mr-1">
                Nhãn:
              </span>
              {ADDRESS_LABELS.map((lbl) => (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, label: lbl }))}
                  className={`px-3 py-1 text-[11px] font-medium border transition-colors cursor-pointer ${
                    form.label === lbl
                      ? 'border-[#171614] bg-[#171614] text-[#FAF9F6]'
                      : 'border-[#D6D1C7] bg-white text-[#57534E] hover:border-[#171614]'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer font-medium text-[#171614]">
              <input
                type="checkbox"
                checked={Boolean(form.isDefault)}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="accent-[#171614]"
              />
              <span>Đặt làm địa chỉ mặc định</span>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E6E2DA]">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="border border-[#D6D1C7] bg-white px-4 py-2 text-[11px] uppercase tracking-[0.14em] font-medium text-[#57534E] hover:border-[#171614] cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isBusy}
              className="border border-[#171614] bg-[#171614] px-5 py-2 text-[11px] uppercase tracking-[0.14em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] disabled:opacity-50 cursor-pointer"
            >
              {isBusy ? 'Đang lưu...' : editingId ? 'Cập nhật địa chỉ' : 'Lưu địa chỉ mới'}
            </button>
          </div>
        </form>
      )}

      {/* Danh sách địa chỉ */}
      {isLoading ? (
        <div className="py-10 text-center text-xs text-[#78736A]">Đang tải sổ địa chỉ...</div>
      ) : addresses.length === 0 ? (
        <div className="border border-dashed border-[#D6D1C7] bg-[#FAF9F6] p-10 text-center space-y-2.5">
          <MapPin className="h-7 w-7 text-[#8C6D46] mx-auto" />
          <p className="font-editorial text-lg text-[#171614]">Chưa có địa chỉ giao hàng nào</p>
          <p className="text-xs text-[#6B6760]">
            Thêm địa chỉ nhận hàng để thanh toán nhanh chóng chỉ với một lần chọn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {addresses.map((addr) => (
            <div
              key={addr.addressId}
              className={`border p-5 transition-colors ${
                addr.isDefault
                  ? 'border-[#171614] bg-[#FAF9F6]'
                  : 'border-[#E6E2DA] bg-white hover:border-[#B5AFA5]'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#171614]">
                      {addr.recipientName}
                    </span>
                    <span className="text-xs text-[#78736A] tabular-nums">
                      &middot; {addr.phone}
                    </span>
                    {addr.label && (
                      <span className="border border-[#E6E2DA] bg-white px-2.5 py-0.5 text-[10px] font-medium text-[#57534E]">
                        {addr.label}
                      </span>
                    )}
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 border border-[#171614] bg-[#171614] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.12em] font-medium text-[#FAF9F6]">
                        <CheckCircle2 className="h-3 w-3 text-[#C5B091]" aria-hidden="true" />
                        <span>Mặc định</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#57534E] leading-relaxed">
                    {addr.addressText}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {!addr.isDefault && (
                    <button
                      type="button"
                      disabled={isSettingDefault}
                      onClick={() => void handleSetDefault(addr.addressId)}
                      className="inline-flex items-center gap-1 border border-[#D6D1C7] bg-white px-3 py-1.5 text-[11px] font-medium text-[#171614] hover:border-[#171614] transition-colors cursor-pointer"
                    >
                      <Star className="h-3 w-3 text-[#8C6D46]" aria-hidden="true" />
                      <span>Đặt mặc định</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openEditForm(addr)}
                    aria-label={`Sửa địa chỉ ${addr.recipientName}`}
                    className="inline-flex items-center gap-1 border border-[#D6D1C7] bg-white px-3 py-1.5 text-[11px] font-medium text-[#171614] hover:border-[#171614] transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" aria-hidden="true" />
                    <span>Sửa</span>
                  </button>

                  {confirmDeleteId !== addr.addressId ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(addr.addressId)}
                      aria-label={`Xóa địa chỉ ${addr.recipientName}`}
                      className="inline-flex items-center gap-1 border border-[#E6E2DA] bg-white px-3 py-1.5 text-[11px] font-medium text-[#991B1B] hover:border-[#991B1B] transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      <span>Xóa</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 bg-[#FEF2F2] border border-[#E5B8B8] px-2.5 py-1">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void handleDelete(addr.addressId)}
                        className="bg-[#991B1B] px-2.5 py-0.5 text-[10px] uppercase tracking-[0.1em] font-semibold text-white cursor-pointer"
                      >
                        Xác nhận xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-1.5 py-0.5 text-[10px] font-medium text-[#57534E] cursor-pointer"
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
