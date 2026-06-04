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
        className="fixed z-[200] bottom-6 right-6 inline-flex items-center gap-2 px-4 py-3 rounded-full text-sm font-semibold text-white border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:bg-slate-800/95 hover:border-violet-500/30 transition-all"
        aria-label={ui.guideOpen}
      >
        <BookOpen className="w-4 h-4 text-violet-400" />
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
      className="fixed z-[200] flex flex-col rounded-2xl border border-white/[0.08] bg-slate-900/98 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.5)] overflow-hidden"
      style={{
        left: state.x,
        top: state.y,
        width: state.expanded ? 'min(440px, calc(100vw - 16px))' : 'min(300px, calc(100vw - 16px))',
        maxHeight: state.expanded ? 'min(72vh, 640px)' : 'auto',
      }}
    >
      <div
        className="flex items-center gap-1 px-2 py-2.5 border-b border-white/[0.06] bg-white/[0.02] cursor-grab active:cursor-grabbing select-none touch-none"
        onPointerDown={onPointerDownHeader}
        onPointerMove={onPointerMoveHeader}
        onPointerUp={onPointerUpHeader}
        onPointerCancel={onPointerUpHeader}
      >
        <GripVertical className="w-4 h-4 text-slate-600 shrink-0 ml-1" aria-hidden />
        <span className="flex-1 text-sm font-semibold text-slate-200 truncate px-1">{ui.guideTitle}</span>
        <button
          type="button"
          onClick={state.expanded ? collapse : expand}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label={state.expanded ? ui.guideCollapse : ui.guideExpand}
        >
          {state.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={closePanel}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          aria-label={ui.guideClose}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {state.expanded && (
        <div className="overflow-y-auto overscroll-contain px-5 py-4 space-y-5">
          <p className="text-xs text-slate-500 m-0 leading-relaxed border-l-2 border-violet-500/40 pl-3">
            {ui.guideIntro}
          </p>
          {guideSections.map((section) => (
            <section key={section.title}>
              <h3 className="text-sm font-semibold text-slate-200 m-0 mb-2">{section.title}</h3>
              {section.body && (
                <p className="text-xs text-slate-500 m-0 mb-2 leading-relaxed">{section.body}</p>
              )}
              {section.items && (
                <ul className="list-none space-y-2 text-xs text-slate-400 m-0">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2 leading-relaxed">
                      <span className="text-violet-500/70 shrink-0">›</span>
                      <span>{item}</span>
                    </li>
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
