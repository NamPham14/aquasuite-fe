import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  UserPlus,
  Phone,
  User,
  MapPin,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useCreateCustomerMutation,
  type CustomerOption,
} from '../api/customerApi'

interface QuickCreateCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  onCustomerCreated: (customer: CustomerOption) => void
  initialName?: string
  existingCustomers?: CustomerOption[]
}

export function QuickCreateCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
  initialName = '',
  existingCustomers = [],
}: QuickCreateCustomerModalProps) {
  const [customerName, setCustomerName] = useState(initialName)
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [customerType, setCustomerType] = useState<'RETAIL' | 'PROJECT'>('RETAIL')
  const [address, setAddress] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [matchedExistingCustomer, setMatchedExistingCustomer] = useState<CustomerOption | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const [createCustomer, { isLoading }] = useCreateCustomerMutation()

  useEffect(() => {
    if (isOpen) {
      setCustomerName(initialName.trim())
      setPhone('')
      setEmail('')
      setCustomerType('RETAIL')
      setAddress('')
      setErrorMsg(null)
      setMatchedExistingCustomer(null)

      setTimeout(() => {
        nameInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen, initialName])

  // Đóng khi bấm phím Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Kiểm tra trùng SĐT theo thời gian thực với danh sách đã tải
  const handlePhoneChange = (val: string) => {
    setPhone(val)
    setErrorMsg(null)
    const cleanPhone = val.trim()
    if (cleanPhone && cleanPhone.length >= 9) {
      const found = existingCustomers.find(
        (c) => c.phone && c.phone === cleanPhone && c.customerCode !== 'CUS-WALKIN',
      )
      if (found) {
        setMatchedExistingCustomer(found)
        return
      }
    }
    setMatchedExistingCustomer(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const trimmedName = customerName.trim()
    if (!trimmedName) {
      setErrorMsg('Vui lòng nhập tên khách hàng.')
      return
    }

    const trimmedPhone = phone.trim()
    if (trimmedPhone) {
      const phoneRegex = /^(0[35789][0-9]{8})$/
      if (!phoneRegex.test(trimmedPhone)) {
        setErrorMsg('Số điện thoại không đúng định dạng Việt Nam (10 số, bắt đầu bằng 03, 05, 07, 08, 09).')
        return
      }
    }

    if (matchedExistingCustomer) {
      onCustomerCreated(matchedExistingCustomer)
      toast.success(`Đã chọn khách hàng có sẵn: ${matchedExistingCustomer.customerName}`)
      onClose()
      return
    }

    try {
      const res = await createCustomer({
        customerName: trimmedName,
        phone: trimmedPhone || undefined,
        email: email.trim() || undefined,
        customerType,
        address: address.trim() || undefined,
      }).unwrap()

      toast.success(`Đã thêm và lưu khách hàng "${res.customerName}" vào CRM!`)
      onCustomerCreated(res)
      onClose()
    } catch (err: any) {
      const msg = err?.data?.message || 'Không thể tạo khách hàng. Vui lòng thử lại.'
      setErrorMsg(msg)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-sky-600 to-sky-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-sky-200" />
            <h3 className="font-semibold text-sm">Thêm khách hàng mới vào CRM</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white rounded-md hover:bg-white/10 transition"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>{errorMsg}</div>
            </div>
          )}

          {matchedExistingCustomer && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  Số điện thoại này đã thuộc về khách hàng:{' '}
                  <strong className="text-slate-900">{matchedExistingCustomer.customerName}</strong> (
                  <span className="font-mono text-xs">{matchedExistingCustomer.customerCode}</span>)
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onCustomerCreated(matchedExistingCustomer)
                  toast.success(`Đã chọn khách hàng: ${matchedExistingCustomer.customerName}`)
                  onClose()
                }}
                className="w-full py-1.5 px-3 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center justify-center gap-1.5 transition shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Chọn ngay khách hàng này</span>
              </button>
            </div>
          )}

          {/* Tên khách hàng */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Tên khách hàng <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={nameInputRef}
                type="text"
                required
                placeholder="VD: Nguyễn Văn Nam, Công ty Xây dựng..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Số điện thoại */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium text-slate-700">Số điện thoại</label>
              <span className="text-[11px] text-slate-400">Tùy chọn (chuẩn 10 số VN)</span>
            </div>
            <div className="relative">
              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="VD: 0912345678"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-md border border-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Nhóm / Phân loại khách hàng */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Loại khách hàng</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomerType('RETAIL')}
                className={`py-2 px-3 rounded-md border text-center font-medium transition ${
                  customerType === 'RETAIL'
                    ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Khách lẻ (RETAIL)
              </button>
              <button
                type="button"
                onClick={() => setCustomerType('PROJECT')}
                className={`py-2 px-3 rounded-md border text-center font-medium transition ${
                  customerType === 'PROJECT'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Dự án / Công trình (PROJECT)
              </button>
            </div>
          </div>

          {/* Địa chỉ */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium text-slate-700">Địa chỉ giao hàng</label>
              <span className="text-[11px] text-slate-400">Tùy chọn</span>
            </div>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
              <textarea
                rows={2}
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-medium text-slate-700">Email</label>
              <span className="text-[11px] text-slate-400">Tùy chọn</span>
            </div>
            <div className="relative">
              <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                placeholder="khachhang@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-700 text-white font-semibold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Lưu & Chọn khách này</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

