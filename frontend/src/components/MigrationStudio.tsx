'use client'

import {
  ArrowRightLeft,
  Bot,
  Check,
  Copy,
  Database,
  Loader2,
  Sparkles,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { convertCode, getDirections, getHealth, listJobs } from '@/lib/api'
import type { ConvertResponse, DirectionId, DirectionInfo, HealthResponse, JobSummary } from '@/lib/types'
import { SAMPLE_CODE } from '@/lib/types'
import { ui } from '@/lib/ui'
import { DirectionRemoteModal } from '@/components/DirectionRemoteModal'
import { EditorWorkspace } from '@/components/EditorWorkspace'
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
  const [meta, setMeta] = useState<Pick<ConvertResponse, 'warnings' | 'notes' | 'usage' | 'request_id'> | null>(
    null,
  )

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
    <div className="app-shell min-h-screen flex flex-col">
      <header className="surface-glass sticky top-0 z-50 border-b border-white/[0.06]">
        <div className="max-w-[1680px] mx-auto px-4 sm:px-8 py-4 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-violet-500/30 blur-xl" aria-hidden />
                <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <ArrowRightLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2.25} />
                </div>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight m-0 text-gradient">
                  Code Migration
                </h1>
                <p className="text-sm text-slate-500 m-0 mt-0.5">{ui.appSubtitle}</p>
              </div>
            </div>
            <StatusPills health={health} mockMode={mockMode && !!result} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8">
          <div className="space-y-6 lg:space-y-8">
            <section className="surface rounded-2xl p-5 sm:p-6 fade-up">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="section-label m-0">Step 1</p>
                  <h2 className="text-base font-semibold text-slate-100 m-0 mt-0.5">{ui.selectDirection}</h2>
                </div>
              </div>
              <DirectionRemoteModal
                directions={directions}
                selected={direction}
                onSelect={onDirectionChange}
              />
            </section>

            <section className="fade-up fade-up-delay-1">
              <div className="flex items-center gap-2 mb-4 px-1">
                <p className="section-label m-0">Step 2</p>
                <span className="text-slate-600">·</span>
                <span className="text-sm text-slate-500">Edit & convert</span>
              </div>
              <EditorWorkspace
                sourceLang={srcLang}
                targetLang={tgtLang}
                source={source}
                result={result}
                onSourceChange={setSource}
                resultPlaceholder={ui.resultPlaceholder}
              />
            </section>

            <div className="flex flex-wrap items-center gap-3 fade-up fade-up-delay-2">
              <button type="button" onClick={onConvert} disabled={loading} className="btn-primary">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {loading
                  ? source.length > 50_000
                    ? ui.convertingLarge
                    : ui.converting
                  : ui.convert}
              </button>
              <button type="button" onClick={onCopy} disabled={!result} className="btn-secondary">
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? ui.copied : ui.copy}
              </button>
              {mockMode && result && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300/90 px-3 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
                  <Bot className="w-3.5 h-3.5" />
                  {ui.mockHint}
                </span>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3.5 text-sm text-red-200/90 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {meta && (meta.warnings.length > 0 || meta.notes || meta.usage || meta.request_id) && (
              <section className="surface rounded-2xl p-5 space-y-4 text-sm">
                {meta.warnings.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-amber-300 font-medium mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      {ui.warnings}
                    </div>
                    <ul className="list-none space-y-1.5 text-slate-400 m-0 pl-0">
                      {meta.warnings.map((w) => (
                        <li key={w} className="flex gap-2">
                          <span className="text-amber-500/80">·</span>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {meta.notes && (
                  <p className="text-slate-400 m-0 whitespace-pre-wrap leading-relaxed">{meta.notes}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs font-mono text-slate-500 pt-1 border-t border-white/5">
                  {meta.usage && (
                    <span className="px-2 py-1 rounded-md bg-white/[0.03]">
                      {ui.tokenUsage}: {meta.usage.prompt_tokens ?? 0} / {meta.usage.completion_tokens ?? 0}
                      {meta.usage.total_tokens != null ? ` (${meta.usage.total_tokens})` : ''}
                    </span>
                  )}
                  {meta.request_id && (
                    <span className="px-2 py-1 rounded-md bg-white/[0.03] truncate max-w-full">
                      {ui.requestId}: {meta.request_id}
                    </span>
                  )}
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <FeatureCard icon={<Bot className="w-5 h-5" />} title={ui.featureAi} desc={ui.featureAiDesc} />
              <FeatureCard icon={<Database className="w-5 h-5" />} title={ui.featureDb} desc={ui.featureDbDesc} />
              <FeatureCard
                icon={<ArrowRightLeft className="w-5 h-5" />}
                title={ui.featureDirs}
                desc={ui.featureDirsDesc}
              />
            </section>
          </div>

          <aside className="fade-up fade-up-delay-2 xl:sticky xl:top-[5.5rem] xl:self-start">
            <HistoryPanel jobs={jobs} onRefresh={refreshMeta} />
          </aside>
        </div>
      </main>

      <footer className="border-t border-white/[0.04] py-6 text-center">
        <p className="text-xs text-slate-600 m-0 tracking-wide">{ui.footer}</p>
      </footer>

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
    <div className="group rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4 sm:p-5 transition-colors hover:bg-white/[0.04] hover:border-white/[0.08]">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/10 flex items-center justify-center text-violet-300 mb-3 group-hover:text-violet-200 transition-colors">
        {icon}
      </div>
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      <div className="text-xs text-slate-500 mt-1.5 leading-relaxed">{desc}</div>
    </div>
  )
}
