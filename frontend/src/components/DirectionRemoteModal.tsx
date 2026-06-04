'use client'

import { ChevronRight, GripVertical, Radio } from 'lucide-react'
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

/** Compact draggable floating direction remote. */
export function DirectionRemoteModal({ directions, selected, onSelect }: Props) {
  const items = directions.length > 0 ? directions : FALLBACK_DIRECTIONS
  const current = items.find((d) => d.id === selected) ?? items[0]

  const [pos, setPos] = useState<RemotePanelState>(defaultRemotePanelState)
  const [hydrated, setHydrated] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  useEffect(() => {
    setPos(loadRemotePanelState())
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
    const w = el?.offsetWidth ?? 280
    const h = el?.offsetHeight ?? 44
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
      className="direction-remote-floating fixed z-[190] rounded-lg border border-violet-500/25 bg-[#0f111a]/98 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-xl"
      style={{
        left: pos.x,
        top: pos.y,
        width: 'min(300px, calc(100vw - 16px))',
      }}
      role="group"
      aria-label={ui.remoteTitle}
    >
      <div
        className="flex items-center gap-1 px-1.5 py-1 cursor-grab active:cursor-grabbing select-none touch-none rounded-lg"
        onPointerDown={onPointerDownDrag}
        onPointerMove={onPointerMoveDrag}
        onPointerUp={onPointerUpDrag}
        onPointerCancel={onPointerUpDrag}
        title={ui.remoteDragHint}
      >
        <GripVertical className="w-3 h-3 text-slate-600 shrink-0" aria-hidden />

        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600"
          aria-hidden
        >
          <Radio className="h-3 w-3 text-white" strokeWidth={2.5} />
        </span>

        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="min-w-0 flex-1 truncate rounded px-1 py-0.5 text-left hover:bg-white/[0.04] transition-colors"
          aria-expanded={pickerOpen}
          aria-haspopup="listbox"
          title={ui.remoteTapToOpen}
        >
          {current && <DirectionColored source={current.source} target={current.target} compact />}
        </button>

        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="shrink-0 inline-flex items-center gap-0 rounded-md border border-white/[0.08] bg-[#252836] px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 hover:border-violet-500/40 hover:text-white transition-colors"
          aria-label={ui.remoteChoose}
        >
          {ui.remoteChooseShort}
          <ChevronRight className="w-3 h-3 opacity-70" aria-hidden />
        </button>
      </div>

      {pickerOpen && (
        <ul
          className="direction-remote-picker m-0 border-t border-white/[0.06] p-0.5 list-none max-h-36 overflow-y-auto"
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
                  className={`relative w-full rounded px-2 py-1 text-left text-[11px] font-semibold transition-colors ${
                    active ? 'bg-violet-500/15 text-white' : 'text-slate-400 hover:bg-white/[0.04]'
                  }`}
                >
                  <span
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-sm"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                  />
                  <span className="pl-1.5">{displayDirectionLabel(d)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function DirectionColored({
  source,
  target,
  compact = false,
}: {
  source: Language
  target: Language
  compact?: boolean
}) {
  const src = LANG_META[source]
  const tgt = LANG_META[target]
  const srcText = compact ? SHORT_LANG[source] : src.label
  const tgtText = compact ? SHORT_LANG[target] : tgt.label
  return (
    <span className="text-[11px] font-bold leading-none whitespace-nowrap">
      <span style={{ color: src.color }}>{srcText}</span>
      <span className="text-slate-600 font-normal mx-0.5" aria-hidden>
        {'\u2192'}
      </span>
      <span style={{ color: tgt.color }}>{tgtText}</span>
    </span>
  )
}
