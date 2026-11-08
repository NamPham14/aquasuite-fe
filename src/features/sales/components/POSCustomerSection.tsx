import { useState, useRef, useEffect } from 'react'
import {
  User,
  Phone,
  MapPin,
  Search,
  X,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Filter,
} from 'lucide-react'
import { useGetCustomerOptionsQuery, type CustomerOption } from '../api/customerApi'
import { useLazyGetCustomerCreditSummaryQuery } from '../api/salesOrderApi'
import { QuickCreateCustomerModal } from './QuickCreateCustomerModal'

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
  onRequestCreditProfile: () => void
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
  onRequestCreditProfile,
}: POSCustomerSectionProps) {
  const { data: customerOptions = [], isLoading } = useGetCustomerOptionsQuery()
  const [triggerGetDebt, { data: debtData, isFetching: isDebtLoading, isError: isDebtError, error: debtError }] = useLazyGetCustomerCreditSummaryQuery()

  const [searchTerm, setSearchTerm] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [filterType, setFilterType] = useState<'ALL' | 'RETAIL' | 'PROJECT'>('ALL')
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const customerDropdownRef = useRef<HTMLDivElement>(null)

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dropdownOpen])

  // Đóng modal công nợ khi bấm phím Escape
  useEffect(() => {
    if (!showDebtModal) return
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowDebtModal(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showDebtModal])

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

  // Danh sách khách hàng hợp lệ (loại trừ CUS-WALKIN vì có lựa chọn riêng)
  const validCustomers = customerOptions.filter((c) => c.customerCode !== 'CUS-WALKIN')

  // Số lượng theo từng loại
  const allCount = validCustomers.length
  const retailCount = validCustomers.filter(
    (c) => (c.customerType || 'RETAIL').toUpperCase() === 'RETAIL',
  ).length
  const projectCount = validCustomers.filter(
    (c) => (c.customerType || '').toUpperCase() === 'PROJECT',
  ).length

  // Danh sách sau khi áp dụng filter tabs và tìm kiếm
  const filteredCustomers = validCustomers.filter((c) => {
    if (filterType !== 'ALL') {
      const type = (c.customerType || 'RETAIL').toUpperCase()
      if (type !== filterType) return false
    }

    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase().trim()
    return (
      (c.customerName && c.customerName.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    )
  })

  const handleOpenDebtModal = async () => {
    if (!selectedCustomer) return
    setShowDebtModal(true)
    await triggerGetDebt(selectedCustomer.customerId)
  }

  const handleSelectWalkInDefault = () => {
    onSelectCustomer(null)
    onChangeWalkInName('')
    onChangeWalkInPhone('')
    setDropdownOpen(false)
    setSearchTerm('')
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs space-y-3.5">
      {/* Header khu vực khách hàng */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <User className="w-4 h-4 text-sky-600" />
          <span>Thông tin khách hàng</span>
        </h4>

        <div className="flex items-center gap-2">
          {selectedCustomer ? (
            <button
              type="button"
              onClick={() => onSelectCustomer(null)}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Đổi khách hàng</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded transition shadow-2xs"
            >
              <UserPlus className="w-3 h-3 text-sky-600" />
              <span>+ Thêm khách mới</span>
            </button>
          )}
        </div>
      </div>

      {selectedCustomer ? (
        /* TH1: ĐÃ CHỌN KHÁCH HÀNG TỪ CRM HOẶC VỪA TẠO MỚI */
        <div className="bg-sky-50/60 border border-sky-100 rounded-md p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <div className="font-semibold text-xs text-slate-900 flex items-center gap-2 flex-wrap">
                <span className="text-sm">
                  {selectedCustomer.customerName === 'Walk-in Retail Customer'
                    ? 'Khách lẻ tại quầy'
                    : selectedCustomer.customerName}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-sky-700 border border-sky-200">
                  {selectedCustomer.customerCode}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    selectedCustomer.customerType === 'PROJECT'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {selectedCustomer.customerType === 'PROJECT' ? 'Dự án (PROJECT)' : 'Khách lẻ (RETAIL)'}
                </span>
              </div>

              {selectedCustomer.phone && selectedCustomer.phone !== '0000000000' && (
                <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>{selectedCustomer.phone}</span>
                </div>
              )}

              {selectedCustomer.address && (
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate max-w-xs">{selectedCustomer.address}</span>
                </div>
              )}
            </div>

            {/* NÚT 1: TRA CỨU CÔNG NỢ (TÍCH HỢP HÀO - CREDIT CONTROL) */}
            <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
              <button
                type="button"
                onClick={handleOpenDebtModal}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-sky-300 bg-white text-sky-700 hover:bg-sky-50 hover:border-sky-400 transition shadow-2xs"
                title="Tra cứu hồ sơ công nợ của khách hàng này từ phân hệ Tài chính"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                <span>Tra cứu công nợ</span>
              </button>
              <button
                type="button"
                onClick={onRequestCreditProfile}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded border border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 transition shadow-2xs"
                title="Thiết lập hoặc đề nghị cập nhật hồ sơ tín dụng cho khách CRM"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Hồ sơ tín dụng</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* TH2: CHƯA CHỌN KHÁCH HÀNG: DROPDOWN COMBOBOX + TÙY CHỌN NHẬP TẠI QUẦY */
        <div className="space-y-3">
          {/* THANH DROPDOWN COMBOBOX TÌM KIẾM & CHỌN KHÁCH HÀNG CÓ SẴN */}
          <div className="relative" ref={customerDropdownRef}>
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              Chọn khách hàng có sẵn từ CRM (hoặc tìm kiếm):
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo Tên, SĐT, Mã CRM hoặc bấm mở danh sách..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setDropdownOpen(true)
                }}
                onFocus={() => setDropdownOpen(true)}
                className="w-full pl-8 pr-16 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:border-sky-500 bg-white shadow-2xs"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="p-0.5 hover:text-slate-600 rounded"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  className="p-1 hover:text-slate-700 transition"
                  title="Mở toàn bộ danh sách khách hàng"
                >
                  {dropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-sky-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* DROPDOWN MENU KHI MỞ: FILTER TABS + TOÀN BỘ LIST + THÊM NHANH */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-xl divide-y divide-slate-100 overflow-hidden animate-in fade-in duration-100">
                {/* 1. Header Filter Tabs */}
                <div className="p-2 bg-slate-50 flex items-center justify-between text-[11px] border-b border-slate-200/80">
                  <div className="flex items-center gap-1">
                    <Filter className="w-3 h-3 text-slate-400 mr-0.5" />
                    <button
                      type="button"
                      onClick={() => setFilterType('ALL')}
                      className={`px-2 py-0.5 rounded font-medium transition ${
                        filterType === 'ALL'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      Tất cả ({allCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('RETAIL')}
                      className={`px-2 py-0.5 rounded font-medium transition ${
                        filterType === 'RETAIL'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      Khách lẻ ({retailCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterType('PROJECT')}
                      className={`px-2 py-0.5 rounded font-medium transition ${
                        filterType === 'PROJECT'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-200/60'
                      }`}
                    >
                      Dự án ({projectCount})
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    {filteredCustomers.length}/{validCustomers.length} khách
                  </span>
                </div>

                {/* 2. Lựa chọn đặc biệt ở đầu: Khách lẻ tại quầy (Không lưu CRM) */}
                <button
                  type="button"
                  onClick={handleSelectWalkInDefault}
                  className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-amber-50/60 transition flex items-center justify-between group border-b border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <div>
                      <div className="font-semibold text-slate-800 group-hover:text-amber-800">
                        Khách lẻ tại quầy (Mặc định - Không lưu CRM)
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Sử dụng mã CUS-WALKIN, không ràng buộc số điện thoại
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                    Mặc định
                  </span>
                </button>

                {/* 3. Danh sách khách hàng có sẵn (Scrollable full list) */}
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {isLoading ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      Đang tải danh sách khách hàng từ CRM...
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.customerId}
                        type="button"
                        onClick={() => {
                          onSelectCustomer(c)
                          setDropdownOpen(false)
                          setSearchTerm('')
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs hover:bg-sky-50 transition flex items-center justify-between group"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold text-slate-900 group-hover:text-sky-700 flex items-center gap-1.5">
                            <span>{c.customerName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            {c.phone && c.phone !== '0000000000' && (
                              <span className="font-medium text-slate-600">{c.phone}</span>
                            )}
                            <span className="font-mono text-[10px] text-slate-400">
                              {c.customerCode}
                            </span>
                            {c.address && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[160px]">
                                • {c.address}
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            c.customerType === 'PROJECT'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {c.customerType === 'PROJECT' ? 'Dự án' : 'Khách lẻ'}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500 space-y-2">
                      <p>Không tìm thấy khách hàng nào khớp với "{searchTerm}".</p>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(true)
                          setDropdownOpen(false)
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 underline"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Bấm vào đây để tạo mới khách hàng "{searchTerm}"</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Footer Dropdown: Nút Thêm mới khách hàng */}
                <div className="p-2 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">Không tìm thấy khách hàng?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(true)
                      setDropdownOpen(false)
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-800 bg-white border border-sky-200 px-2.5 py-1 rounded shadow-2xs hover:bg-sky-50 transition"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-sky-600" />
                    <span>Thêm khách hàng mới</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* NHẬP THÔNG TIN KHÁCH LẺ TRỰC TIẾP TẠI QUẦY (TỰ ĐỘNG LƯU VÀO CRM KHI TẠO ĐƠN) */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[11px] text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Hoặc nhập nhanh thông tin khách lẻ (hệ thống sẽ tự lưu vào CRM):</span>
            </p>
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

      {/* ĐỊA CHỈ GIAO HÀNG KHI CHỌN GIAO HÀNG TẬN NƠI (SCHEDULED_DELIVERY) */}
      {isDelivery && (
        <div className="pt-2 border-t border-slate-100 space-y-1">
          <label className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-sky-600" />
            <span>Địa chỉ nhận hàng (Giao hàng tận nơi):</span>
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

      {/* MODAL THÊM NHANH KHÁCH HÀNG MỚI VÀO CRM */}
      <QuickCreateCustomerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        initialName={searchTerm}
        existingCustomers={customerOptions}
        onCustomerCreated={(newCustomer) => {
          onSelectCustomer(newCustomer)
          setShowCreateModal(false)
          setDropdownOpen(false)
          setSearchTerm('')
        }}
      />

      {/* MODAL TRA CỨU CÔNG NỢ (HÀO - CREDIT CONTROL) */}
      {showDebtModal && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setShowDebtModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in duration-150 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
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
                <strong className="text-slate-900">
                  {selectedCustomer?.customerName === 'Walk-in Retail Customer'
                    ? 'Khách lẻ tại quầy'
                    : selectedCustomer?.customerName}
                </strong>{' '}
                (<span className="font-mono">{selectedCustomer?.customerCode}</span>)
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
