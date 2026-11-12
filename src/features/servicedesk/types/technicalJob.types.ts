/**
 * Kiểu dữ liệu cho nghiệp vụ Công việc kỹ thuật (FE-13, UC-59/60/61).
 * Phản chiếu đúng DTO của backend module servicedesk (TechnicalJobController).
 */

/**
 * Trạng thái vòng đời công việc kỹ thuật (khớp enum TechnicalJobStatus ở BE).
 * ASSIGNED → IN_PROGRESS (accept) → COMPLETED (complete); hoặc ASSIGNED → REJECTED (reject).
 */
export type TechnicalJobStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'

/** Loại công việc kỹ thuật (khớp enum TechnicalJobType ở BE). */
export type TechnicalJobType = 'SURVEY' | 'INSTALLATION' | 'WARRANTY_REPAIR'

/** Nhãn tiếng Việt cho loại công việc kỹ thuật, dùng chung cho bảng, bộ lọc và chi tiết. */
export const JOB_TYPE_LABEL: Record<TechnicalJobType, string> = {
  SURVEY: 'Khảo sát',
  INSTALLATION: 'Lắp đặt',
  WARRANTY_REPAIR: 'Sửa chữa bảo hành',
}

/**
 * Một dòng công việc hiển thị trên bảng tra cứu/lịch (UC-59).
 * Trả về từ GET /technical-jobs (bên trong Spring Page).
 */
export interface TechnicalJobListItem {
  technicalJobId: string
  customerId: string
  technicianId?: string | null
  jobType: TechnicalJobType
  status: TechnicalJobStatus
  serviceAddress: string
  issueDescription: string
  scheduledAt?: string | null
  completedAt?: string | null
  createdAt: string
}

/** Chi tiết đầy đủ một công việc. Trả về từ GET /technical-jobs/{id} và các thao tác accept/reject/complete/assign. */
export interface TechnicalJobDetail extends TechnicalJobListItem {
  orderId?: string | null
  warrantyRecordId?: string | null
  createdBy: string
  result?: string | null
  technicalNote?: string | null
  rejectionReason?: string | null
}

/** Tham số lọc cho màn tra cứu công việc (page tính từ 1 ở tầng UI). */
export interface TechnicalJobFilterParams {
  status?: TechnicalJobStatus | ''
  jobType?: TechnicalJobType | ''
  /** Lọc theo khoảng lịch hẹn scheduledAt, định dạng ISO-8601 (vd 2026-01-10T00:00:00Z). */
  from?: string
  to?: string
  page?: number
  size?: number
  sortBy?: string
  direction?: 'asc' | 'desc'
}

/** Body từ chối công việc (POST /technical-jobs/{id}/reject). */
export interface RejectTechnicalJobRequest {
  reason: string
}

/** Body ghi kết quả & hoàn tất (POST /technical-jobs/{id}/complete). */
export interface CompleteTechnicalJobRequest {
  result: string
  technicalNote?: string | null
}

/** Body phân công cho kỹ thuật viên (POST /technical-jobs/{id}/assign). */
export interface AssignTechnicalJobRequest {
  technicianId: string
  /** Lịch hẹn (ISO-8601) đặt luôn khi phân công; null/bỏ qua = giữ lịch hiện có. */
  scheduledAt?: string | null
}

/**
 * Body tạo công việc kỹ thuật thủ công (POST /technical-jobs) — thao tác của Chủ cửa hàng.
 * Không phụ thuộc loại đơn; dùng cho mọi khách (lẻ/quầy/công trình) và cả 3 loại công việc.
 */
export interface CreateTechnicalJobRequest {
  jobType: TechnicalJobType
  customerId: string
  serviceAddress: string
  issueDescription: string
  scheduledAt?: string | null
  technicianId?: string | null
  orderId?: string | null
  warrantyRecordId?: string | null
}
