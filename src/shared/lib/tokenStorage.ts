const REFRESH_TOKEN_KEY = 'aqs_refresh_token'
const LOGOUT_TOMBSTONE_COOKIE = 'aqs_logout_flag=1'

export interface StorageClearResult {
  storageCleared: boolean
  tombstoneVerified: boolean
  status: 'CLEARED' | 'TOMBSTONED' | 'FAILED'
}

/** Truy cập sessionStorage an toàn; trả null nếu không có browser hoặc bị chặn. */
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

/** Kiểm tra dấu logout để không khôi phục token có thể còn sót trong storage. */
function hasLogoutTombstone(): boolean {
  if (typeof document === 'undefined') return false
  try {
    return document.cookie.includes(LOGOUT_TOMBSTONE_COOKIE)
  } catch {
    return false
  }
}

export const tokenStorage = {
  /**
   * Đọc token chưa xóa; nếu đã có dấu logout thì không cho khôi phục.
   */
  getRefreshToken(): string | null {
    if (hasLogoutTombstone()) {
      return null
    }

    const storage = getStorage()
    if (!storage) return null
    try {
      const token = storage.getItem(REFRESH_TOKEN_KEY)
      return token && token.trim().length > 0 ? token : null
    } catch {
      return null
    }
  },

  /**
   * Kiểm tra có token chưa rỗng và không bị dấu logout chặn hay không.
   */
  hasRefreshToken(): boolean {
    return !!this.getRefreshToken()
  },

  /**
   * Lấy và xóa token trước khi gửi refresh; chỉ trả token khi việc xóa đã được xác minh.
   * Nếu xóa thất bại trả null; token cũ không được thử lại sau lỗi mạng hoặc tải lại.
   */
  popRefreshToken(): string | null {
    if (hasLogoutTombstone()) {
      return null
    }

    const storage = getStorage()
    if (!storage) return null
    try {
      const token = storage.getItem(REFRESH_TOKEN_KEY)
      if (!token || token.trim().length === 0) return null

      storage.removeItem(REFRESH_TOKEN_KEY)
      if (storage.getItem(REFRESH_TOKEN_KEY) !== null) {
        // Xóa thất bại, không trả token để tiếp tục.
        return null
      }
      return token
    } catch {
      return null
    }
  },

  /**
   * Lưu token mới, thử xóa dấu logout và kiểm tra giá trị đã ghi.
   * Trả true khi lưu thành công, false khi không thể lưu.
   */
  setRefreshToken(token: string): boolean {
    if (!token || token.trim().length === 0) return false

    // Thử xóa dấu logout khi lưu token mới hợp lệ.
    if (typeof document !== 'undefined') {
      try {
        document.cookie = 'aqs_logout_flag=; Max-Age=0; path=/; SameSite=Strict'
      } catch {
        // Bỏ qua lỗi xóa cookie; việc lưu token vẫn được kiểm tra bên dưới.
      }
    }

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
   * Thử đặt dấu logout và xóa token; trả trạng thái CLEARED, TOMBSTONED hoặc FAILED.
   */
  clearRefreshToken(): StorageClearResult {
    // 1. Thử đặt cookie đánh dấu logout và xác minh đã ghi.
    let tombstoneVerified = false
    if (typeof document !== 'undefined') {
      try {
        document.cookie = `${LOGOUT_TOMBSTONE_COOKIE}; path=/; SameSite=Strict`
        tombstoneVerified = document.cookie.includes(LOGOUT_TOMBSTONE_COOKIE)
      } catch {
        tombstoneVerified = false
      }
    }

    // 2. Thử xóa token khỏi sessionStorage và xác minh kết quả.
    let storageCleared = false
    const storage = getStorage()
    if (storage) {
      try {
        storage.removeItem(REFRESH_TOKEN_KEY)
        const current = storage.getItem(REFRESH_TOKEN_KEY)
        if (current === null || current.trim().length === 0) {
          storageCleared = true
        } else {
          // Nếu không xóa được, thử ghi đè bằng chuỗi rỗng.
          try {
            storage.setItem(REFRESH_TOKEN_KEY, '')
            const postVal = storage.getItem(REFRESH_TOKEN_KEY)
            storageCleared = postVal === null || postVal === ''
          } catch {
            storageCleared = false
          }
        }
      } catch {
        storageCleared = false
      }
    }

    const status: 'CLEARED' | 'TOMBSTONED' | 'FAILED' = storageCleared
      ? 'CLEARED'
      : tombstoneVerified
        ? 'TOMBSTONED'
        : 'FAILED'

    return {
      storageCleared,
      tombstoneVerified,
      status,
    }
  },
}
