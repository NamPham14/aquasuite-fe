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
      className="rounded-3xl border border-sky-200/80 bg-white/95 p-5 sm:p-7 shadow-sm space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            Thông tin tài khoản &amp; Số điện thoại
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cập nhật họ tên và số điện thoại liên hệ nhận hàng, kích hoạt bảo hành điện tử.
          </p>
        </div>

        {profile.customerCode && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-[11px] font-bold text-sky-800">
            <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            Mã KH: {profile.customerCode}
          </span>
        )}
      </div>

      {/* Khu vực Avatar */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70">
        <div className="relative h-16 w-16 shrink-0 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white flex items-center justify-center overflow-hidden shadow-md shadow-sky-500/20">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName || profile.username}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserRound className="h-8 w-8" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-xs font-bold text-slate-900">Ảnh đại diện tài khoản</p>
          <p className="text-[11px] text-slate-500">
            Hỗ trợ định dạng JPG, PNG, WEBP hoặc dán liên kết ảnh trực tiếp.
          </p>
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-50 transition cursor-pointer">
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label htmlFor="profile-fullName" className="block font-bold text-slate-700 mb-1.5">
            Họ và tên <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="profile-fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullNameDraft(e.target.value)}
              maxLength={150}
              placeholder="Nhập họ và tên đầy đủ"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs sm:text-sm font-medium text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile-phone" className="block font-bold text-slate-700 mb-1.5">
            Số điện thoại liên hệ
          </label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhoneDraft(e.target.value)}
              placeholder="Ví dụ: 0987654321"
              className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs sm:text-sm font-medium text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Gồm 10 chữ số, bắt đầu bằng số 0. Đồng bộ trực tiếp với hồ sơ CRM.
          </p>
        </div>

        <div>
          <label htmlFor="profile-email" className="block font-bold text-slate-700 mb-1.5">
            Email đăng nhập
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="profile-email"
              type="email"
              readOnly
              value={profile.email}
              className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs sm:text-sm text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile-username" className="block font-bold text-slate-700 mb-1.5">
            Tên đăng nhập &amp; Hạng khách
          </label>
          <div className="relative">
            <Shield className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="profile-username"
              type="text"
              readOnly
              value={`${profile.username}${profile.customerTier ? ` • ${profile.customerTier}` : ''}`}
              className="w-full h-10 rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs sm:text-sm text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100">
        {hasChanges && (
          <button
            type="button"
            onClick={() => {
              setFullNameDraft(null)
              setPhoneDraft(null)
              setAvatarUrlDraft(null)
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Hủy thay đổi
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving || !hasChanges}
          className="aqua-shine-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white hover:from-sky-500 hover:to-cyan-500 disabled:opacity-45 transition shadow-md shadow-sky-500/20 cursor-pointer disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          <span>{isSaving ? 'Đang lưu...' : 'Lưu thông tin'}</span>
        </button>
      </div>
    </form>
  )
}

