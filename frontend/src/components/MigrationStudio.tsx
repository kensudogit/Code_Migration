'use client'

import { ArrowRightLeft, Bot, Check, Copy, Database, Loader2, Sparkles, Zap, AlertTriangle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { convertCode, getDirections, getHealth, listJobs } from '@/lib/api'
import type { ConvertResponse, DirectionId, DirectionInfo, HealthResponse, JobSummary } from '@/lib/types'
import { SAMPLE_CODE } from '@/lib/types'
import { ui } from '@/lib/ui'
import { DirectionRemoteModal } from '@/components/DirectionRemoteModal'
import { CodePanel } from '@/components/CodePanel'
import { HistoryPanel } from '@/components/HistoryPanel'
import { StatusPills } from '@/components/StatusPills'
import { FloatingGuidePanel } from '@/components/FloatingGuidePanel'

export function MigrationStudio() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [directions, setDirections] = useState<DirectionInfo[]>([])
  const [direction, setDirection] = useState<DirectionId>('java_to_python')
  const [source, setSource] = useState(SAMPLE_CODE.java_to_python ?? '')
  const [result, setResult] = useState('')
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [mockMode, setMockMode] = useState(false)
  const [meta, setMeta] = useState<Pick<ConvertResponse, 'warnings' | 'notes' | 'usage' | 'request_id'> | null>(null)

  const refreshMeta = useCallback(async () => {
    const [h, dirs, j] = await Promise.all([getHealth(), getDirections(), listJobs(12)])
    setHealth(h)
    setDirections(dirs)
    setJobs(j)
  }, [])

  useEffect(() => {
    refreshMeta().catch(() => setHealth({ ok: false, postgres: false, ai_enabled: false }))
  }, [refreshMeta])

  const onDirectionChange = (id: DirectionId) => {
    setDirection(id)
    setSource(SAMPLE_CODE[id] ?? '')
    setResult('')
    setError(null)
    setMeta(null)
  }

  const onConvert = async () => {
    if (!source.trim()) {
      setError(ui.emptySource)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await convertCode(direction, source)
      setResult(res.result_code)
      setMockMode(res.mock)
      setMeta({
        warnings: res.warnings,
        notes: res.notes,
        usage: res.usage,
        request_id: res.request_id,
      })
      await refreshMeta()
    } catch (e) {
      setError(e instanceof Error ? e.message : ui.convertFailed)
    } finally {
      setLoading(false)
    }
  }

  const onCopy = async () => {
    if (!result) return
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const current = directions.find((d) => d.id === direction)
  const srcLang = current?.source ?? 'java'
  const tgtLang = current?.target ?? 'python'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <ArrowRightLeft className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white m-0">Code Migration</h1>
              <p className="text-xs text-slate-400 m-0">{ui.appSubtitle}</p>
            </div>
          </div>
          <StatusPills health={health} mockMode={mockMode && !!result} />
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6 fade-up">
          <section className="glass rounded-2xl p-5 relative">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-slate-200 m-0">{ui.selectDirection}</h2>
            </div>
            <DirectionRemoteModal
              directions={directions}
              selected={direction}
              onSelect={onDirectionChange}
            />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[420px]">
            <CodePanel title={ui.source} lang={srcLang} value={source} onChange={setSource} lineNumbers />
            <CodePanel
              title={ui.result}
              lang={tgtLang}
              value={result}
              readOnly
              placeholder={ui.resultPlaceholder}
              lineNumbers
              accent
            />
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onConvert}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 disabled:opacity-60 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {loading ? ui.converting : ui.convert}
            </button>
            <button
              type="button"
              onClick={onCopy}
              disabled={!result}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-slate-300 glass hover:bg-white/5 disabled:opacity-40 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? ui.copied : ui.copy}
            </button>
            {mockMode && result && (
              <span className="text-xs text-amber-400/90 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                {ui.mockHint}
              </span>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {meta && (meta.warnings.length > 0 || meta.notes || meta.usage || meta.request_id) && (
            <section className="glass rounded-2xl p-4 space-y-3 text-sm">
              {meta.warnings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-medium mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    {ui.warnings}
                  </div>
                  <ul className="list-disc list-inside text-slate-400 space-y-1 m-0">
                    {meta.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {meta.notes && (
                <p className="text-slate-400 m-0 whitespace-pre-wrap">{meta.notes}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                {meta.usage && (
                  <span>
                    {ui.tokenUsage}: {meta.usage.prompt_tokens ?? 0} / {meta.usage.completion_tokens ?? 0}
                    {meta.usage.total_tokens != null ? ` (${meta.usage.total_tokens} total)` : ''}
                  </span>
                )}
                {meta.request_id && (
                  <span>
                    {ui.requestId}: {meta.request_id}
                  </span>
                )}
              </div>
            </section>
          )}

          <section className="glass rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FeatureCard icon={<Bot className="w-5 h-5" />} title={ui.featureAi} desc={ui.featureAiDesc} />
            <FeatureCard icon={<Database className="w-5 h-5" />} title={ui.featureDb} desc={ui.featureDbDesc} />
            <FeatureCard
              icon={<ArrowRightLeft className="w-5 h-5" />}
              title={ui.featureDirs}
              desc={ui.featureDirsDesc}
            />
          </section>
        </div>

        <aside className="fade-up xl:sticky xl:top-24 xl:self-start">
          <HistoryPanel jobs={jobs} onRefresh={refreshMeta} />
        </aside>
      </main>

      <footer className="border-t border-white/5 py-4 text-center text-xs text-slate-500">{ui.footer}</footer>

      <FloatingGuidePanel />
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="text-indigo-400 mb-2">{icon}</div>
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{desc}</div>
    </div>
  )
}
