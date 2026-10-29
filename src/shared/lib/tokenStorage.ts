const REFRESH_TOKEN_KEY = 'aqs_refresh_token'
const LOGOUT_TOMBSTONE_COOKIE = 'aqs_logout_flag=1'

export interface StorageClearResult {
  storageCleared: boolean
  tombstoneVerified: boolean
  status: 'CLEARED' | 'TOMBSTONED' | 'FAILED'
}

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
   * Reads the refresh token without removing it (e.g. for checking session presence).
   * Refuses to return a token if a logout tombstone is present.
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
   * Returns true if a valid refresh token is stored in sessionStorage
   * and no logout tombstone is active.
   */
  hasRefreshToken(): boolean {
    return !!this.getRefreshToken()
  },

  /**
   * Pops the refresh token from sessionStorage (reads and removes it).
   * Verifies that removal actually succeeded before returning the token.
   * If removal fails, returns null (fail-closed).
   * Ensures that if the subsequent network call or reload fails, the old token
   * cannot be retried.
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
        // Removal failed, fail-closed
        return null
      }
      return token
    } catch {
      return null
    }
  },

  /**
   * Saves the new refresh token to sessionStorage and clears any logout tombstone.
   * Returns true on success, false on failure (fail-closed).
   */
  setRefreshToken(token: string): boolean {
    if (!token || token.trim().length === 0) return false

    // Clear logout tombstone when setting a fresh valid token
    if (typeof document !== 'undefined') {
      try {
        document.cookie = 'aqs_logout_flag=; Max-Age=0; path=/; SameSite=Strict'
      } catch {
        // ignore
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
   * Removes the refresh token from sessionStorage and attempts to set a session tombstone cookie.
   * Explicitly verifies both operations and returns a clear status.
   */
  clearRefreshToken(): StorageClearResult {
    // 1. Attempt to set session tombstone cookie and verify it was actually written
    let tombstoneVerified = false
    if (typeof document !== 'undefined') {
      try {
        document.cookie = `${LOGOUT_TOMBSTONE_COOKIE}; path=/; SameSite=Strict`
        tombstoneVerified = document.cookie.includes(LOGOUT_TOMBSTONE_COOKIE)
      } catch {
        tombstoneVerified = false
      }
    }

    // 2. Attempt to remove token from sessionStorage and verify
    let storageCleared = false
    const storage = getStorage()
    if (storage) {
      try {
        storage.removeItem(REFRESH_TOKEN_KEY)
        const current = storage.getItem(REFRESH_TOKEN_KEY)
        if (current === null || current.trim().length === 0) {
          storageCleared = true
        } else {
          // Fallback: overwrite with empty string
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
