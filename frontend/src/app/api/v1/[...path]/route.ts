import { NextRequest, NextResponse } from 'next/server'

/** Long-running AI conversion (Railway / large multi-chunk sources). */
export const maxDuration = 800
export const runtime = 'nodejs'

const API_BASE = (process.env.API_URL ?? 'http://127.0.0.1:8091').replace(/\/$/, '')

async function fetchBackend(target: string, init: RequestInit, attempts = 4): Promise<Response> {
  let lastError: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(target, {
        ...init,
        signal: AbortSignal.timeout(900_000),
        cache: 'no-store',
      })
    } catch (err) {
      lastError = err
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 400 * (i + 1)))
      }
    }
  }
  throw lastError
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const suffix = path.join('/')
  const target = `${API_BASE}/api/v1/${suffix}${req.nextUrl.search}`

  const headers = new Headers()
  const contentType = req.headers.get('content-type')
  if (contentType) headers.set('Content-Type', contentType)

  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers,
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (req.body) {
      init.body = req.body
      init.duplex = 'half'
    } else {
      init.body = await req.arrayBuffer()
    }
  }

  try {
    const res = await fetchBackend(target, init)
    const outHeaders = new Headers()
    const resType = res.headers.get('content-type')
    if (resType) outHeaders.set('Content-Type', resType)
    return new NextResponse(res.body, { status: res.status, headers: outHeaders })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'API proxy failed'
    return NextResponse.json(
      {
        detail:
          `Backend unreachable: ${message}. ` +
          'The API process may have restarted — wait a few seconds and retry. ' +
          'If this persists, check Railway deploy logs for FastAPI/OOM errors.',
      },
      { status: 502 },
    )
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
