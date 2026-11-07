import { normalizeApiError } from '../../../shared/api/apiError.ts'

export function getUserAccountErrorState(error: unknown): { message: string; fields: Record<string, string> } {
  const parsed = normalizeApiError(error)
  return {
    message: parsed.message,
    fields: Object.fromEntries((parsed.errors ?? []).map((item) => [item.field, item.message])),
  }
}
