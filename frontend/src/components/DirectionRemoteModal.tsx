'use client'

import { ChevronRight, GripVertical, Radio, Sparkles } from 'lucide-react'
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

/** Draggable floating direction remote (compact bar + picker popover). */
export function DirectionRemoteModal({ directions, selected, onSelect }: Props) {
  const items = directions.length > 0 ? directions : FALLBACK_DIRECTIONS
  const current = items.find((d) => d.id === selected) ?? items[0]

  const [pos, setPos] = useState<RemotePanelState>(defaultRemotePanelState)
  const [hydrated, setHydrated] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  useEffect(() => {
    const loaded = loadRemotePanelState()
    if (typeof window !== 'undefined' && loaded.y < 72) {
      loaded.y = 96
    }
    setPos(loaded)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(REMOTE_PANEL_STORAGE_KEY, JSON.stringify(pos))
  }, [pos, hydrated])

  const persistPosition = useCallback(() => {
    const el = panelRef.current
    if (!el) return
    const next = clampFloatingPosition(pos.x, pos.y, el.offsetWidth, el.offsetHeight)
    if (next.x !== pos.x || next.y !== pos.y) {
      setPos((p) => ({ ...p, ...next }))
    }
  }, [pos.x, pos.y])

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
      originX: pos.x,
      originY: pos.y,
    }
  }

  const onPointerMoveDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const el = panelRef.current
    const w = el?.offsetWidth ?? 480
    const h = el?.offsetHeight ?? 120
    const next = clampFloatingPosition(
      dragRef.current.originX + dx,
      dragRef.current.originY + dy,
      w,
      h,
    )
    setPos((p) => ({ ...p, ...next }))
  }

  const onPointerUpDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const pickDirection = (id: DirectionId) => {
    onSelect(id)
    setPickerOpen(false)
  }

  if (!hydrated) return null

  return (
    <div
      ref={panelRef}
      className="direction-remote-floating fixed z-[190] flex flex-col rounded-xl border border-violet-500/20 bg-[#0f111a]/98 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      style={{
        left: pos.x,
        top: pos.y,
        width: 'min(560px, calc(100vw - 16px))',
      }}
      role="group"
      aria-label={ui.remoteTitle}
    >
      <div
        className="flex items-center gap-1 px-2 py-2 border-b border-white/[0.06] bg-[#1a1d2e]/90 cursor-grab active:cursor-grabbing select-none touch-none rounded-t-xl"
        onPointerDown={onPointerDownDrag}
        onPointerMove={onPointerMoveDrag}
        onPointerUp={onPointerUpDrag}
        onPointerCancel={onPointerUpDrag}
        title={ui.remoteDragHint}
      >
        <GripVertical className="w-4 h-4 text-slate-600 shrink-0" aria-hidden />
        <Sparkles className="w-3 h-3 text-violet-400 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1 px-1">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Step 1</p>
          <p className="m-0 text-xs font-bold text-slate-200 truncate">{ui.selectDirection}</p>
        </div>
      </div>

      <div className="px-3 py-2.5 sm:px-3.5">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-lg border border-violet-500/25 bg-[#1a1d2e] px-3 py-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600"
            aria-hidden
          >
            <Radio className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>

          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="min-w-0 flex-1 text-left rounded-md hover:bg-white/[0.03] px-1 py-0.5 -mx-1 transition-colors"
            aria-expanded={pickerOpen}
            aria-haspopup="listbox"
          >
            <p className="m-0 text-[10px] text-slate-500 leading-tight">{ui.remoteTapToOpen}</p>
            {current && (
              <DirectionColored source={current.source} target={current.target} className="mt-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            className="shrink-0 inline-flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-[#252836] px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-violet-500/40 hover:bg-[#2a2d3d] transition-colors"
          >
            {ui.remoteChoose}
            <ChevronRight className="w-3.5 h-3.5 opacity-70" aria-hidden />
          </button>
        </div>

        {pickerOpen && (
          <ul
            className="direction-remote-picker m-0 mt-2 p-1 list-none rounded-lg border border-white/[0.08] bg-[#1a1d2e] max-h-48 overflow-y-auto"
            role="listbox"
            aria-label={ui.remoteOpen}
          >
            {items.map((d) => {
              const active = d.id === selected
              const accent = LANG_META[d.source].color
              return (
                <li key={d.id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => pickDirection(d.id)}
                    className={`relative w-full flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? 'bg-violet-500/15 text-white'
                        : 'text-slate-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-sm"
                      style={{ backgroundColor: accent }}
                      aria-hidden
                    />
                    <span className="pl-2 font-semibold">{displayDirectionLabel(d)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function DirectionColored({
  source,
  target,
  className = '',
}: {
  source: Language
  target: Language
  className?: string
}) {
  const src = LANG_META[source]
  const tgt = LANG_META[target]
  return (
    <p className={`m-0 text-sm sm:text-base font-bold ${className}`}>
      <span style={{ color: src.color }}>{src.label}</span>
      <span className="text-slate-500 font-normal mx-1.5" aria-hidden>
        {'\u2192'}
      </span>
      <span style={{ color: tgt.color }}>{tgt.label}</span>
    </p>
  )
}
