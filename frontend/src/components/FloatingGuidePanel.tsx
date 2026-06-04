'use client'

import { BookOpen, ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  defaultGuidePanelState,
  guideSections,
  GUIDE_STORAGE_KEY,
  type GuidePanelState,
} from '@/lib/guide'
import { ui } from '@/lib/ui'

function loadState(): GuidePanelState {
  if (typeof window === 'undefined') return defaultGuidePanelState
  try {
    const raw = localStorage.getItem(GUIDE_STORAGE_KEY)
    if (!raw) return defaultGuidePanelState
    const parsed = JSON.parse(raw) as Partial<GuidePanelState>
    return {
      open: parsed.open ?? defaultGuidePanelState.open,
      expanded: parsed.expanded ?? defaultGuidePanelState.expanded,
      x: typeof parsed.x === 'number' ? parsed.x : defaultGuidePanelState.x,
      y: typeof parsed.y === 'number' ? parsed.y : defaultGuidePanelState.y,
    }
  } catch {
    return defaultGuidePanelState
  }
}

function clampPosition(x: number, y: number, width: number, height: number) {
  const margin = 8
  const maxX = Math.max(margin, window.innerWidth - width - margin)
  const maxY = Math.max(margin, window.innerHeight - height - margin)
  return {
    x: Math.min(Math.max(margin, x), maxX),
    y: Math.min(Math.max(margin, y), maxY),
  }
}

export function FloatingGuidePanel() {
  const [state, setState] = useState<GuidePanelState>(defaultGuidePanelState)
  const [hydrated, setHydrated] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)

  useEffect(() => {
    setState(loadState())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(state))
  }, [state, hydrated])

  const persistPosition = useCallback(() => {
    const el = panelRef.current
    if (!el) return
    const { x, y } = clampPosition(state.x, state.y, el.offsetWidth, el.offsetHeight)
    if (x !== state.x || y !== state.y) {
      setState((s) => ({ ...s, x, y }))
    }
  }, [state.x, state.y])

  useEffect(() => {
    if (!state.open) return
    const onResize = () => persistPosition()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [state.open, persistPosition])

  const onPointerDownHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: state.x,
      originY: state.y,
    }
  }

  const onPointerMoveHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    const el = panelRef.current
    const w = el?.offsetWidth ?? 360
    const h = el?.offsetHeight ?? 200
    const next = clampPosition(dragRef.current.originX + dx, dragRef.current.originY + dy, w, h)
    setState((s) => ({ ...s, ...next }))
  }

  const onPointerUpHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      dragRef.current = null
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  const openPanel = () => setState((s) => ({ ...s, open: true, expanded: true }))
  const closePanel = () => setState((s) => ({ ...s, open: false }))
  const collapse = () => setState((s) => ({ ...s, expanded: false }))
  const expand = () => setState((s) => ({ ...s, expanded: true }))

  if (!hydrated) return null

  if (!state.open) {
    return (
      <button
        type="button"
        onClick={openPanel}
        className="fixed z-[200] bottom-6 right-6 inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30 hover:from-indigo-400 hover:to-violet-500 transition-all"
        aria-label={ui.guideOpen}
      >
        <BookOpen className="w-4 h-4" />
        {ui.guideButton}
      </button>
    )
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={ui.guideTitle}
      aria-expanded={state.expanded}
      className="fixed z-[200] flex flex-col rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
      style={{
        left: state.x,
        top: state.y,
        width: state.expanded ? 'min(420px, calc(100vw - 16px))' : 'min(320px, calc(100vw - 16px))',
        maxHeight: state.expanded ? 'min(72vh, 640px)' : 'auto',
      }}
    >
      <div
        className="flex items-center gap-1 px-2 py-2 border-b border-white/10 bg-white/[0.03] cursor-grab active:cursor-grabbing select-none touch-none"
        onPointerDown={onPointerDownHeader}
        onPointerMove={onPointerMoveHeader}
        onPointerUp={onPointerUpHeader}
        onPointerCancel={onPointerUpHeader}
      >
        <GripVertical className="w-4 h-4 text-slate-500 shrink-0 ml-1" aria-hidden />
        <span className="flex-1 text-sm font-semibold text-slate-200 truncate px-1">{ui.guideTitle}</span>
        <button
          type="button"
          onClick={state.expanded ? collapse : expand}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={state.expanded ? ui.guideCollapse : ui.guideExpand}
          title={state.expanded ? ui.guideCollapse : ui.guideExpand}
        >
          {state.expanded ? (
            <ChevronUp className="w-4 h-4" aria-hidden />
          ) : (
            <ChevronDown className="w-4 h-4" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={closePanel}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label={ui.guideClose}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {state.expanded && (
        <div className="overflow-y-auto overscroll-contain px-4 py-3 space-y-4 text-sm text-slate-300">
          <p className="text-xs text-slate-500 m-0 leading-relaxed">{ui.guideIntro}</p>
          {guideSections.map((section) => (
            <section key={section.title}>
              <h3 className="text-sm font-semibold text-indigo-300 m-0 mb-2">{section.title}</h3>
              {section.body && <p className="text-xs text-slate-400 m-0 mb-2 leading-relaxed">{section.body}</p>}
              {section.items && (
                <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 m-0 pl-0.5">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
