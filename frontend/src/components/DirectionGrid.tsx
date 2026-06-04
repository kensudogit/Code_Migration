'use client'

import type { DirectionId, DirectionInfo } from '@/lib/types'
import { LANG_META } from '@/lib/types'

type Props = {
  directions: DirectionInfo[]
  selected: DirectionId
  onSelect: (id: DirectionId) => void
}

export function DirectionGrid({ directions, selected, onSelect }: Props) {
  if (directions.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {directions.map((d) => {
        const active = d.id === selected
        const src = LANG_META[d.source]
        const tgt = LANG_META[d.target]
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            className={`text-left rounded-xl p-4 border transition-all duration-200 ${
              active
                ? 'border-indigo-500/60 bg-indigo-500/10 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <LangChip meta={src} />
              <span className="text-slate-500 text-xs">?</span>
              <LangChip meta={tgt} />
            </div>
            <div className={`text-sm font-medium ${active ? 'text-white' : 'text-slate-300'}`}>
              {d.label}
            </div>
          </button>
        )
      })}
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
