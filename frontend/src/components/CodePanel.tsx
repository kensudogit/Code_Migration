'use client'

import { GripVertical } from 'lucide-react'
import type { Language } from '@/lib/types'
import { LANG_META } from '@/lib/types'

type Props = {
  title: string
  lang: Language
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  placeholder?: string
  lineNumbers?: boolean
  accent?: boolean
  /** Fill parent flex container (floating window). */
  fill?: boolean
  /** Strip outer chrome; parent provides drag frame. */
  embedded?: boolean
  onDragHandlePointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
}

export function CodePanel({
  title,
  lang,
  value,
  onChange,
  readOnly,
  placeholder,
  lineNumbers,
  accent,
  fill,
  embedded,
  onDragHandlePointerDown,
}: Props) {
  const meta = LANG_META[lang]
  const lines = value ? value.split('\n').length : 1

  const editorBody = (
    <div className={`flex flex-1 min-h-0 bg-[#0a0f1a]/80 ${embedded ? 'h-full' : ''}`}>
      {lineNumbers && (
        <div
          className="select-none py-4 px-3 text-right text-slate-600 code-editor text-[11px] border-r border-white/[0.04] min-w-[2.75rem] leading-[1.65] shrink-0 overflow-hidden"
          aria-hidden
        >
          {Array.from({ length: Math.max(lines, 8) }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
      )}
      <textarea
        className={`code-editor flex-1 w-full min-h-0 px-4 py-4 bg-transparent resize-none ${
          readOnly ? 'text-slate-300' : 'text-slate-200'
        }`}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        spellCheck={false}
      />
    </div>
  )

  if (embedded) {
    return <div className="flex flex-col h-full min-h-0 flex-1">{editorBody}</div>
  }

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden surface ${
        fill ? 'h-full min-h-0' : 'min-h-[380px]'
      } ${accent ? 'ring-1 ring-violet-500/25 shadow-[0_0_40px_rgba(139,92,246,0.08)]' : ''}`}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-black/25 shrink-0 ${
          onDragHandlePointerDown ? 'cursor-grab active:cursor-grabbing touch-none' : ''
        }`}
        onPointerDown={onDragHandlePointerDown}
      >
        <div className="flex items-center gap-3 min-w-0">
          {onDragHandlePointerDown && (
            <GripVertical className="w-4 h-4 text-slate-600 shrink-0" aria-hidden />
          )}
          <span className="flex gap-1.5" aria-hidden>
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </span>
          <span className="text-xs font-medium text-slate-400 truncate">{title}</span>
        </div>
        <span
          className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md shrink-0"
          style={{
            backgroundColor: `${meta.color}18`,
            color: meta.color,
            border: `1px solid ${meta.color}33`,
          }}
        >
          {meta.label}
        </span>
      </div>
      {editorBody}
    </div>
  )
}
