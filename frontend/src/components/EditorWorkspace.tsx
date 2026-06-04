'use client'

import { LayoutGrid, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clampRectToContainer,
  defaultEditorWindows,
  EDITOR_WINDOWS_STORAGE_KEY,
  loadEditorWindows,
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
  const [containerSize, setContainerSize] = useState({ w: 900, h: 480 })
  const [windows, setWindows] = useState<EditorWindowsState | null>(null)
  const [hydrated, setHydrated] = useState(false)

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
    if (hydrated || containerSize.w < 100) return
    setWindows(loadEditorWindows(containerSize.w))
    setHydrated(true)
  }, [containerSize.w, hydrated])

  useEffect(() => {
    if (!hydrated || !windows) return
    localStorage.setItem(EDITOR_WINDOWS_STORAGE_KEY, JSON.stringify(windows))
  }, [windows, hydrated])

  const workspaceHeight = windows
    ? Math.max(440, Math.max(windows.source.y + windows.source.h, windows.result.y + windows.result.h) + 24)
    : 480

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
    const next = defaultEditorWindows(containerSize.w)
    setWindows(next)
  }

  return (
    <div className="space-y-3" ref={containerRef}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-xs text-slate-500 m-0 flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
          {ui.editorWorkspaceHint}
        </p>
        <button
          type="button"
          onClick={resetLayout}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg border border-white/[0.06] hover:bg-white/[0.04] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {ui.editorResetLayout}
        </button>
      </div>

      <div
        className="relative w-full rounded-2xl border border-dashed border-white/[0.08] bg-[#050810]/50 overflow-hidden"
        style={{ height: workspaceHeight, minHeight: 440 }}
      >
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
