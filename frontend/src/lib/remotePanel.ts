export const REMOTE_PANEL_STORAGE_KEY = 'cm-remote-panel-v3'

export type RemotePanelState = {
  x: number
  y: number
}

export const defaultRemotePanelState: RemotePanelState = {
  x: 16,
  y: 96,
}

export function loadRemotePanelState(): RemotePanelState {
  if (typeof window === 'undefined') return defaultRemotePanelState
  try {
    const raw = localStorage.getItem(REMOTE_PANEL_STORAGE_KEY)
    if (!raw) return defaultRemotePanelState
    const parsed = JSON.parse(raw) as Partial<RemotePanelState>
    return {
      x: typeof parsed.x === 'number' ? parsed.x : defaultRemotePanelState.x,
      y: typeof parsed.y === 'number' ? parsed.y : defaultRemotePanelState.y,
    }
  } catch {
    return defaultRemotePanelState
  }
}
