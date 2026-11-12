import { useMemo, useState } from 'react'
import type { TechnicalJobFilterParams, TechnicalJobStatus, TechnicalJobType } from '../types/technicalJob.types'

/**
 * Quản lý trạng thái bộ lọc cho màn Tra cứu Công việc kỹ thuật (UC-59).
 * Gom trạng thái, loại công việc, khoảng ngày lịch hẹn và số trang về một nơi, đồng thời dựng sẵn
 * object tham số truyền cho query. Mọi thay đổi bộ lọc đều đưa trang về 1 để tránh lệch kết quả.
 * Khoảng ngày nhập ở dạng yyyy-MM-dd (input date) và được nới ra đầu/cuối ngày khi gửi lên BE.
 */
export function useTechnicalJobFilters(initial?: { page?: number; size?: number }) {
  const [status, setStatusRaw] = useState<TechnicalJobStatus | ''>('')
  const [jobType, setJobTypeRaw] = useState<TechnicalJobType | ''>('')
  const [fromDate, setFromDateRaw] = useState('')
  const [toDate, setToDateRaw] = useState('')
  const [page, setPage] = useState(initial?.page ?? 1)
  const size = initial?.size ?? 10

  const setStatus = (value: TechnicalJobStatus | '') => { setStatusRaw(value); setPage(1) }
  const setJobType = (value: TechnicalJobType | '') => { setJobTypeRaw(value); setPage(1) }
  const setFromDate = (value: string) => { setFromDateRaw(value); setPage(1) }
  const setToDate = (value: string) => { setToDateRaw(value); setPage(1) }

  /** Đặt lại toàn bộ bộ lọc về mặc định. */
  const resetFilters = () => {
    setStatusRaw('')
    setJobTypeRaw('')
    setFromDateRaw('')
    setToDateRaw('')
    setPage(1)
  }

  const queryParams = useMemo<TechnicalJobFilterParams>(() => ({
    status: status || undefined,
    jobType: jobType || undefined,
    // Nới khoảng ngày: từ đầu ngày "from" tới cuối ngày "to" để bao trọn lịch hẹn trong ngày đó.
    from: fromDate ? `${fromDate}T00:00:00Z` : undefined,
    to: toDate ? `${toDate}T23:59:59Z` : undefined,
    page,
    size,
    // Mặc định: công việc mới tạo nhất lên đầu (job auto-sinh/tạo tay hiện ngay trên cùng).
    sortBy: 'createdAt',
    direction: 'desc',
  }), [status, jobType, fromDate, toDate, page, size])

  return {
    status, setStatus,
    jobType, setJobType,
    fromDate, setFromDate,
    toDate, setToDate,
    page, setPage,
    resetFilters,
    queryParams,
  }
}
