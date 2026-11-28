import { useState, useRef } from 'react'
import { UploadCloud, X, Image as ImageIcon, Video, Loader2, AlertCircle } from 'lucide-react'
import { useUploadTicketMediaMutation } from '../api/warrantyTicketApi'
import type { TicketMedia } from '../types/warrantyTicket.types'

interface MediaUploaderProps {
  value: TicketMedia[]
  onChange: (media: TicketMedia[]) => void
  onUploadingChange?: (isUploading: boolean) => void
  disabled?: boolean
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_VIDEO_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_IMAGES = 5
const MAX_VIDEOS = 1

export function MediaUploader({
  value,
  onChange,
  onUploadingChange,
  disabled = false,
}: MediaUploaderProps) {
  const [uploadMedia] = useUploadTicketMediaMutation()
  const [uploadingCount, setUploadingCount] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const imageCount = value.filter((m) => m.type === 'IMAGE').length
  const videoCount = value.filter((m) => m.type === 'VIDEO').length

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setErrorMsg(null)

    const fileList = Array.from(files)
    let currentImages = imageCount
    let currentVideos = videoCount

    for (const file of fileList) {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')

      if (!isImage && !isVideo) {
        setErrorMsg(`File "${file.name}" không hợp lệ. Chỉ chấp nhận ảnh (JPEG, PNG, WEBP) hoặc video (MP4, MOV).`)
        continue
      }

      if (isImage) {
        if (currentImages >= MAX_IMAGES) {
          setErrorMsg(`Bạn chỉ có thể tải lên tối đa ${MAX_IMAGES} ảnh.`)
          continue
        }
        if (file.size > MAX_IMAGE_SIZE) {
          setErrorMsg(`Ảnh "${file.name}" vượt quá dung lượng tối đa 5MB.`)
          continue
        }
        currentImages++
      }

      if (isVideo) {
        if (currentVideos >= MAX_VIDEOS) {
          setErrorMsg(`Bạn chỉ có thể tải lên tối đa ${MAX_VIDEOS} video.`)
          continue
        }
        if (file.size > MAX_VIDEO_SIZE) {
          setErrorMsg(`Video "${file.name}" vượt quá dung lượng tối đa 20MB.`)
          continue
        }
        currentVideos++
      }

      // Upload file
      setUploadingCount((c) => {
        const next = c + 1
        onUploadingChange?.(next > 0)
        return next
      })

      const formData = new FormData()
      formData.append('file', file)

      try {
        const res = await uploadMedia(formData).unwrap()
        onChange([...value, res])
      } catch (err: any) {
        const msg = err?.data?.message || err?.message || 'Tải file thất bại'
        setErrorMsg(`Lỗi khi tải "${file.name}": ${msg}`)
      } finally {
        setUploadingCount((c) => {
          const next = Math.max(0, c - 1)
          onUploadingChange?.(next > 0)
          return next
        })
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleRemove = (index: number) => {
    const next = [...value]
    next.splice(index, 1)
    onChange(next)
  }

  const isUploading = uploadingCount > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">
          Hình ảnh / Video thực tế sự cố{' '}
          <span className="font-normal text-slate-500">(Không bắt buộc)</span>
        </label>
        <span className="text-[11px] text-slate-500">
          Ảnh: {imageCount}/{MAX_IMAGES} • Video: {videoCount}/{MAX_VIDEOS}
        </span>
      </div>

      <p className="text-xs text-slate-500">
        Nên đính kèm ảnh hoặc video để cửa hàng đánh giá nhanh hơn và chuẩn bị linh kiện thay thế phù hợp.
      </p>

      {/* Upload Drop area */}
      <div
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center border border-dashed border-[#D6D1C7] bg-[#FAF9F6] p-5 text-center transition-colors ${
          disabled || isUploading
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer hover:border-[#171614] hover:bg-[#F2EFE9]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={disabled || isUploading}
        />
        {isUploading ? (
          <div className="flex flex-col items-center gap-1.5 text-xs text-[#171614]">
            <Loader2 className="h-6 w-6 animate-spin text-[#8C6D46]" />
            <span>Đang tải lên media ({uploadingCount} file đang xử lý)...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-xs text-[#57534E]">
            <UploadCloud className="h-6 w-6 text-[#8C6D46]" />
            <span className="font-medium text-[#171614]">
              Nhấp để chọn ảnh / video hoặc kéo thả vào đây
            </span>
            <span className="text-[11px] text-[#78736A]">
              Ảnh: JPEG, PNG, WEBP (tối đa 5MB) &middot; Video: MP4, MOV (tối đa 20MB)
            </span>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 border border-[#E5B8B8] bg-[#FEF2F2] p-3 text-xs text-[#991B1B]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Media Previews */}
      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {value.map((m, idx) => (
            <div
              key={m.publicId || idx}
              className="group relative flex flex-col items-center overflow-hidden border border-[#E6E2DA] bg-white p-1.5 text-xs"
            >
              {m.type === 'IMAGE' ? (
                <div className="relative h-20 w-full overflow-hidden bg-[#EFECE6]">
                  <img
                    src={m.url}
                    alt="Ảnh sự cố"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <ImageIcon className="absolute inset-0 m-auto h-6 w-6 text-[#8C867C]" />
                </div>
              ) : (
                <div className="flex h-20 w-full flex-col items-center justify-center bg-[#EFECE6] text-[#171614]">
                  <Video className="h-6 w-6 text-[#8C6D46]" />
                  <span className="mt-1 text-[10px] font-medium text-[#57534E]">Video sự cố</span>
                </div>
              )}
              <div className="mt-1 flex w-full items-center justify-between px-1 text-[11px] text-[#78736A]">
                <span className="truncate">{m.type === 'IMAGE' ? 'Ảnh' : 'Video'}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemove(idx)
                    }}
                    className="p-0.5 text-[#78736A] hover:text-[#991B1B] cursor-pointer"
                    title="Xóa file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

