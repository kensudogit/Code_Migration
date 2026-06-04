'use client'

import { GripVertical } from 'lucide-react'
import { useCallback, useRef } from 'react'
import type { Language } from '@/lib/types'
import { LANG_META } from '@/lib/types'
import type { EditorWindowId, EditorWindowRect } from '@/lib/editorWindows'
import { getEditorMinSize } from '@/lib/editorWindows'

type Props = {
  id: EditorWindowId
  title: string
  lang: Language
  rect: EditorWindowRect
  containerWidth: number
  containerHeight: number
  onChange: (id: EditorWindowId, rect: EditorWindowRect) => void
  onFocus: (id: EditorWindowId) => void
  accent?: boolean
  children: React.ReactNode
}

type DragMode = 'move' | 'resize-se' | 'resize-e' | 'resize-s'

export function ResizableCodeWindow({
  id,
  title,
  lang,
  rect,
  containerWidth,
  containerHeight,
  onChange,
  onFocus,
  accent,
  children,
}: Props) {
  const meta = LANG_META[lang]
  const interaction = useRef<{
    mode: DragMode
    startX: number
    startY: number
    origin: EditorWindowRect
  } | null>(null)

  const clamp = useCallback(
    (r: EditorWindowRect) => {
      const { minW, minH } = getEditorMinSize()
      const w = Math.min(Math.max(minW, r.w), containerWidth)
      const h = Math.min(Math.max(minH, r.h), containerHeight)
      const x = Math.min(Math.max(0, r.x), Math.max(0, containerWidth - w))
      const y = Math.min(Math.max(0, r.y), Math.max(0, containerHeight - h))
      return { ...r, w, h, x, y }
    },
    [containerWidth, containerHeight],
  )

  const startInteraction = (mode: DragMode, clientX: number, clientY: number) => {
    onFocus(id)
    interaction.current = { mode, startX: clientX, startY: clientY, origin: { ...rect } }

    const onMove = (e: PointerEvent) => {
      if (!interaction.current) return
      const { mode, startX, startY, origin } = interaction.current
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      let next = { ...origin }

      if (mode === 'move') {
        next.x = origin.x + dx
        next.y = origin.y + dy
      } else {
        if (mode === 'resize-se' || mode === 'resize-e') next.w = origin.w + dx
        if (mode === 'resize-se' || mode === 'resize-s') next.h = origin.h + dy
      }
      onChange(id, clamp(next))
    }

    const onUp = () => {
      interaction.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-resize]')) return
    e.preventDefault()
    startInteraction('move', e.clientX, e.clientY)
  }

  const onResizePointerDown = (mode: DragMode) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    startInteraction(mode, e.clientX, e.clientY)
  }

  return (
    <div
      className={`absolute flex flex-col rounded-2xl overflow-hidden surface shadow-xl ${
        accent ? 'ring-1 ring-violet-500/30' : 'ring-1 ring-white/[0.06]'
      }`}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        zIndex: rect.z,
      }}
      onPointerDown={() => onFocus(id)}
    >
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.06] bg-black/35 cursor-grab active:cursor-grabbing select-none touch-none shrink-0"
        onPointerDown={onHeaderPointerDown}
      >
        <GripVertical className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
        <span className="flex gap-1.5 shrink-0" aria-hidden>
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="flex-1 text-xs font-semibold text-slate-300 truncate">{title}</span>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0"
          style={{
            backgroundColor: `${meta.color}18`,
            color: meta.color,
            border: `1px solid ${meta.color}33`,
          }}
        >
          {meta.label}
        </span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col relative">{children}</div>

      <div
        data-resize
        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-10 flex items-end justify-end p-1"
        onPointerDown={onResizePointerDown('resize-se')}
        title="Resize"
        aria-label="Resize"
      >
        <span className="w-3 h-3 border-r-2 border-b-2 border-slate-400/90 rounded-br-sm" />
      </div>
      <div
        data-resize
        className="absolute bottom-0 left-2 right-6 h-2.5 cursor-s-resize z-10"
        onPointerDown={onResizePointerDown('resize-s')}
        aria-hidden
      />
      <div
        data-resize
        className="absolute top-11 right-0 bottom-3 w-2.5 cursor-e-resize z-10"
        onPointerDown={onResizePointerDown('resize-e')}
        aria-hidden
      />
    </div>
  )
}
