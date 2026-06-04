import type { DirectionInfo, Language } from '@/lib/types'
import { LANG_META } from '@/lib/types'

/** Direction arrow (replaces legacy "?" separator). */
export const DIRECTION_ARROW = '\u2192'

export function formatDirectionLabel(source: Language, target: Language): string {
  return `${LANG_META[source].label} ${DIRECTION_ARROW} ${LANG_META[target].label}`
}

export function displayDirectionLabel(d: DirectionInfo): string {
  if (d.label.includes('?')) {
    return formatDirectionLabel(d.source, d.target)
  }
  return d.label
}
