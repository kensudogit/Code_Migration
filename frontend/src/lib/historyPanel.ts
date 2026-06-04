export const HISTORY_PANEL_OPEN_KEY = 'cm-history-panel-open-v1'

export function loadHistoryPanelOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = localStorage.getItem(HISTORY_PANEL_OPEN_KEY)
    if (raw === null) return true
    return raw === '1' || raw === 'true'
  } catch {
    return true
  }
}

export function saveHistoryPanelOpen(open: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(HISTORY_PANEL_OPEN_KEY, open ? '1' : '0')
  } catch {
    /* ignore */
  }
}
