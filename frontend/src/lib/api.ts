import type {
  ConvertResponse,
  DirectionInfo,
  HealthResponse,
  JobDetail,
  JobSummary,
} from './types'

const BASE = '/api/v1'

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
    let message = body
    try {
      const j = JSON.parse(body) as { detail?: string }
      message = j.detail ?? body
    } catch {
      /* keep raw */
    }
    throw new Error(message || res.statusText)
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
  })
}

export function listJobs(limit = 20) {
  return fetchJson<JobSummary[]>(`/jobs?limit=${limit}`)
}

export function getJob(id: string) {
  return fetchJson<JobDetail>(`/jobs/${id}`)
}
