'use client'

import { Clock, History, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { getJob } from '@/lib/api'
import type { JobSummary } from '@/lib/types'
import { LANG_META } from '@/lib/types'
import { ui } from '@/lib/ui'

type Props = {
  jobs: JobSummary[]
  onRefresh: () => Promise<void>
}

export function HistoryPanel({ jobs, onRefresh }: Props) {
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<string | null>(null)

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
    setDetail(job.result_code ?? job.error_message ?? '(empty)')
  }

  return (
    <div className="surface rounded-2xl overflow-hidden flex flex-col max-h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <History className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <p className="section-label m-0">Timeline</p>
            <h3 className="text-sm font-semibold text-slate-100 m-0">{ui.history}</h3>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="p-2 rounded-xl border border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors"
          aria-label={ui.refresh}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <ul className="overflow-y-auto flex-1 p-3 space-y-1.5">
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
                  <pre className="mt-2 mx-1 mb-1 p-3 rounded-xl bg-black/40 border border-white/[0.04] text-[11px] text-slate-400 overflow-x-auto max-h-44 code-editor whitespace-pre-wrap leading-relaxed">
                    {detail.slice(0, 800)}
                    {detail.length > 800 ? '...' : ''}
                  </pre>
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
