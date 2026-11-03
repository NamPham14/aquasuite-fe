import { z } from 'zod'

/** Chuẩn hóa mã theo quy tắc catalog của BE trước khi kiểm tra định dạng. */
export const catalogCodeSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập mã.')
  .max(50, 'Mã tối đa 50 ký tự.')
  .transform((value) => value.toUpperCase())
  .refine(
    (value) => /^[A-Z0-9][A-Z0-9_]*$/.test(value),
    'Mã chỉ gồm chữ A-Z, số và dấu gạch dưới; ký tự đầu phải là chữ hoặc số.',
  )

/** Tên bắt buộc, loại bỏ khoảng trắng hai đầu và giới hạn 100 ký tự. */
export const catalogNameSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập tên.')
  .max(100, 'Tên tối đa 100 ký tự.')

/** Mô tả tùy chọn có giới hạn 5000 ký tự sau khi loại khoảng trắng hai đầu. */
export const catalogDescriptionSchema = z
  .string()
  .trim()
  .max(5000, 'Mô tả tối đa 5000 ký tự.')

/** Các trạng thái catalog được BE hỗ trợ. */
export const catalogStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])
