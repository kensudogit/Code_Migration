'use client'

import { Bot, Circle, Database } from 'lucide-react'
import type { HealthResponse } from '@/lib/types'
import { ui } from '@/lib/ui'

type Props = {
  health: HealthResponse | null
  mockMode?: boolean
}

export function StatusPills({ health, mockMode }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Pill ok={health?.postgres} label={ui.postgres} icon={<Database className="w-3 h-3" />} />
      <Pill
        ok={health?.ai_enabled}
        label={health?.ai_enabled ? ui.aiReady : ui.mockAi}
        icon={<Bot className="w-3 h-3" />}
        warn={!health?.ai_enabled}
      />
      {mockMode && (
        <span className="text-[10px] px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
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
  const tone =
    ok && !warn
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : warn
        ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
        : 'text-red-400 border-red-500/30 bg-red-500/10'
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${tone}`}>
      <Circle className={`w-1.5 h-1.5 fill-current ${ok && !warn ? 'text-emerald-400' : ''}`} />
      {icon}
      {label}
    </span>
  )
}
