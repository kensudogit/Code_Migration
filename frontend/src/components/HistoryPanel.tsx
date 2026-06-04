'use client'

import { ChevronLeft, ChevronRight, Clock, History, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getJob } from '@/lib/api'
import { loadHistoryPanelOpen, saveHistoryPanelOpen } from '@/lib/historyPanel'
import type { JobSummary } from '@/lib/types'
import { LANG_META } from '@/lib/types'
import { ui } from '@/lib/ui'

type Props = {
  jobs: JobSummary[]
  onRefresh: () => Promise<void>
  onApplyResult?: (code: string) => void
  onOpenChange?: (open: boolean) => void
}

export function HistoryPanel({ jobs, onRefresh, onApplyResult, onOpenChange }: Props) {
  const [panelOpen, setPanelOpen] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [expandedStatus, setExpandedStatus] = useState<string | null>(null)

  useEffect(() => {
    const open = loadHistoryPanelOpen()
    setPanelOpen(open)
    onOpenChange?.(open)
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

  const setOpen = (open: boolean) => {
    setPanelOpen(open)
    saveHistoryPanelOpen(open)
    onOpenChange?.(open)
    if (!open) {
      setExpanded(null)
      setDetail(null)
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  const loadDetail = async (id: string) => {
    if (expanded === id) {
      setExpanded(null)
      setDetail(null)
      return
    }
    setExpanded(id)
    const job = await getJob(id)
    setExpandedStatus(job.status)
    setDetail(job.result_code ?? job.error_message ?? '(empty)')
  }

  const applyToEditor = () => {
    if (!detail || !onApplyResult || expandedStatus !== 'completed') return
    onApplyResult(detail)
  }

  if (!hydrated) {
    return <div className="hidden xl:block w-[340px] shrink-0" aria-hidden />
  }

  if (!panelOpen) {
    return (
      <div className="flex justify-end xl:justify-start">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex items-center gap-2 rounded-xl border border-cyan-500/25 bg-[#0f111a]/95 px-2 py-3 xl:py-4 xl:px-2 xl:flex-col shadow-lg shadow-black/30 hover:border-cyan-400/40 transition-colors"
          aria-label={ui.historyExpand}
          title={ui.historyExpand}
        >
          <History className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-[10px] font-bold text-slate-300 xl:[writing-mode:vertical-rl] xl:tracking-wide">
            {ui.history}
          </span>
          {jobs.length > 0 && (
            <span className="text-[10px] font-bold rounded-full bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {jobs.length > 99 ? '99+' : jobs.length}
            </span>
          )}
          <ChevronLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 hidden xl:block" />
        </button>
      </div>
    )
  }

  return (
    <div className="surface rounded-2xl overflow-hidden flex flex-col max-h-[calc(100vh-7rem)] w-full xl:w-[340px]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
            <History className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <p className="section-label m-0">Timeline</p>
            <h3 className="text-sm font-semibold text-slate-100 m-0 truncate">{ui.history}</h3>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={refresh}
            className="p-2 rounded-xl border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            aria-label={ui.refresh}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-2 rounded-xl border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
            aria-label={ui.historyCollapse}
            title={ui.historyCollapse}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <ul className="overflow-y-auto flex-1 p-3 space-y-1.5 min-h-[8rem]">
        {jobs.length === 0 ? (
          <li className="text-sm text-slate-500 text-center py-12 px-6 leading-relaxed">{ui.historyEmpty}</li>
        ) : (
          jobs.map((j) => {
            const src = LANG_META[j.source_language as keyof typeof LANG_META]
            const open = expanded === j.id
            return (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => loadDetail(j.id)}
                  className={`w-full text-left rounded-xl p-3.5 border transition-all duration-200 ${
                    open
                      ? 'border-violet-500/30 bg-violet-500/10 shadow-sm'
                      : 'border-transparent hover:bg-white/[0.03] hover:border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {src?.label ?? j.source_language}
                      <span className="text-slate-500 font-normal mx-1">→</span>
                      {j.target_language}
                    </span>
                    <StatusBadge status={j.status} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3 shrink-0" />
                    {new Date(j.created_at).toLocaleString('ja-JP')}
                  </div>
                </button>
                {open && detail && (
                  <div className="mt-2 mx-1 mb-1 space-y-2">
                    {expandedStatus === 'completed' && onApplyResult && detail !== '(empty)' && (
                      <button
                        type="button"
                        onClick={applyToEditor}
                        className="w-full text-xs font-medium py-2 rounded-lg border border-violet-500/30 text-violet-200 hover:bg-violet-500/15 transition-colors"
                      >
                        {ui.applyResult}
                      </button>
                    )}
                    <pre className="p-3 rounded-xl bg-black/40 border border-white/[0.04] text-[11px] text-slate-400 overflow-auto max-h-64 code-editor whitespace-pre-wrap leading-relaxed">
                      {detail}
                    </pre>
                  </div>
                )}
              </li>
            )
          })
        )}
      </ul>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    failed: 'bg-red-500/15 text-red-400 border-red-500/25',
    running: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  }
  return (
    <span
      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border shrink-0 ${colors[status] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}
    >
      {status}
    </span>
  )
}
