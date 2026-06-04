'use client'

import { ArrowRight, ChevronRight, Radio, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { formatDirectionLabel } from '@/lib/directionFormat'
import type { DirectionId, DirectionInfo, Language } from '@/lib/types'
import { LANG_META } from '@/lib/types'
import { ui } from '@/lib/ui'

const FALLBACK_DIRECTIONS: DirectionInfo[] = (
  [
    { id: 'java_to_python' as const, source: 'java' as const, target: 'python' as const },
    { id: 'python_to_java' as const, source: 'python' as const, target: 'java' as const },
    { id: 'java_to_typescript' as const, source: 'java' as const, target: 'typescript' as const },
    { id: 'typescript_to_java' as const, source: 'typescript' as const, target: 'java' as const },
    { id: 'cobol_to_java' as const, source: 'cobol' as const, target: 'java' as const },
    { id: 'java_to_cobol' as const, source: 'java' as const, target: 'cobol' as const },
  ] as const
).map((d) => ({
  id: d.id,
  source: d.source,
  target: d.target,
  label: formatDirectionLabel(d.source, d.target),
}))

type Props = {
  directions: DirectionInfo[]
  selected: DirectionId
  onSelect: (id: DirectionId) => void
}

export function DirectionRemoteModal({ directions, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const items = directions.length > 0 ? directions : FALLBACK_DIRECTIONS
  const current = items.find((d) => d.id === selected) ?? items[0]

  const pick = useCallback(
    (id: DirectionId) => {
      onSelect(id)
      setOpen(false)
    },
    [onSelect],
  )

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="remote-trigger w-full text-left rounded-2xl p-5 sm:p-6 group"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40 group-hover:shadow-violet-800/50 transition-shadow">
              <Radio className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="section-label m-0 mb-2">{ui.remoteTapToOpen}</p>
              {current && <DirectionLabel source={current.source} target={current.target} size="lg" />}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-white shrink-0 px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 group-hover:bg-white/15 group-hover:border-white/15 transition-colors">
            {ui.remoteOpen}
            <ChevronRight className="w-4 h-4 opacity-80" />
          </span>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center p-4 sm:p-8 bg-black/70 backdrop-blur-md"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={ui.remoteTitle}
            className="remote-shell remote-panel w-full max-w-2xl rounded-3xl border p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-3" aria-hidden>
                  <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                  <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                  <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                </div>
                <h2 className="text-xl font-bold text-white m-0 tracking-tight">{ui.remoteTitle}</h2>
                <p className="text-sm text-slate-400 m-0 mt-2 leading-relaxed max-w-md">{ui.remoteHint}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2.5 rounded-xl text-slate-400 border border-white/[0.08] bg-white/[0.03] hover:text-white hover:bg-white/[0.06] transition-colors shrink-0"
                aria-label={ui.remoteClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((d) => {
                const active = d.id === selected
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => pick(d.id)}
                    className={`remote-key relative text-left rounded-2xl px-5 py-4 min-h-[5rem] border transition-all duration-200 ${
                      active
                        ? 'border-violet-400/50 bg-violet-500/15 shadow-[0_0_24px_rgba(139,92,246,0.15)]'
                        : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12]'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-4 bottom-4 w-0.5 rounded-r-full bg-gradient-to-b from-violet-400 to-cyan-400" />
                    )}
                    <DirectionLabel source={d.source} target={d.target} size="md" bright={active} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DirectionLabel({
  source,
  target,
  size,
  bright = false,
}: {
  source: Language
  target: Language
  size: 'md' | 'lg'
  bright?: boolean
}) {
  const src = LANG_META[source]
  const tgt = LANG_META[target]
  const text = size === 'lg' ? 'text-xl sm:text-2xl' : 'text-lg'
  const arrow = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'

  return (
    <div className={`flex items-center gap-2.5 flex-wrap font-bold ${text}`}>
      <span style={{ color: src.color }} className={bright ? '' : 'opacity-95'}>
        {src.label}
      </span>
      <ArrowRight className={`${arrow} text-slate-500 shrink-0`} aria-hidden />
      <span style={{ color: tgt.color }} className={bright ? '' : 'opacity-95'}>
        {tgt.label}
      </span>
    </div>
  )
}
