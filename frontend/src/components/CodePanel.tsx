'use client'

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
}: Props) {
  const meta = LANG_META[lang]
  const lines = value ? value.split('\n').length : 1

  return (
    <div
      className={`flex flex-col rounded-2xl overflow-hidden border min-h-[360px] ${
        accent ? 'border-indigo-500/30 shadow-lg shadow-indigo-500/5' : 'border-white/8'
      } glass`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </span>
          <span className="text-xs font-medium text-slate-400 ml-2">{title}</span>
        </div>
        <span
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded"
          style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>
      <div className="flex flex-1 min-h-0">
        {lineNumbers && (
          <div className="select-none py-3 px-2 text-right text-slate-600 code-editor text-xs border-r border-white/5 bg-black/10 min-w-[2.5rem]">
            {Array.from({ length: Math.max(lines, 12) }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        )}
        <textarea
          className="code-editor flex-1 w-full min-h-[300px] p-3 bg-transparent text-slate-200 resize-none"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
        />
      </div>
    </div>
  )
}
