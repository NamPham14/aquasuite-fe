import { useState } from 'react'
import {
  User,
  Phone,
  MapPin,
  Search,
  X,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react'
import { useGetCustomerOptionsQuery, type CustomerOption } from '../api/customerApi'
import { useLazyGetCustomerCreditSummaryQuery } from '../api/salesOrderApi'

interface POSCustomerSectionProps {
  selectedCustomer: CustomerOption | null
  onSelectCustomer: (customer: CustomerOption | null) => void
  walkInName: string
  onChangeWalkInName: (name: string) => void
  walkInPhone: string
  onChangeWalkInPhone: (phone: string) => void
  deliveryAddress: string
  onChangeDeliveryAddress: (address: string) => void
  isDelivery: boolean
}

export function POSCustomerSection({
  selectedCustomer,
  onSelectCustomer,
  walkInName,
  onChangeWalkInName,
  walkInPhone,
  onChangeWalkInPhone,
  deliveryAddress,
  onChangeDeliveryAddress,
  isDelivery,
}: POSCustomerSectionProps) {
  const { data: customerOptions = [], isLoading } = useGetCustomerOptionsQuery()
  const [triggerGetDebt, { data: debtData, isFetching: isDebtLoading, isError: isDebtError, error: debtError }] = useLazyGetCustomerCreditSummaryQuery()

  const [searchTerm, setSearchTerm] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [showDebtModal, setShowDebtModal] = useState(false)

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

  // Lọc khách hàng
  const filteredCustomers = customerOptions.filter((c) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase().trim()
    return (
      c.customerName.toLowerCase().includes(q) ||
      (c.phone && c.phone.includes(q)) ||
      (c.customerCode && c.customerCode.toLowerCase().includes(q))
    )
  })

  const handleOpenDebtModal = async () => {
    if (!selectedCustomer) return
    setShowDebtModal(true)
    await triggerGetDebt(selectedCustomer.customerId)
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-4 h-4 text-sky-600" />
          <span>Thông tin khách hàng</span>
        </h4>

        {selectedCustomer ? (
          <button
            type="button"
            onClick={() => onSelectCustomer(null)}
            className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Đổi khách hàng</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-400">Khách lẻ / Tìm CRM</span>
        )}
      </div>

      {selectedCustomer ? (
        /* Đã chọn khách hàng từ CRM */
        <div className="bg-sky-50/60 border border-sky-100 rounded-md p-3 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-xs text-slate-900 flex items-center gap-2">
                <span>{selectedCustomer.customerName}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-sky-700 border border-sky-200">
                  {selectedCustomer.customerCode}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 flex items-center gap-1.5 mt-1">
                <Phone className="w-3 h-3 text-slate-400" />
                <span>{selectedCustomer.phone || 'Chưa có SĐT'}</span>
              </div>
              {selectedCustomer.address && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span className="truncate max-w-xs">{selectedCustomer.address}</span>
                </div>
              )}
            </div>

            {/* NÚT 1: TRA CỨU CÔNG NỢ (TÍCH HỢP HÀO - CREDIT CONTROL) */}
            <button
              type="button"
              onClick={handleOpenDebtModal}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 hover:border-sky-400 transition shadow-2xs"
              title="Tra cứu hồ sơ công nợ của khách hàng này từ phân hệ Tài chính"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Tra cứu công nợ</span>
            </button>
          </div>
        </div>
      ) : (
        /* Chưa chọn khách hàng: Ô tìm kiếm CRM + Tùy chọn nhập khách lẻ */
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm khách hàng theo Tên, SĐT, Mã CRM..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setDropdownOpen(true)
              }}
              onFocus={() => setDropdownOpen(true)}
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-sky-500 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Dropdown gợi ý khách hàng */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg divide-y divide-slate-100">
                {isLoading ? (
                  <div className="p-3 text-center text-xs text-slate-500">Đang tải danh sách CRM...</div>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.slice(0, 10).map((c) => (
                    <button
                      key={c.customerId}
                      type="button"
                      onClick={() => {
                        onSelectCustomer(c)
                        setDropdownOpen(false)
                        setSearchTerm('')
                      }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-sky-50 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{c.customerName}</div>
                        <div className="text-[11px] text-slate-500">
                          {c.phone || 'Không có SĐT'} • <span className="font-mono">{c.customerCode}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {c.customerType || 'Khách lẻ'}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500">
                    Không tìm thấy khách hàng trong CRM.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pt-1 border-t border-slate-100">
            <p className="text-[11px] text-slate-500 mb-1.5">Hoặc nhập thông tin khách lẻ tại quầy:</p>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Tên khách lẻ (tùy chọn)"
                value={walkInName}
                onChange={(e) => onChangeWalkInName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-sky-500"
              />
              <input
                type="text"
                placeholder="Số điện thoại khách lẻ"
                value={walkInPhone}
                onChange={(e) => onChangeWalkInPhone(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Địa chỉ giao hàng khi chọn SCHEDULED_DELIVERY */}
      {isDelivery && (
        <div className="pt-2 border-t border-slate-100 space-y-1">
          <label className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sky-600" />
            <span>Địa chỉ nhận hàng (Giao theo lịch):</span>
          </label>
          <input
            type="text"
            placeholder="Nhập địa chỉ nhận hàng chi tiết..."
            value={deliveryAddress}
            onChange={(e) => onChangeDeliveryAddress(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 focus:outline-none focus:border-sky-500"
          />
        </div>
      )}

      {/* MODAL TRA CỨU CÔNG NỢ (HÀO - CREDIT CONTROL) */}
      {showDebtModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-semibold text-slate-900">
                  Hồ sơ công nợ & Tín dụng khách hàng
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDebtModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-500">Khách hàng:</span>{' '}
                <strong className="text-slate-900">{selectedCustomer?.customerName}</strong> (
                <span className="font-mono">{selectedCustomer?.customerCode}</span>)
              </div>

              {isDebtLoading ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Đang truy vấn dữ liệu từ phân hệ Credit Control của Hào...
                </div>
              ) : debtData ? (
                <div className="space-y-2.5 bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Hạn mức tín dụng:</span>
                    <span className="font-semibold text-slate-900">
                      {formatMoney(debtData.creditLimit || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Tổng dư nợ hiện tại:</span>
                    <span className="font-semibold text-slate-900">
                      {formatMoney(debtData.outstandingBalance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Nợ quá hạn:</span>
                    <span
                      className={`font-semibold ${
                        debtData.overdueBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatMoney(debtData.overdueBalance || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                    <span className="text-slate-600">Hạn mức còn khả dụng:</span>
                    <span className="font-bold text-sky-700">
                      {formatMoney(debtData.availableCredit || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">Trạng thái nợ:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        ['OVERDUE', 'CREDIT_BLOCKED', 'BLACKLISTED', 'BLOCKED'].includes(debtData.debtStatus)
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {debtData.debtStatus || 'Bình thường'}
                    </span>
                  </div>

                  {debtData.overdueBalance > 0 && (
                    <div className="mt-2 p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        Khách hàng đang có nợ quá hạn. Backend Credit Control có thể từ chối đơn hàng mua nợ.
                      </span>
                    </div>
                  )}
                </div>
              ) : isDebtError ? (
                <div className="py-4 text-center text-rose-700 text-xs">
                  Không thể tải snapshot công nợ: {typeof debtError === 'object' && debtError && 'data' in debtError && typeof debtError.data === 'object' && debtError.data && 'message' in debtError.data ? String(debtError.data.message) : 'Vui lòng thử lại.'}
                </div>
              ) : (
                <div className="py-4 text-center text-slate-500 text-xs">
                  Không tìm thấy bản ghi công nợ cho khách hàng này.
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDebtModal(false)}
                className="px-3 py-1.5 text-xs font-medium rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
