import { saasAuthHeaders } from '@/lib/saas'
import type {
  ConvertResponse,
  DirectionId,
  DirectionInfo,
  HealthResponse,
  JobDetail,
  JobSummary,
  TenantMeResponse,
} from './types'

const BASE = '/api/v1'

const START_TIMEOUT_MS = 300_000
const POLL_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 2000
const POLL_MAX_MS = 900_000

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

function wrapFetchError(err: unknown): Error {
  if (err instanceof Error) {
    const name = err.name
    const msg = err.message.toLowerCase()
    if (name === 'TimeoutError' || name === 'AbortError' || msg.includes('timed out') || msg.includes('timeout')) {
      return new Error(
        '変換がタイムアウトしました。大きなファイルはチャンク変換で10〜15分かかることがあります。しばらく待って再試行するか、履歴から結果を開いてください。',
      )
    }
    return err
  }
  return new Error('リクエストに失敗しました')
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...saasAuthHeaders(),
        ...init?.headers,
      },
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(formatApiError(body, res.status))
    }
    return res.json() as Promise<T>
  } catch (err) {
    throw wrapFetchError(err)
  }
}

export function getHealth() {
  return fetchJson<HealthResponse>('/health')
}

export function getTenantMe() {
  return fetchJson<TenantMeResponse>('/saas/me')
}

export function getDirections() {
  return fetchJson<{ directions: DirectionInfo[] }>('/directions').then((r) => r.directions)
}

function jobToConvertResponse(job: JobDetail): ConvertResponse {
  const code = job.result_code?.trim() ?? ''
  if (!code) {
    throw new Error('変換は完了しましたが結果コードが空です。履歴を更新して再確認してください。')
  }
  return {
    job_id: job.id,
    direction: job.direction as DirectionId,
    source_language: job.source_language as ConvertResponse['source_language'],
    target_language: job.target_language as ConvertResponse['target_language'],
    result_code: code,
    model: job.model ?? 'unknown',
    mock: job.mock ?? false,
    warnings: job.warnings ?? [],
    notes: job.notes ?? null,
    usage: null,
    request_id: job.openai_request_id ?? null,
  }
}

/** Background job + polling so large files are not cut off by proxy timeouts. */
export async function convertCode(
  direction: string,
  sourceCode: string,
  onProgress?: (message: string | null) => void,
): Promise<ConvertResponse> {
  onProgress?.('バックエンド接続を確認しています…')
  let health: HealthResponse | null = null
  for (let h = 0; h < 5; h++) {
    health = await getHealth().catch(() => null)
    if (health?.ok) break
    await sleep(1000)
  }
  if (!health?.ok) {
    throw new Error(
      'バックエンド API に接続できません。数十秒待ってから再試行するか、Railway のデプロイログを確認してください。',
    )
  }

  onProgress?.('ジョブを開始しています…')

  const started = await fetchJson<{ job_id: string; status: string }>('/convert/async', {
    method: 'POST',
    body: JSON.stringify({ direction, source_code: sourceCode, save_history: true }),
    signal: AbortSignal.timeout(START_TIMEOUT_MS),
  })

  const jobId = started.job_id
  const deadline = Date.now() + POLL_MAX_MS
  let polls = 0
  let emptyCompletedRetries = 0

  while (Date.now() < deadline) {
    await sleep(polls === 0 ? 800 : POLL_INTERVAL_MS)
    polls++

    const job = await fetchJson<JobDetail>(`/jobs/${jobId}`, {
      signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
    })

    if (job.status === 'running') {
      onProgress?.(job.progress ?? `変換中… (${polls} 回目の確認)`)
      continue
    }

    if (job.status === 'completed') {
      const code = job.result_code?.trim()
      if (!code && emptyCompletedRetries < 8) {
        emptyCompletedRetries++
        onProgress?.('結果を書き込み中…')
        continue
      }
      onProgress?.(null)
      return jobToConvertResponse(job)
    }

    if (job.status === 'failed') {
      onProgress?.(null)
      throw new Error(job.error_message || '変換に失敗しました')
    }

    onProgress?.(`ステータス: ${job.status}`)
  }

  onProgress?.(null)
  throw new Error(
    '変換がタイムアウトしました。Timeline の履歴から completed ジョブの結果を開けるか、しばらく待って再試行してください。',
  )
}

export function listJobs(limit = 20) {
  return fetchJson<JobSummary[]>(`/jobs?limit=${limit}`)
}

export function getJob(id: string) {
  return fetchJson<JobDetail>(`/jobs/${id}`, { signal: AbortSignal.timeout(POLL_TIMEOUT_MS) })
}
