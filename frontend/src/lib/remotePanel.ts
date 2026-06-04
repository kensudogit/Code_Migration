export const REMOTE_PANEL_STORAGE_KEY = 'cm-remote-panel-v4'

export type RemotePanelState = {
  x: number
  y: number
  minimized: boolean
}

export const defaultRemotePanelState: RemotePanelState = {
  x: 24,
  y: 88,
  minimized: false,
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
      minimized:
        typeof parsed.minimized === 'boolean' ? parsed.minimized : defaultRemotePanelState.minimized,
    }
  } catch {
    return defaultRemotePanelState
  }
}
