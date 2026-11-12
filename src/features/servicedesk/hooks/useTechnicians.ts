import { useMemo } from 'react'
import { useGetUserAccountsQuery } from '../../iam/api/userAccountApi'

const TECHNICIAN_ROLE_CODE = 'TECHNICAL_STAFF'

/**
 * Lấy danh sách kỹ thuật viên đang hoạt động để chọn khi phân công / tạo công việc.
 * Gọi /iam/users (page 0-based, status ACTIVE) rồi lọc client-side theo vai trò TECHNICAL_STAFF —
 * tránh phụ thuộc roleId và sai lệch phân trang. Dùng chung cho dialog Phân công và dialog Tạo công việc.
 */
export function useTechnicians() {
  const { data, isFetching } = useGetUserAccountsQuery({ status: 'ACTIVE', page: 0, size: 200 })
  const technicians = useMemo(
    () => (data?.content ?? []).filter((u) => u.roles?.some((r) => r.code?.toUpperCase() === TECHNICIAN_ROLE_CODE)),
    [data],
  )
  return { technicians, isLoading: isFetching }
}
