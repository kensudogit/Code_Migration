'use client'

import { Building2, KeyRound, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { getHealth, getTenantMe } from '@/lib/api'
import { getStoredApiKey, setStoredApiKey } from '@/lib/saas'
import type { TenantMeResponse } from '@/lib/types'
import { ui } from '@/lib/ui'

export function SaaSPanel() {
  const [enabled, setEnabled] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [me, setMe] = useState<TenantMeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(async () => {
    setError(null)
    const health = await getHealth().catch(() => null)
    const saas = health?.saas_enabled ?? false
    setEnabled(saas)
    if (!saas) {
      setMe(null)
      return
    }
    try {
      const tenant = await getTenantMe()
      setMe(tenant)
    } catch (e) {
      setMe(null)
      setError(e instanceof Error ? e.message : ui.saasLoadFailed)
    }
  }, [])

  useEffect(() => {
    setKeyInput(getStoredApiKey())
    refresh()
  }, [refresh])

  const onSaveKey = () => {
    setStoredApiKey(keyInput)
    refresh()
  }

  if (!enabled) return null

  const usageText =
    me?.conversions_limit != null
      ? `${me.conversions_used} / ${me.conversions_limit}`
      : `${me?.conversions_used ?? 0} / ∞`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/15 transition-colors"
      >
        <Building2 className="w-3.5 h-3.5" />
        {me ? `${me.plan_label}` : ui.saasTitle}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-[210] w-72 rounded-xl border border-white/[0.08] bg-slate-900/98 p-3 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-slate-200">{ui.saasTitle}</span>
            <button
              type="button"
              onClick={() => refresh()}
              className="p-1 rounded text-slate-500 hover:text-white"
              aria-label={ui.refresh}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {me && (
            <div className="mb-3 text-xs text-slate-400 space-y-1">
              <p className="m-0">
                <span className="text-slate-500">{ui.saasTenant}:</span> {me.name}
              </p>
              <p className="m-0">
                <span className="text-slate-500">{ui.saasUsage}:</span> {usageText}{' '}
                <span className="text-slate-600">({me.period})</span>
              </p>
            </div>
          )}

          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            {ui.saasApiKey}
          </label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <KeyRound className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="cmk_…"
                className="w-full rounded-lg border border-white/[0.08] bg-black/30 pl-7 pr-2 py-1.5 text-xs text-slate-200"
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              onClick={onSaveKey}
              className="shrink-0 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-500"
            >
              {ui.saasSave}
            </button>
          </div>
          <p className="m-0 mt-2 text-[10px] text-slate-600 leading-snug">{ui.saasHint}</p>
          {error && <p className="m-0 mt-2 text-[10px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  )
}
