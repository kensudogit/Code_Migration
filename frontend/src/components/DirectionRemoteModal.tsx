'use client'

import { ArrowRight, Radio, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { displayDirectionLabel, formatDirectionLabel } from '@/lib/directionFormat'
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl p-4 border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-violet-600/5 hover:from-indigo-500/15 hover:border-indigo-500/50 transition-all group"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-indigo-500/40 transition-colors">
              <Radio className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{ui.remoteTapToOpen}</div>
              {current && (
                <DirectionPairRow source={current.source} target={current.target} size="md" />
              )}
            </div>
          </div>
          <span className="text-xs font-medium text-indigo-300 shrink-0 px-2 py-1 rounded-lg bg-indigo-500/15">
            {ui.remoteOpen}
          </span>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={ui.remoteTitle}
            className="remote-shell w-full max-w-md rounded-[2rem] border border-slate-600/80 bg-gradient-to-b from-slate-800 to-slate-950 shadow-2xl shadow-black/60 p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500/80" />
                <span className="w-2 h-2 rounded-full bg-amber-400/80" />
                <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-xs font-bold tracking-widest text-slate-400 uppercase">
                  {ui.remoteTitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={ui.remoteClose}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 text-center mb-4 m-0">{ui.remoteHint}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {items.map((d) => {
                const active = d.id === selected
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => pick(d.id)}
                    className={`remote-key text-left rounded-2xl px-3 py-3.5 border transition-all duration-200 ${
                      active
                        ? 'border-indigo-400/70 bg-indigo-500/20 shadow-lg shadow-indigo-500/20 ring-1 ring-indigo-400/40'
                        : 'border-slate-600/60 bg-slate-900/80 hover:bg-slate-800 hover:border-slate-500'
                    }`}
                  >
                    <DirectionPairRow source={d.source} target={d.target} size="sm" />
                    <div className={`text-[11px] mt-2 font-medium ${active ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {displayDirectionLabel(d)}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex justify-center">
              <div className="w-14 h-14 rounded-full border-4 border-slate-700 bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function DirectionPairRow({
  source,
  target,
  size,
}: {
  source: Language
  target: Language
  size: 'sm' | 'md'
}) {
  const src = LANG_META[source]
  const tgt = LANG_META[target]
  const text = size === 'md' ? 'text-sm' : 'text-xs'
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${text} font-semibold`}>
      <LangChip meta={src} />
      <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" aria-hidden />
      <LangChip meta={tgt} />
    </div>
  )
}

function LangChip({ meta }: { meta: (typeof LANG_META)[keyof typeof LANG_META] }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide"
      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
    >
      {meta.icon} {meta.label}
    </span>
  )
}
