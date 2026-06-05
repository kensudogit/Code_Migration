'use client'

import { ArrowRightLeft, AlertTriangle } from 'lucide-react'
import { AppLogo } from '@/components/AppLogo'
import { useCallback, useEffect, useState } from 'react'
import { convertCode, getDirections, getHealth, listJobs } from '@/lib/api'
import type { ConvertResponse, DirectionId, DirectionInfo, HealthResponse, JobSummary } from '@/lib/types'
import { SAMPLE_CODE } from '@/lib/types'
import { ui } from '@/lib/ui'
import { loadRemotePanelState } from '@/lib/remotePanel'
import { DirectionRemoteModal } from '@/components/DirectionRemoteModal'
import { EditorWorkspace } from '@/components/EditorWorkspace'
import { HistoryPanel } from '@/components/HistoryPanel'
import { SaaSPanel } from '@/components/SaaSPanel'
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
  const [progress, setProgress] = useState<string | null>(null)
  const [autoDirectionNote, setAutoDirectionNote] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [directionRemoteOpen, setDirectionRemoteOpen] = useState(true)

  const refreshMeta = useCallback(async () => {
    const [h, dirs, j] = await Promise.all([getHealth(), getDirections(), listJobs(12)])
    setHealth(h)
    setDirections(dirs)
    setJobs(j)
  }, [])

  useEffect(() => {
    refreshMeta().catch(() => setHealth({ ok: false, postgres: false, ai_enabled: false }))
  }, [refreshMeta])

  useEffect(() => {
    setDirectionRemoteOpen(!loadRemotePanelState().minimized)
  }, [])

  const onDirectionChange = (id: DirectionId) => {
    setDirection(id)
    setSource(SAMPLE_CODE[id] ?? '')
    setResult('')
    setError(null)
    setMeta(null)
  }

  const looksLikePython =
    (direction === 'java_to_python' || direction === 'go_to_python') &&
    /^\s*(#|"""|'''|from |import |def |async def |class )/m.test(source.slice(0, 800))

  const looksLikeGo =
    (direction === 'python_to_go' || direction === 'java_to_go') &&
    /^\s*(import "|func |type [A-Za-z_][\w]* struct|go func)/m.test(source.slice(0, 800)) &&
    !/^\s*package [\w.]+;/m.test(source.slice(0, 800))

  const looksLikeJava =
    direction === 'go_to_java' &&
    /^\s*(package [\w.]+;|import java\.|public (class|interface|record|enum)|@Override|@Service)/m.test(
      source.slice(0, 800),
    )

  const resolveEffectiveDirection = (): { id: DirectionId; note: string | null } => {
    if (looksLikePython && direction === 'java_to_python') {
      return { id: 'python_to_java', note: ui.autoDirectionNote }
    }
    if (looksLikePython && direction === 'go_to_python') {
      return { id: 'python_to_go', note: ui.autoDirectionPythonToGo }
    }
    if (looksLikeGo && direction === 'python_to_go') {
      return { id: 'go_to_python', note: ui.autoDirectionGoToPython }
    }
    if (looksLikeGo && direction === 'java_to_go') {
      return { id: 'go_to_java', note: ui.autoDirectionGoToJava }
    }
    if (looksLikeJava && direction === 'go_to_java') {
      return { id: 'java_to_go', note: ui.autoDirectionJavaToGo }
    }
    return { id: direction, note: null }
  }

  const onConvert = async () => {
    if (!source.trim()) {
      setError(ui.emptySource)
      return
    }
    setLoading(true)
    setError(null)
    setProgress(null)
    setAutoDirectionNote(null)
    const { id: effectiveDirection, note } = resolveEffectiveDirection()
    if (note) {
      setAutoDirectionNote(note)
    }
    try {
      const res = await convertCode(effectiveDirection, source, setProgress)
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
      setProgress(null)
    }
  }

  const onApplyHistoryResult = (code: string) => {
    setResult(code)
    setError(null)
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
              <AppLogo />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight m-0 text-gradient">
                  Code Migration
                </h1>
                <p className="text-sm text-slate-500 m-0 mt-0.5">{ui.appSubtitle}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!directionRemoteOpen && (
                <button
                  type="button"
                  onClick={() => setDirectionRemoteOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/35 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-200 hover:bg-violet-500/25 transition-colors"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  {ui.remoteOpen}
                </button>
              )}
              <SaaSPanel />
              <StatusPills health={health} mockMode={mockMode && !!result} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1680px] w-full mx-auto px-4 sm:px-8 py-3 sm:py-4">
        <div
          className={`grid grid-cols-1 gap-4 lg:gap-6 ${
            historyOpen ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : 'xl:grid-cols-1'
          }`}
        >
          <div className="space-y-3 sm:space-y-4">
            <section className="fade-up fade-up-delay-1">
              <EditorWorkspace
                sourceLang={srcLang}
                targetLang={tgtLang}
                source={source}
                result={result}
                onSourceChange={setSource}
                resultPlaceholder={ui.resultPlaceholder}
              />
            </section>

            {looksLikePython && !loading && !autoDirectionNote && (
              <p className="text-xs text-amber-300/90 m-0 px-1">{ui.directionHintPython}</p>
            )}

            {looksLikeGo && !loading && !autoDirectionNote && (
              <p className="text-xs text-amber-300/90 m-0 px-1">{ui.directionHintGo}</p>
            )}

            {looksLikeJava && !loading && !autoDirectionNote && (
              <p className="text-xs text-amber-300/90 m-0 px-1">{ui.directionHintJava}</p>
            )}

            {autoDirectionNote && !loading && (
              <p className="text-xs text-cyan-300/90 m-0 px-1">{autoDirectionNote}</p>
            )}

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3.5 text-sm text-red-200/90 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {meta && (meta.warnings.length > 0 || meta.notes || meta.usage) && (
              <section className="surface rounded-2xl p-4 space-y-3 text-sm">
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
                {meta.usage && (
                  <div className="text-xs font-mono text-slate-500 pt-1 border-t border-white/5">
                    <span className="px-2 py-1 rounded-md bg-white/[0.03]">
                      {ui.tokenUsage}: {meta.usage.prompt_tokens ?? 0} / {meta.usage.completion_tokens ?? 0}
                      {meta.usage.total_tokens != null ? ` (${meta.usage.total_tokens})` : ''}
                    </span>
                  </div>
                )}
              </section>
            )}
          </div>

          <aside
            className={`fade-up fade-up-delay-2 xl:sticky xl:top-[5.5rem] xl:self-start ${
              historyOpen ? '' : 'xl:flex xl:justify-end'
            }`}
          >
            <HistoryPanel
              jobs={jobs}
              onRefresh={refreshMeta}
              onApplyResult={onApplyHistoryResult}
              onOpenChange={setHistoryOpen}
            />
          </aside>
        </div>
      </main>

      <DirectionRemoteModal
        directions={directions}
        selected={direction}
        onSelect={onDirectionChange}
        open={directionRemoteOpen}
        onOpenChange={setDirectionRemoteOpen}
        loading={loading}
        canCopy={!!result}
        copied={copied}
        mockMode={mockMode && !!result}
        progress={progress}
        sourceLarge={source.length > 50_000}
        onConvert={onConvert}
        onCopy={onCopy}
      />
      <FloatingGuidePanel />
    </div>
  )
}
