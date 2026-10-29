/** Chọn URL theo cấu hình; Node cần URL tuyệt đối để fetch trong test. */
export function resolveApiBaseUrl(configuredUrl: string | undefined, runtime: 'browser' | 'node'): string {
  if (runtime === 'browser') return configuredUrl || '/api/v1'

  if (configuredUrl && /^https?:\/\//i.test(configuredUrl)) return configuredUrl
  return 'http://localhost/api/v1'
}

/** Đọc cấu hình Vite và xác định môi trường đang chạy. */
export function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env?.VITE_API_BASE_URL
  const runtime = typeof window !== 'undefined' && window.location?.origin ? 'browser' : 'node'
  return resolveApiBaseUrl(configuredUrl, runtime)
}
