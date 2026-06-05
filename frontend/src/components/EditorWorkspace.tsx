'use client'

import { RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clampRectToContainer,
  defaultEditorWindows,
  EDITOR_WINDOWS_STORAGE_KEY,
  loadEditorWindows,
  workspaceHeightFor,
  type EditorWindowId,
  type EditorWindowRect,
  type EditorWindowsState,
} from '@/lib/editorWindows'
import { ui } from '@/lib/ui'
import { ResizableCodeWindow } from '@/components/ResizableCodeWindow'
import { CodePanel } from '@/components/CodePanel'
import type { Language } from '@/lib/types'

type Props = {
  sourceLang: Language
  targetLang: Language
  source: string
  result: string
  onSourceChange: (v: string) => void
  resultPlaceholder: string
}

export function EditorWorkspace({
  sourceLang,
  targetLang,
  source,
  result,
  onSourceChange,
  resultPlaceholder,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ w: 900, h: 520 })
  const [windows, setWindows] = useState<EditorWindowsState | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [viewportMinH, setViewportMinH] = useState(520)

  const measure = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const w = el.clientWidth
    if (w > 0) setContainerSize((prev) => ({ w, h: prev.h }))
  }, [])

  useEffect(() => {
    measure()
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  useEffect(() => {
    const updateViewportMin = () => {
      setViewportMinH(Math.max(520, window.innerHeight - 180))
    }
    updateViewportMin()
    window.addEventListener('resize', updateViewportMin)
    return () => window.removeEventListener('resize', updateViewportMin)
  }, [])

  useEffect(() => {
    if (hydrated || containerSize.w < 100 || viewportMinH < 100) return
    setWindows(loadEditorWindows(containerSize.w, viewportMinH))
    setHydrated(true)
  }, [containerSize.w, viewportMinH, hydrated])

  useEffect(() => {
    if (!hydrated || !windows) return
    localStorage.setItem(EDITOR_WINDOWS_STORAGE_KEY, JSON.stringify(windows))
  }, [windows, hydrated])

  const workspaceHeight = Math.max(
    viewportMinH,
    windows ? workspaceHeightFor(windows, viewportMinH) : viewportMinH,
  )

  useEffect(() => {
    setContainerSize((prev) => ({ ...prev, h: workspaceHeight }))
  }, [workspaceHeight])

  const updateRect = useCallback(
    (id: EditorWindowId, rect: EditorWindowRect) => {
      setWindows((prev) => {
        if (!prev) return prev
        const clamped = clampRectToContainer(rect, containerSize.w, workspaceHeight)
        return { ...prev, [id]: clamped }
      })
    },
    [containerSize.w, workspaceHeight],
  )

  const focusWindow = useCallback((id: EditorWindowId) => {
    setWindows((prev) => {
      if (!prev) return prev
      const maxZ = Math.max(prev.source.z, prev.result.z)
      return { ...prev, [id]: { ...prev[id], z: maxZ + 1 } }
    })
  }, [])

  const resetLayout = () => {
    const next = defaultEditorWindows(containerSize.w, workspaceHeight)
    setWindows(next)
  }

  return (
    <div ref={containerRef}>
      <div
        className="relative w-full rounded-2xl border border-dashed border-white/[0.08] bg-[#050810]/50 overflow-hidden"
        style={{ height: workspaceHeight, minHeight: viewportMinH }}
      >
        <button
          type="button"
          onClick={resetLayout}
          className="absolute top-2 right-2 z-20 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-200 px-2 py-1 rounded-md border border-white/[0.06] bg-[#0a0f1a]/80 hover:bg-white/[0.06] transition-colors"
          title={ui.editorResetLayout}
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">{ui.editorResetLayout}</span>
        </button>
        {!hydrated || !windows ? (
          <div className="absolute inset-0 animate-pulse bg-white/[0.02]" aria-hidden />
        ) : (
          <>
        <ResizableCodeWindow
          id="source"
          title={ui.source}
          lang={sourceLang}
          rect={windows.source}
          containerWidth={containerSize.w}
          containerHeight={workspaceHeight}
          onChange={updateRect}
          onFocus={focusWindow}
        >
          <CodePanel
            embedded
            clipboard
            title={ui.source}
            lang={sourceLang}
            value={source}
            onChange={onSourceChange}
            lineNumbers
          />
        </ResizableCodeWindow>

        <ResizableCodeWindow
          id="result"
          title={ui.result}
          lang={targetLang}
          accent
          rect={windows.result}
          containerWidth={containerSize.w}
          containerHeight={workspaceHeight}
          onChange={updateRect}
          onFocus={focusWindow}
        >
          <CodePanel
            embedded
            accent
            title={ui.result}
            lang={targetLang}
            value={result}
            readOnly
            placeholder={resultPlaceholder}
            lineNumbers
          />
        </ResizableCodeWindow>
          </>
        )}
      </div>
    </div>
  )
}
