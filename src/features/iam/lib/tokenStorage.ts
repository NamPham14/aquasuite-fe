// Bản storage cũ còn trong repo; luồng auth hiện tại import từ shared/lib/tokenStorage.ts.
const REFRESH_TOKEN_KEY = 'aqs_refresh_token'

/** Lấy sessionStorage an toàn cho bản storage này; trả null nếu không truy cập được. */
function getStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export const tokenStorage = {
  /**
   * Đọc token mà không xóa; đây là API của bản storage cũ.
   */
  getRefreshToken(): string | null {
    const storage = getStorage()
    if (!storage) return null
    try {
      return storage.getItem(REFRESH_TOKEN_KEY)
    } catch {
      return null
    }
  },

  /**
   * Kiểm tra có token trong storage hay không.
   */
  hasRefreshToken(): boolean {
    return !!this.getRefreshToken()
  },

  /**
   * Lấy và xóa token, chỉ trả token nếu xác minh xóa thành công.
   */
  popRefreshToken(): string | null {
    const storage = getStorage()
    if (!storage) return null
    try {
      const token = storage.getItem(REFRESH_TOKEN_KEY)
      if (!token) return null

      storage.removeItem(REFRESH_TOKEN_KEY)
      if (storage.getItem(REFRESH_TOKEN_KEY) !== null) {
        // Xóa thất bại nên không trả token để tiếp tục.
        return null
      }
      return token
    } catch {
      return null
    }
  },

  /**
   * Lưu token và xác minh giá trị đã ghi.
   */
  setRefreshToken(token: string): boolean {
    const storage = getStorage()
    if (!storage) return false
    try {
      storage.setItem(REFRESH_TOKEN_KEY, token)
      return storage.getItem(REFRESH_TOKEN_KEY) === token
    } catch {
      return false
    }
  },

  /**
   * Thử xóa token; bản cũ này không trả kết quả hoặc đặt dấu logout.
   */
  clearRefreshToken(): void {
    const storage = getStorage()
    if (!storage) return
    try {
      storage.removeItem(REFRESH_TOKEN_KEY)
    } catch {
      // Bỏ qua lỗi xóa; bản này không trả trạng thái cho nơi gọi.
    }
  },
}
