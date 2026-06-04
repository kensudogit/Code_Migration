'use client'

import { Bot, Database, Sparkles } from 'lucide-react'
import type { HealthResponse } from '@/lib/types'
import { ui } from '@/lib/ui'

type Props = {
  health: HealthResponse | null
  mockMode?: boolean
}

export function StatusPills({ health, mockMode }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill
        ok={health?.postgres}
        label={ui.postgres}
        icon={<Database className="w-3.5 h-3.5" />}
      />
      <Pill
        ok={health?.ai_enabled}
        label={health?.ai_enabled ? ui.aiReady : ui.mockAi}
        icon={health?.ai_enabled ? <Sparkles className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
        warn={!health?.ai_enabled}
      />
      {mockMode && (
        <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/12 text-amber-300 border border-amber-500/25 uppercase tracking-wide">
          {ui.demoOutput}
        </span>
      )}
    </div>
  )
}

function Pill({
  ok,
  label,
  icon,
  warn,
}: {
  ok?: boolean
  label: string
  icon: React.ReactNode
  warn?: boolean
}) {
  const tone = ok && !warn
    ? 'text-emerald-300 border-emerald-500/25 bg-emerald-500/10'
    : warn
      ? 'text-amber-300 border-amber-500/25 bg-amber-500/10'
      : 'text-slate-400 border-white/[0.08] bg-white/[0.03]'

  const dot = ok && !warn ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : warn ? 'bg-amber-400' : 'bg-slate-500'

  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border ${tone}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden />
      {icon}
      {label}
    </span>
  )
}
