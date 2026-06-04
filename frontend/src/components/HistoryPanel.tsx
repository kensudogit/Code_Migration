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
    <div className="glass rounded-2xl overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <History className="w-4 h-4 text-indigo-400" />
          {ui.history}
        </div>
        <button
          type="button"
          onClick={refresh}
          className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          aria-label={ui.refresh}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <ul className="overflow-y-auto flex-1 p-2 space-y-1">
        {jobs.length === 0 ? (
          <li className="text-xs text-slate-500 text-center py-8 px-4">{ui.historyEmpty}</li>
        ) : (
          jobs.map((j) => {
            const src = LANG_META[j.source_language as keyof typeof LANG_META]
            const open = expanded === j.id
            return (
              <li key={j.id}>
                <button
                  type="button"
                  onClick={() => loadDetail(j.id)}
                  className={`w-full text-left rounded-xl p-3 border transition-colors ${
                    open ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-transparent hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-300 truncate">
                      {src?.label ?? j.source_language} &rarr; {j.target_language}
                    </span>
                    <StatusBadge status={j.status} />
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(j.created_at).toLocaleString('ja-JP')}
                  </div>
                </button>
                {open && detail && (
                  <pre className="mt-1 mx-1 mb-2 p-2 rounded-lg bg-black/30 text-[10px] text-slate-400 overflow-x-auto max-h-40 code-editor whitespace-pre-wrap">
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
    completed: 'bg-emerald-500/20 text-emerald-400',
    failed: 'bg-red-500/20 text-red-400',
    running: 'bg-amber-500/20 text-amber-400',
  }
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${colors[status] ?? 'bg-slate-500/20 text-slate-400'}`}
    >
      {status}
    </span>
  )
}
