import { z } from 'zod'

/**
 * Các schema kiểm tra đầu vào cho thao tác công việc kỹ thuật (FE-13),
 * khớp ràng buộc validation ở backend (ServicedeskErrorCode + @NotBlank/@NotNull).
 */

/** Từ chối công việc (UC-60): bắt buộc lý do (BR tương ứng SVD_004). */
export const rejectJobSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập lý do từ chối')
    .max(2000, 'Lý do từ chối tối đa 2000 ký tự'),
})
export type RejectJobFormData = z.infer<typeof rejectJobSchema>

/** Ghi kết quả & hoàn tất (UC-61): bắt buộc kết quả, ghi chú tùy chọn (SVD_005). */
export const completeJobSchema = z.object({
  result: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập kết quả thực hiện')
    .max(4000, 'Kết quả thực hiện tối đa 4000 ký tự'),
  technicalNote: z
    .string()
    .trim()
    .max(4000, 'Ghi chú kỹ thuật tối đa 4000 ký tự')
    .optional()
    .or(z.literal('')),
})
export type CompleteJobFormData = z.infer<typeof completeJobSchema>

/** Phân công công việc (Chủ cửa hàng): bắt buộc chọn kỹ thuật viên (SVD_006), lịch hẹn tùy chọn. */
export const assignJobSchema = z.object({
  technicianId: z.string().trim().min(1, 'Vui lòng chọn kỹ thuật viên'),
  scheduledAt: z.string().optional().or(z.literal('')),
})
export type AssignJobFormData = z.infer<typeof assignJobSchema>

/**
 * Tạo công việc kỹ thuật thủ công (Chủ cửa hàng). Bắt buộc loại/khách/địa chỉ/mô tả;
 * lịch hẹn và kỹ thuật viên là tùy chọn (để trống nghĩa là phân công sau).
 */
export const createJobSchema = z.object({
  jobType: z.enum(['SURVEY', 'INSTALLATION', 'WARRANTY_REPAIR'], { error: 'Vui lòng chọn loại công việc' }),
  customerId: z.string().trim().min(1, 'Vui lòng chọn khách hàng'),
  serviceAddress: z.string().trim().min(1, 'Vui lòng nhập địa chỉ dịch vụ').max(1000, 'Địa chỉ tối đa 1000 ký tự'),
  issueDescription: z.string().trim().min(1, 'Vui lòng nhập mô tả công việc').max(4000, 'Mô tả tối đa 4000 ký tự'),
  scheduledAt: z.string().optional().or(z.literal('')),
  technicianId: z.string().optional().or(z.literal('')),
})
export type CreateJobFormData = z.infer<typeof createJobSchema>
