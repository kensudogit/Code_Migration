import type {
  ConvertResponse,
  DirectionInfo,
  HealthResponse,
  JobDetail,
  JobSummary,
} from './types'

const BASE = '/api/v1'

const CONVERT_TIMEOUT_MS = 300_000

function formatApiError(body: string, status: number): string {
  if (!body.trim()) {
    return status === 500 ? 'Server error (empty response). Retry or check Railway logs.' : `HTTP ${status}`
  }
  try {
    const j = JSON.parse(body) as { detail?: unknown }
    const d = j.detail
    if (typeof d === 'string') return d
    if (Array.isArray(d)) {
      return d
        .map((item) => {
          if (item && typeof item === 'object' && 'msg' in item) {
            return String((item as { msg: string }).msg)
          }
          return JSON.stringify(item)
        })
        .join('; ')
    }
  } catch {
    /* keep raw */
  }
  return body.length > 500 ? `${body.slice(0, 500)}…` : body
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(formatApiError(body, res.status))
  }
  return res.json() as Promise<T>
}

export function getHealth() {
  return fetchJson<HealthResponse>('/health')
}

export function getDirections() {
  return fetchJson<{ directions: DirectionInfo[] }>('/directions').then((r) => r.directions)
}

export function convertCode(direction: string, sourceCode: string) {
  return fetchJson<ConvertResponse>('/convert', {
    method: 'POST',
    body: JSON.stringify({ direction, source_code: sourceCode, save_history: true }),
    signal: AbortSignal.timeout(CONVERT_TIMEOUT_MS),
  })
}

export function listJobs(limit = 20) {
  return fetchJson<JobSummary[]>(`/jobs?limit=${limit}`)
}

export function getJob(id: string) {
  return fetchJson<JobDetail>(`/jobs/${id}`)
}
