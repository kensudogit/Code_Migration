'use client'

import { ArrowRight, Radio } from 'lucide-react'
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

/** Compact inline direction picker (no fullscreen overlay). */
export function DirectionRemoteModal({ directions, selected, onSelect }: Props) {
  const items = directions.length > 0 ? directions : FALLBACK_DIRECTIONS
  const current = items.find((d) => d.id === selected) ?? items[0]

  return (
    <div className="direction-remote-compact rounded-xl border border-white/[0.08] bg-black/20 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <div className="flex items-center gap-2 text-violet-300">
          <Radio className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {ui.remoteTitle}
          </span>
        </div>
        {current && (
          <div className="min-w-0">
            <DirectionLabel source={current.source} target={current.target} size="sm" bright />
          </div>
        )}
      </div>
      <p className="text-[11px] text-slate-500 m-0 mb-2.5 leading-relaxed">{ui.remoteHint}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((d) => {
          const active = d.id === selected
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id)}
              className={`remote-key-compact text-left rounded-lg px-2.5 py-2 border transition-colors ${
                active
                  ? 'border-violet-400/45 bg-violet-500/15 text-white'
                  : 'border-white/[0.06] bg-white/[0.02] text-slate-300 hover:bg-white/[0.05] hover:border-white/10'
              }`}
            >
              <DirectionLabel source={d.source} target={d.target} size="xs" bright={active} />
            </button>
          )
        })}
      </div>
    </div>
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
  size: 'xs' | 'sm' | 'md' | 'lg'
  bright?: boolean
}) {
  const src = LANG_META[source]
  const tgt = LANG_META[target]
  const text =
    size === 'lg'
      ? 'text-xl sm:text-2xl'
      : size === 'md'
        ? 'text-base'
        : size === 'sm'
          ? 'text-sm'
          : 'text-xs'
  const arrow = size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'

  return (
    <div className={`flex items-center gap-1.5 flex-wrap font-semibold ${text}`}>
      <span style={{ color: src.color }} className={bright ? '' : 'opacity-90'}>
        {src.label}
      </span>
      <ArrowRight className={`${arrow} text-slate-500 shrink-0`} aria-hidden />
      <span style={{ color: tgt.color }} className={bright ? '' : 'opacity-90'}>
        {tgt.label}
      </span>
    </div>
  )
}
