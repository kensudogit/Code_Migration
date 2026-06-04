'use client'

import { Check, ClipboardPaste, Copy, Eraser, GripVertical, TextSelect } from 'lucide-react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Language } from '@/lib/types'
import { LANG_META } from '@/lib/types'
import { ui } from '@/lib/ui'

type Props = {
  title: string
  lang: Language
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  placeholder?: string
  lineNumbers?: boolean
  accent?: boolean
  fill?: boolean
  embedded?: boolean
  /** Show paste / copy / select-all / clear (editable source). */
  clipboard?: boolean
  onDragHandlePointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void
}

/** Logical line count (matches textarea newlines, including trailing newline). */
function countLines(text: string): number {
  if (!text) return 1
  let n = 1
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') n++
  }
  return n
}

function buildLineNumberText(lineCount: number): string {
  if (lineCount <= 1) return '1'
  const parts: string[] = new Array(lineCount)
  for (let i = 0; i < lineCount; i++) parts[i] = String(i + 1)
  return parts.join('\n')
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
  clipboard = false,
  onDragHandlePointerDown,
}: Props) {
  const meta = LANG_META[lang]
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLPreElement>(null)
  const prevLineCountRef = useRef(0)
  const [clipboardMsg, setClipboardMsg] = useState<string | null>(null)
  const [scrollLine, setScrollLine] = useState(1)

  const lineCount = useMemo(() => countLines(value), [value])
  const gutterText = useMemo(() => buildLineNumberText(lineCount), [lineCount])
  const gutterMinWidth = useMemo(() => {
    const digits = String(lineCount).length
    return `calc(${Math.max(2.75, 0.5 + digits * 0.55)}rem + 1.5rem)`
  }, [lineCount])

  const editable = !readOnly && !!onChange

  const syncGutterScroll = useCallback(() => {
    const ta = textareaRef.current
    const gutter = gutterRef.current
    if (!ta) return
    const maxScroll = Math.max(0, ta.scrollHeight - ta.clientHeight)
    if (ta.scrollTop > maxScroll) {
      ta.scrollTop = maxScroll
    }
    if (gutter) {
      gutter.style.transform = `translate3d(0, -${ta.scrollTop}px, 0)`
    }
    const lh = parseFloat(getComputedStyle(ta).lineHeight)
    const lineHeight = Number.isFinite(lh) && lh > 0 ? lh : 21.3125
    const firstVisible = Math.min(lineCount, Math.floor(ta.scrollTop / lineHeight) + 1)
    setScrollLine(firstVisible)
  }, [lineCount])

  useLayoutEffect(() => {
    const ta = textareaRef.current
    if (ta && lineCount < prevLineCountRef.current) {
      ta.scrollTop = 0
    }
    prevLineCountRef.current = lineCount
    syncGutterScroll()
  }, [value, gutterText, lineCount, syncGutterScroll])

  const flash = (msg: string) => {
    setClipboardMsg(msg)
    window.setTimeout(() => setClipboardMsg(null), 1600)
  }

  const insertAtCursor = useCallback(
    (text: string) => {
      if (!onChange) return
      const el = textareaRef.current
      if (!el) {
        onChange(text)
        return
      }
      const start = el.selectionStart ?? value.length
      const end = el.selectionEnd ?? value.length
      const next = value.slice(0, start) + text + value.slice(end)
      onChange(next)
      const caret = start + text.length
      requestAnimationFrame(() => {
        el.focus()
        el.setSelectionRange(caret, caret)
        syncGutterScroll()
      })
    },
    [onChange, value, syncGutterScroll],
  )

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text) return
      insertAtCursor(text)
      flash(ui.pasted)
    } catch {
      textareaRef.current?.focus()
      flash(ui.paste)
    }
  }

  const handleCopy = async () => {
    const el = textareaRef.current
    const selected =
      el && el.selectionStart !== el.selectionEnd
        ? value.slice(el.selectionStart, el.selectionEnd)
        : value
    if (!selected) return
    try {
      await navigator.clipboard.writeText(selected)
      flash(ui.copied)
    } catch {
      /* ignore */
    }
  }

  const handleSelectAll = () => {
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.select()
  }

  const scrollToTop = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.scrollTop = 0
    syncGutterScroll()
    ta.focus()
  }

  const handleClear = () => {
    onChange?.('')
    requestAnimationFrame(() => {
      const ta = textareaRef.current
      if (!ta) return
      ta.scrollTop = 0
      ta.focus()
      syncGutterScroll()
    })
  }

  const stopWindowDrag = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation()
  }

  const toolbar =
    clipboard && editable ? (
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-white/[0.06] bg-black/20 shrink-0">
        <button type="button" onClick={handlePaste} className="editor-clip-btn" title={ui.paste}>
          <ClipboardPaste className="w-3.5 h-3.5" />
          <span>{ui.paste}</span>
        </button>
        <button type="button" onClick={handleCopy} className="editor-clip-btn" title={ui.copySource}>
          <Copy className="w-3.5 h-3.5" />
          <span>{ui.copySource}</span>
        </button>
        <button type="button" onClick={handleSelectAll} className="editor-clip-btn" title={ui.selectAll}>
          <TextSelect className="w-3.5 h-3.5" />
          <span>{ui.selectAll}</span>
        </button>
        <button type="button" onClick={handleClear} className="editor-clip-btn" title={ui.clearSource}>
          <Eraser className="w-3.5 h-3.5" />
          <span>{ui.clearSource}</span>
        </button>
        {clipboardMsg ? (
          <span className="ml-auto text-[10px] text-emerald-400 flex items-center gap-1 pr-1">
            <Check className="w-3 h-3" />
            {clipboardMsg}
          </span>
        ) : null}
        {lineNumbers && (
          <span className="ml-auto flex items-center gap-2 text-[10px] text-slate-500 tabular-nums pr-1">
            <span>
              {lineCount.toLocaleString()} {ui.lineCount}
              {lineCount > 1 ? ` · L${scrollLine}` : ''}
            </span>
            {lineCount > 30 && scrollLine > 8 && (
              <button type="button" onClick={scrollToTop} className="editor-clip-btn py-0.5 px-1.5">
                {ui.scrollToTop}
              </button>
            )}
          </span>
        )}
      </div>
    ) : lineNumbers ? (
      <div className="flex justify-end items-center gap-2 px-2 py-1 border-b border-white/[0.06] bg-black/20 shrink-0">
        <span className="text-[10px] text-slate-500 tabular-nums">
          {lineCount.toLocaleString()} {ui.lineCount}
          {lineCount > 1 ? ` · L${scrollLine}` : ''}
        </span>
        {editable && lineCount > 30 && scrollLine > 8 && (
          <button type="button" onClick={scrollToTop} className="editor-clip-btn py-0.5 px-1.5">
            {ui.scrollToTop}
          </button>
        )}
      </div>
    ) : null

  const editorBody = (
    <div
      className={`flex flex-col flex-1 min-h-0 bg-[#0a0f1a]/80 ${embedded ? 'h-full' : ''}`}
      onPointerDown={stopWindowDrag}
      onMouseDown={stopWindowDrag}
    >
      {toolbar}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {lineNumbers && (
          <div
            className="line-gutter-track select-none shrink-0"
            style={{ minWidth: gutterMinWidth }}
            aria-hidden
          >
            <pre ref={gutterRef} className="code-editor line-gutter-pre">
              {gutterText}
            </pre>
          </div>
        )}
        <textarea
          ref={textareaRef}
          className={`code-editor code-editor-scroll flex-1 w-full min-h-0 min-w-0 px-4 py-4 bg-transparent resize-none select-text whitespace-pre overflow-x-auto overflow-y-auto ${
            readOnly ? 'text-slate-300 cursor-default' : 'text-slate-200 cursor-text'
          }`}
          style={{ wordWrap: 'normal', overflowWrap: 'normal' }}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onScroll={syncGutterScroll}
          onPaste={(e) => {
            if (!editable) return
            e.stopPropagation()
          }}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          wrap="off"
        />
      </div>
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
