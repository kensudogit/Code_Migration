'use client'

import { Bot, Check, ChevronUp, Copy, GripVertical, Loader2, Radio, Sparkles, X, Zap } from 'lucide-react'
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
    { id: 'go_to_python' as const, source: 'go' as const, target: 'python' as const },
    { id: 'python_to_go' as const, source: 'python' as const, target: 'go' as const },
    { id: 'go_to_java' as const, source: 'go' as const, target: 'java' as const },
    { id: 'java_to_go' as const, source: 'java' as const, target: 'go' as const },
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
  /** When set, parent can reopen the panel (e.g. header button). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  loading?: boolean
  canCopy?: boolean
  copied?: boolean
  mockMode?: boolean
  progress?: string | null
  sourceLarge?: boolean
  onConvert?: () => void
  onCopy?: () => void
}

/** Draggable floating modal for conversion direction (6-card grid). */
export function DirectionRemoteModal({
  directions,
  selected,
  onSelect,
  open: openControlled,
  onOpenChange,
  loading = false,
  canCopy = false,
  copied = false,
  mockMode = false,
  progress = null,
  sourceLarge = false,
  onConvert,
  onCopy,
}: Props) {
  const items = directions.length > 0 ? directions : FALLBACK_DIRECTIONS
  const current = items.find((d) => d.id === selected) ?? items[0]

  const [state, setState] = useState<RemotePanelState>(defaultRemotePanelState)
  const [hydrated, setHydrated] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  const isOpen = openControlled !== undefined ? openControlled : !state.minimized

  const setOpen = useCallback(
    (open: boolean) => {
      setState((s) => ({ ...s, minimized: !open }))
      onOpenChange?.(open)
    },
    [onOpenChange],
  )

  useEffect(() => {
    const loaded = loadRemotePanelState()
    if (typeof window !== 'undefined' && loaded.y < 72) {
      loaded.y = 88
    }
    const startOpen = openControlled !== undefined ? openControlled : !loaded.minimized
    setState({ ...loaded, minimized: !startOpen })
    onOpenChange?.(startOpen)
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, [])

  useEffect(() => {
    if (openControlled === undefined || !hydrated) return
    setState((s) => ({ ...s, minimized: !openControlled }))
  }, [openControlled, hydrated])

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

  if (!isOpen) {
    return (
      <div className="direction-remote-floating fixed z-[200] bottom-6 left-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2.5 rounded-full border border-violet-500/40 bg-violet-600/95 px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl hover:bg-violet-500 hover:border-violet-400/60 transition-colors"
          aria-label={ui.remoteReopenFab}
          title={ui.remoteReopenFab}
        >
          <Radio className="h-4 w-4 text-white shrink-0" strokeWidth={2.5} />
          <span className="text-sm font-bold text-white">{ui.remoteOpen}</span>
          {current && (
            <span className="hidden sm:inline text-xs font-semibold text-violet-200/90 border-l border-white/20 pl-2.5">
              <DirectionColored source={current.source} target={current.target} />
            </span>
          )}
          <ChevronUp className="h-4 w-4 text-white/80 shrink-0" aria-hidden />
        </button>
        <RemoteActions
          compact
          loading={loading}
          canCopy={canCopy}
          copied={copied}
          mockMode={mockMode}
          progress={progress}
          sourceLarge={sourceLarge}
          onConvert={onConvert}
          onCopy={onCopy}
        />
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
          onClick={() => setOpen(false)}
          className="shrink-0 p-1 rounded-md text-white/90 hover:bg-white/15 transition-colors"
          aria-label={ui.remoteClose}
          title={ui.remoteClose}
        >
          <X className="w-4 h-4" strokeWidth={2.5} />
        </button>
      </div>

      <div className="px-3 py-2.5 bg-[#1a1d2e]">
        <p className="m-0 mb-2 text-[10px] leading-snug text-slate-500">{ui.remoteHint}</p>
        <div className="grid grid-cols-2 gap-2 max-h-[min(42vh,320px)] overflow-y-auto pr-0.5">
          {items.map((d) => (
            <DirectionCard
              key={d.id}
              direction={d}
              active={d.id === selected}
              onPick={() => pickDirection(d.id)}
            />
          ))}
        </div>
        <RemoteActions
          loading={loading}
          canCopy={canCopy}
          copied={copied}
          mockMode={mockMode}
          progress={progress}
          sourceLarge={sourceLarge}
          onConvert={onConvert}
          onCopy={onCopy}
        />
      </div>
    </div>
  )
}

function RemoteActions({
  compact = false,
  loading,
  canCopy,
  copied,
  mockMode,
  progress,
  sourceLarge,
  onConvert,
  onCopy,
}: {
  compact?: boolean
  loading: boolean
  canCopy: boolean
  copied: boolean
  mockMode: boolean
  progress: string | null
  sourceLarge: boolean
  onConvert?: () => void
  onCopy?: () => void
}) {
  const convertLabel = loading
    ? sourceLarge
      ? ui.convertingLarge
      : ui.converting
    : ui.convert

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onConvert}
          disabled={loading || !onConvert}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/90 px-3 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-violet-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title={convertLabel}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          <span className="hidden md:inline">{loading ? ui.converting : ui.convert}</span>
        </button>
        <button
          type="button"
          onClick={onCopy}
          disabled={!canCopy || !onCopy}
          className="inline-flex items-center justify-center gap-1 rounded-full border border-white/15 bg-[#1a1d2e]/95 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/[0.08] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title={copied ? ui.copied : ui.copy}
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onConvert}
          disabled={loading || !onConvert}
          className="btn-primary w-full justify-center text-sm py-2.5"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {convertLabel}
        </button>
        <button
          type="button"
          onClick={onCopy}
          disabled={!canCopy || !onCopy}
          className="btn-secondary w-full justify-center text-sm py-2"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          {copied ? ui.copied : ui.copy}
        </button>
      </div>
      {loading && progress && (
        <p className="text-[10px] text-slate-400 m-0 animate-pulse leading-snug">{progress}</p>
      )}
      {mockMode && (
        <p className="text-[10px] text-amber-300/90 m-0 flex items-center gap-1.5">
          <Bot className="w-3 h-3 shrink-0" />
          {ui.mockHint}
        </p>
      )}
    </div>
  )
}

function DirectionColored({ source, target }: { source: Language; target: Language }) {
  const src = LANG_META[source]
  const tgt = LANG_META[target]
  return (
    <span className="whitespace-nowrap">
      <span style={{ color: src.color }}>{src.label}</span>
      <span className="text-slate-500 mx-0.5">{'\u2192'}</span>
      <span style={{ color: tgt.color }}>{tgt.label}</span>
    </span>
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
