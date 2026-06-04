'use client'

import { ArrowRightLeft, FileCode, X } from 'lucide-react'
import { useState } from 'react'
import { displayDirectionLabel, formatDirectionLabel } from '@/lib/directionFormat'
import type { DirectionId, DirectionInfo } from '@/lib/types'
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

/** Scenario-style direction remote (purple header, 2-column cards). */
export function DirectionRemoteModal({ directions, selected, onSelect }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const items = directions.length > 0 ? directions : FALLBACK_DIRECTIONS

  if (collapsed) {
    const current = items.find((d) => d.id === selected) ?? items[0]
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="direction-remote-panel direction-remote-collapsed w-full max-w-md flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#1a1b26] px-3 py-2.5 text-left hover:border-violet-500/30 transition-colors"
        aria-expanded={false}
        title={ui.remoteTapToOpen}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-600/90">
          <ArrowRightLeft className="h-4 w-4 text-white" strokeWidth={2.25} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">
          {current ? displayDirectionLabel(current) : ui.remoteOpen}
        </span>
        <span className="text-xs text-violet-300">{ui.remoteOpen}</span>
      </button>
    )
  }

  return (
    <div
      className="direction-remote-panel w-full max-w-md overflow-hidden rounded-xl border border-white/[0.08] shadow-lg shadow-black/30"
      role="group"
      aria-label={ui.remoteTitle}
    >
      <div className="flex items-center justify-between gap-3 bg-violet-600 px-3.5 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20"
            aria-hidden
          >
            <ArrowRightLeft className="h-4 w-4 text-white" strokeWidth={2.25} />
          </span>
          <span className="truncate text-sm font-bold text-white sm:text-[15px]">{ui.remoteOpen}</span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/90 hover:bg-white/15 transition-colors"
          aria-label={ui.remoteClose}
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      <div className="direction-remote-body bg-[#1a1b26] px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div className="mb-1 flex items-center gap-2">
          <span className="h-4 w-1 shrink-0 rounded-full bg-violet-500" aria-hidden />
          <h3 className="m-0 text-sm font-bold text-slate-100">{ui.selectDirection}</h3>
        </div>
        <p className="m-0 mb-3 text-[11px] leading-relaxed text-slate-400 sm:text-xs">{ui.remoteHint}</p>

        <div className="direction-remote-grid grid grid-cols-2 gap-2 sm:gap-2.5">
          {items.map((d) => {
            const active = d.id === selected
            const accent = LANG_META[d.source].color
            const label = displayDirectionLabel(d)
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d.id)}
                className={`direction-remote-card relative flex flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-all ${
                  active
                    ? 'border-violet-400/55 bg-violet-500/10 shadow-[0_0_0_1px_rgba(139,92,246,0.25)]'
                    : 'border-slate-600/40 bg-[#252836] hover:border-slate-500/60 hover:bg-[#2a2d3d]'
                }`}
                aria-pressed={active}
              >
                <span
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r-sm"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                <FileCode
                  className={`h-5 w-5 shrink-0 ${active ? 'text-violet-300' : 'text-slate-500'}`}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span
                  className={`px-1 text-[11px] font-bold leading-snug sm:text-xs ${
                    active ? 'text-white' : 'text-slate-200'
                  }`}
                >
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
