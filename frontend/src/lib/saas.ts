const API_KEY_STORAGE = 'cm-api-key-v1'

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem(API_KEY_STORAGE)?.trim() ?? ''
}

export function setStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return
  const trimmed = key.trim()
  if (trimmed) {
    localStorage.setItem(API_KEY_STORAGE, trimmed)
  } else {
    localStorage.removeItem(API_KEY_STORAGE)
  }
}

export function saasAuthHeaders(): Record<string, string> {
  const key = getStoredApiKey()
  return key ? { 'X-API-Key': key } : {}
}
