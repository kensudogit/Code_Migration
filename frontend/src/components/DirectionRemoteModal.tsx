'use client'

import { GripVertical, Radio, Sparkles, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { displayDirectionLabel, formatDirectionLabel } from '@/lib/directionFormat'
import { clampFloatingPosition } from '@/lib/floatingPosition'
import {
  defaultRemotePanelState,
  loadRemotePanelState,
  REMOTE_PANEL_STORAGE_KEY,
  type RemotePanelState,
} from '@/lib/remotePanel'
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

/** Draggable floating modal for conversion direction (6-card grid). */
export function DirectionRemoteModal({ directions, selected, onSelect }: Props) {
  const items = directions.length > 0 ? directions : FALLBACK_DIRECTIONS
  const current = items.find((d) => d.id === selected) ?? items[0]

  const [state, setState] = useState<RemotePanelState>(defaultRemotePanelState)
  const [hydrated, setHydrated] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  useEffect(() => {
    const loaded = loadRemotePanelState()
    if (typeof window !== 'undefined' && loaded.y < 72) {
      loaded.y = 88
    }
    setState(loaded)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(REMOTE_PANEL_STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  const persistPosition = useCallback(() => {
    const el = panelRef.current
    if (!el) return
    const next = clampFloatingPosition(state.x, state.y, el.offsetWidth, el.offsetHeight)
    if (next.x !== state.x || next.y !== state.y) {
      setState((s) => ({ ...s, ...next }))
    }
  }, [state.x, state.y])

  useEffect(() => {
    const onResize = () => persistPosition()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [persistPosition])

  const onPointerDownDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: state.x,
      originY: state.y,
    }
  }

  const onPointerMoveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const el = panelRef.current
    const w = el?.offsetWidth ?? 360
    const h = el?.offsetHeight ?? 200
    const next = clampFloatingPosition(
      dragRef.current.originX + dx,
      dragRef.current.originY + dy,
      w,
      h,
    )
    setState((s) => ({ ...s, ...next }))
  }

  const onPointerUpDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const pickDirection = (id: DirectionId) => {
    onSelect(id)
  }

  if (!hydrated) return null

  if (state.minimized) {
    return (
      <div
        ref={panelRef}
        className="fixed z-[190]"
        style={{ left: state.x, top: state.y }}
      >
        <button
          type="button"
          onClick={() => setState((s) => ({ ...s, minimized: false }))}
          className="direction-remote-floating flex items-center gap-2 rounded-full border border-violet-500/30 bg-[#0f111a]/95 px-3 py-2 shadow-lg shadow-black/40 backdrop-blur-xl hover:border-violet-400/50 transition-colors"
          aria-label={ui.remoteOpen}
          title={ui.remoteTapToOpen}
        >
          <Radio className="h-4 w-4 text-violet-400 shrink-0" strokeWidth={2.5} />
          {current && (
            <span className="text-xs font-bold text-slate-200">
              <LangBadge lang={current.source} />
              <span className="text-slate-600 mx-1">{'\u2192'}</span>
              <LangBadge lang={current.target} />
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={ui.selectDirection}
      aria-modal="false"
      className="direction-remote-floating fixed z-[190] flex flex-col overflow-hidden rounded-xl border border-violet-500/25 bg-[#0f111a]/98 shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      style={{
        left: state.x,
        top: state.y,
        width: 'min(380px, calc(100vw - 24px))',
      }}
    >
      <div
        className="flex items-center gap-1.5 px-2 py-2 bg-violet-600/90 cursor-grab active:cursor-grabbing select-none touch-none"
        onPointerDown={onPointerDownDrag}
        onPointerMove={onPointerMoveDrag}
        onPointerUp={onPointerUpDrag}
        onPointerCancel={onPointerUpDrag}
        title={ui.remoteDragHint}
      >
        <GripVertical className="w-4 h-4 text-white/70 shrink-0" aria-hidden />
        <Sparkles className="w-3.5 h-3.5 text-white shrink-0" aria-hidden />
        <span className="flex-1 min-w-0 text-sm font-bold text-white truncate">{ui.selectDirection}</span>
        <button
          type="button"
          onClick={() => setState((s) => ({ ...s, minimized: true }))}
          className="shrink-0 p-1 rounded-md text-white/90 hover:bg-white/15 transition-colors"
          aria-label={ui.remoteClose}
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      <div className="px-3 py-2.5 bg-[#1a1d2e]">
        <p className="m-0 mb-2 text-[10px] leading-snug text-slate-500">{ui.remoteHint}</p>
        <div className="grid grid-cols-2 gap-2">
          {items.map((d) => (
            <DirectionCard
              key={d.id}
              direction={d}
              active={d.id === selected}
              onPick={() => pickDirection(d.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function LangBadge({ lang }: { lang: Language }) {
  const meta = LANG_META[lang]
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
      style={{
        color: meta.color,
        backgroundColor: `${meta.color}22`,
        border: `1px solid ${meta.color}44`,
      }}
    >
      {meta.label}
    </span>
  )
}

function DirectionCard({
  direction,
  active,
  onPick,
}: {
  direction: DirectionInfo
  active: boolean
  onPick: () => void
}) {
  const src = LANG_META[direction.source]
  const tgt = LANG_META[direction.target]
  const accent = src.color

  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={active}
      className={`relative flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-all ${
        active
          ? 'border-violet-400/70 bg-violet-500/10 shadow-[0_0_0_1px_rgba(139,92,246,0.35)]'
          : 'border-white/[0.08] bg-[#252836]/80 hover:border-white/[0.14] hover:bg-[#2a2d3d]'
      }`}
    >
      <span
        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-sm"
        style={{ backgroundColor: accent }}
        aria-hidden
      />
      <div className="flex items-center gap-1 pl-1">
        <LangBadge lang={direction.source} />
        <span className="text-[10px] text-slate-600">{'\u2192'}</span>
        <LangBadge lang={direction.target} />
      </div>
      <span className="text-xs font-bold text-slate-100 leading-tight">
        {displayDirectionLabel(direction)}
      </span>
    </button>
  )
}
