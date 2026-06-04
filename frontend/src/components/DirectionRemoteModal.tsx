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
        className="w-full text-left rounded-2xl p-5 border-2 border-indigo-500/40 bg-slate-900 hover:bg-slate-800/95 hover:border-indigo-400/60 transition-all group shadow-inner shadow-black/20"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/50">
              <Radio className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-400 mb-1.5">{ui.remoteTapToOpen}</div>
              {current && (
                <DirectionLabel source={current.source} target={current.target} size="lg" />
              )}
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-bold text-white shrink-0 px-3 py-2 rounded-xl bg-indigo-600 group-hover:bg-indigo-500">
            {ui.remoteOpen}
            <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[180] flex items-center justify-center p-4 sm:p-6 bg-slate-950/85"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={ui.remoteTitle}
            className="remote-shell remote-panel w-full max-w-xl rounded-3xl border-2 border-slate-600 p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                </div>
                <h2 className="text-lg font-bold text-white m-0 tracking-tight">{ui.remoteTitle}</h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2.5 rounded-xl text-slate-300 bg-slate-800 border border-slate-600 hover:text-white hover:bg-slate-700 transition-colors"
                aria-label={ui.remoteClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300 text-center mb-6 m-0 leading-relaxed px-2">{ui.remoteHint}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((d) => {
                const active = d.id === selected
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => pick(d.id)}
                    className={`remote-key relative text-left rounded-2xl px-4 py-4 min-h-[4.5rem] border-2 transition-all duration-200 ${
                      active
                        ? 'border-indigo-400 bg-indigo-600/30 shadow-lg shadow-indigo-900/40'
                        : 'border-slate-600 bg-slate-800 hover:bg-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-indigo-400" />
                    )}
                    <DirectionLabel
                      source={d.source}
                      target={d.target}
                      size="md"
                      bright={active}
                    />
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
  const text = size === 'lg' ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'
  const arrow = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
  const muted = bright ? 'text-white' : 'text-slate-100'

  return (
    <div className={`flex items-center gap-2 flex-wrap font-bold ${text} ${muted}`}>
      <span style={{ color: src.color }}>{src.label}</span>
      <ArrowRight className={`${arrow} text-indigo-300 shrink-0`} aria-hidden />
      <span style={{ color: tgt.color }}>{tgt.label}</span>
    </div>
  )
}
