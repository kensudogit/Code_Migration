'use client'

import { ArrowRight, Radio } from 'lucide-react'
import { formatDirectionLabel } from '@/lib/directionFormat'
import type { DirectionId, DirectionInfo, Language } from '@/lib/types'
import { LANG_META } from '@/lib/types'
import { ui } from '@/lib/ui'

const SHORT_LANG: Record<Language, string> = {
  java: 'Java',
  python: 'Py',
  typescript: 'TS',
  cobol: 'CB',
}

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

/** Minimal inline direction remote (fits above editor without overlap). */
export function DirectionRemoteModal({ directions, selected, onSelect }: Props) {
  const items = directions.length > 0 ? directions : FALLBACK_DIRECTIONS
  const current = items.find((d) => d.id === selected) ?? items[0]

  return (
    <div
      className="direction-remote-compact rounded-lg border border-white/[0.06] bg-black/25 px-2 py-2 sm:px-2.5 sm:py-2"
      role="group"
      aria-label={ui.remoteTitle}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[1.25rem]">
        <div className="flex items-center gap-1.5 min-w-0 text-slate-500">
          <Radio className="w-3 h-3 shrink-0 text-violet-400" strokeWidth={2.5} aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 truncate">
            {ui.remoteTitle}
          </span>
        </div>
        {current && (
          <div className="shrink-0 scale-90 origin-right">
            <DirectionLabel source={current.source} target={current.target} size="2xs" bright />
          </div>
        )}
      </div>

      <div
        className="grid grid-cols-3 gap-1"
        title={ui.remoteHint}
      >
        {items.map((d) => {
          const active = d.id === selected
          const accent = LANG_META[d.source].color
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id)}
              className={`remote-key-compact relative text-left rounded-md pl-2 pr-1 py-1 border transition-colors overflow-hidden ${
                active
                  ? 'border-violet-400/40 bg-violet-500/12'
                  : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.08]'
              }`}
            >
              <span
                className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <DirectionLabel source={d.source} target={d.target} size="2xs" bright={active} />
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
  size: '2xs' | 'xs' | 'sm' | 'md' | 'lg'
  bright?: boolean
}) {
  const src = LANG_META[source]
  const tgt = LANG_META[target]
  const text =
    size === '2xs'
      ? 'text-[10px] leading-tight'
      : size === 'lg'
        ? 'text-xl sm:text-2xl'
        : size === 'md'
          ? 'text-base'
          : size === 'sm'
            ? 'text-sm'
            : 'text-xs'
  const arrow =
    size === '2xs' ? 'w-2.5 h-2.5' : size === 'lg' ? 'w-5 h-5' : size === 'md' ? 'w-4 h-4' : 'w-3 h-3'
  const srcText = size === '2xs' ? SHORT_LANG[source] : src.label
  const tgtText = size === '2xs' ? SHORT_LANG[target] : tgt.label

  return (
    <div className={`flex items-center gap-0.5 font-semibold whitespace-nowrap ${text}`}>
      <span style={{ color: src.color }} className={bright ? '' : 'opacity-85'}>
        {srcText}
      </span>
      <ArrowRight className={`${arrow} text-slate-600 shrink-0`} aria-hidden />
      <span style={{ color: tgt.color }} className={bright ? '' : 'opacity-85'}>
        {tgtText}
      </span>
    </div>
  )
}
