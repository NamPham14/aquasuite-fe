import { useState } from 'react'
import {
  Camera,
  CheckCircle2,
  Mail,
  Phone,
  Save,
  Shield,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { normalizeApiError } from '../../../shared/api/apiError.ts'
import {
  useUpdateMyProfileMutation,
  useUploadProfileAvatarMutation,
} from '../api/profileApi.ts'
import type { UserProfileResponse } from '../types/profile.types.ts'

interface ProfileInfoSectionProps {
  profile: UserProfileResponse
}

/**
 * Tab Quản lý thông tin cá nhân, số điện thoại & ảnh đại diện của khách hàng.
 */
export function ProfileInfoSection({ profile }: ProfileInfoSectionProps) {
  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null)
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null)
  const [avatarUrlDraft, setAvatarUrlDraft] = useState<string | null>(null)

  const [updateMyProfile, { isLoading: isSaving }] = useUpdateMyProfileMutation()
  const [uploadAvatar, { isLoading: isUploadingAvatar }] = useUploadProfileAvatarMutation()

  const fullName = fullNameDraft ?? profile.fullName ?? ''
  const phone = phoneDraft ?? profile.phone ?? ''
  const avatarUrl = avatarUrlDraft ?? profile.avatarUrl ?? ''

  const hasChanges =
    fullName.trim() !== (profile.fullName ?? '').trim() ||
    phone.trim() !== (profile.phone ?? '').trim() ||
    avatarUrl.trim() !== (profile.avatarUrl ?? '').trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = fullName.trim()
    const trimmedPhone = phone.trim()
    const trimmedAvatar = avatarUrl.trim()

    if (!trimmedName) {
      toast.error('Họ và tên không được để trống')
      return
    }
    if (trimmedPhone && !/^0\d{9}$/.test(trimmedPhone)) {
      toast.error('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng số 0')
      return
    }

    try {
      await updateMyProfile({
        fullName: trimmedName,
        phone: trimmedPhone || undefined,
        avatarUrl: trimmedAvatar || undefined,
      }).unwrap()
      setFullNameDraft(null)
      setPhoneDraft(null)
      setAvatarUrlDraft(null)
      toast.success('Đã cập nhật thông tin cá nhân & số điện thoại')
    } catch (err) {
      toast.error(normalizeApiError(err).message)
    }
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await uploadAvatar(formData).unwrap()
      setAvatarUrlDraft(res.avatarUrl)
      toast.success('Đã tải ảnh đại diện mới')
    } catch (err) {
      toast.error(normalizeApiError(err).message)
    } finally {
      e.target.value = ''
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="border border-[#E6E2DA] bg-white p-6 sm:p-8 space-y-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-3 pb-4 border-b border-[#E6E2DA]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#78736A]">
            Thông tin định danh
          </p>
          <h2 className="font-editorial text-xl font-normal text-[#171614] mt-0.5">
            Thông tin tài khoản &amp; Số điện thoại
          </h2>
          <p className="text-xs text-[#6B6760] mt-1">
            Cập nhật họ tên, số điện thoại liên hệ nhận hàng và kích hoạt bảo hành điện tử.
          </p>
        </div>

        {profile.customerCode && (
          <span className="inline-flex items-center gap-1.5 border border-[#C6DDD0] bg-[#EEF5F1] px-3 py-1 text-[11px] font-medium text-[#245C42]">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Mã KH: {profile.customerCode}</span>
          </span>
        )}
      </div>

      {/* Khu vực Avatar */}
      <div className="flex flex-wrap items-center gap-5 p-5 bg-[#FAF9F6] border border-[#E6E2DA]">
        <div className="relative h-16 w-16 shrink-0 border border-[#D6D1C7] bg-[#171614] text-[#C5B091] flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName || profile.username}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound className="h-7 w-7" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-xs font-semibold text-[#171614]">Ảnh đại diện tài khoản</p>
          <p className="text-[11px] text-[#78736A]">
            Hỗ trợ định dạng JPG, PNG, WEBP đồng bộ trực tiếp với hồ sơ.
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 border border-[#D6D1C7] bg-white px-3.5 py-1.5 text-[11px] uppercase tracking-[0.12em] font-semibold text-[#171614] hover:border-[#171614] transition-colors cursor-pointer">
              <Camera className="h-3.5 w-3.5 text-[#8C6D46]" aria-hidden="true" />
              <span>{isUploadingAvatar ? 'Đang tải ảnh...' : 'Tải ảnh lên'}</span>
              <input
                type="file"
                accept="image/*"
                disabled={isUploadingAvatar}
                onChange={(e) => void handleAvatarFileChange(e)}
                className="sr-only"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Form thông tin */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
        <div>
          <label
            htmlFor="profile-fullName"
            className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5"
          >
            Họ và tên <span className="text-[#991B1B]">*</span>
          </label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867C]" />
            <input
              id="profile-fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullNameDraft(e.target.value)}
              maxLength={150}
              placeholder="Nhập họ và tên đầy đủ"
              className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] pl-9 pr-3 text-xs sm:text-sm font-medium text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="profile-phone"
            className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5"
          >
            Số điện thoại liên hệ
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867C]" />
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhoneDraft(e.target.value)}
              placeholder="Ví dụ: 0987654321"
              className="w-full h-10 border border-[#D6D1C7] bg-[#FAF9F6] pl-9 pr-3 text-xs sm:text-sm font-medium text-[#171614] focus:border-[#171614] focus:bg-white focus:outline-none tabular-nums"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[#78736A]">
            Gồm 10 chữ số, bắt đầu bằng số 0. Đồng bộ với hồ sơ khách hàng.
          </p>
        </div>

        <div>
          <label
            htmlFor="profile-email"
            className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5"
          >
            Email đăng nhập
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867C]" />
            <input
              id="profile-email"
              type="email"
              readOnly
              value={profile.email}
              className="w-full h-10 border border-[#E6E2DA] bg-[#F2EFE9] pl-9 pr-3 text-xs sm:text-sm text-[#6B6760] cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="profile-username"
            className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#57534E] mb-1.5"
          >
            Tên đăng nhập &amp; Hạng khách
          </label>
          <div className="relative">
            <Shield className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867C]" />
            <input
              id="profile-username"
              type="text"
              readOnly
              value={`${profile.username}${profile.customerTier ? ` · ${profile.customerTier}` : ''}`}
              className="w-full h-10 border border-[#E6E2DA] bg-[#F2EFE9] pl-9 pr-3 text-xs sm:text-sm text-[#6B6760] cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="pt-4 flex flex-wrap items-center justify-end gap-3 border-t border-[#E6E2DA]">
        {hasChanges && (
          <button
            type="button"
            onClick={() => {
              setFullNameDraft(null)
              setPhoneDraft(null)
              setAvatarUrlDraft(null)
            }}
            className="h-10 border border-[#D6D1C7] bg-white px-4 text-[11px] uppercase tracking-[0.14em] font-medium text-[#57534E] hover:border-[#171614] hover:text-[#171614] transition-colors cursor-pointer"
          >
            Hủy thay đổi
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving || !hasChanges}
          className="h-10 inline-flex items-center gap-2 border border-[#171614] bg-[#171614] px-6 text-[11px] uppercase tracking-[0.16em] font-semibold text-[#FAF9F6] hover:bg-[#2A2825] disabled:border-[#E6E2DA] disabled:bg-[#ECE8E0] disabled:text-[#8C867C] transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Save className="h-3.5 w-3.5 text-[#C5B091]" aria-hidden="true" />
          <span>{isSaving ? 'Đang lưu...' : 'Lưu thông tin'}</span>
        </button>
      </div>
    </form>
  )
}
