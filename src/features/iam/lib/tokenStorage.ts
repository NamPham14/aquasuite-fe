const REFRESH_TOKEN_KEY = 'aqs_refresh_token'

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
   * Reads the refresh token without removing it (e.g. for checking session presence).
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
   * Returns true if a refresh token is stored in sessionStorage.
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
    const storage = getStorage()
    if (!storage) return null
    try {
      const token = storage.getItem(REFRESH_TOKEN_KEY)
      if (!token) return null

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
   * Saves the new refresh token to sessionStorage.
   * Returns true on success, false on failure (fail-closed).
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
   * Safely removes the refresh token from sessionStorage.
   */
  clearRefreshToken(): void {
    const storage = getStorage()
    if (!storage) return
    try {
      storage.removeItem(REFRESH_TOKEN_KEY)
    } catch {
      // ignore
    }
  },
}
