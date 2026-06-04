export type EditorWindowId = 'source' | 'result'

export type EditorWindowRect = {
  x: number
  y: number
  w: number
  h: number
  z: number
}

export type EditorWindowsState = {
  source: EditorWindowRect
  result: EditorWindowRect
}

export const EDITOR_WINDOWS_STORAGE_KEY = 'code-migration-editor-windows-v1'

const MIN_W = 260
const MIN_H = 200

export function getEditorMinSize() {
  return { minW: MIN_W, minH: MIN_H }
}

export function defaultEditorWindows(containerWidth: number): EditorWindowsState {
  const pad = 0
  const gap = 16
  const half = Math.floor((containerWidth - gap) / 2)
  const h = 420
  return {
    source: { x: pad, y: pad, w: Math.max(MIN_W, half), h, z: 1 },
    result: { x: pad + half + gap, y: pad, w: Math.max(MIN_W, half), h, z: 2 },
  }
}

export function loadEditorWindows(containerWidth: number): EditorWindowsState {
  if (typeof window === 'undefined') return defaultEditorWindows(containerWidth)
  try {
    const raw = localStorage.getItem(EDITOR_WINDOWS_STORAGE_KEY)
    if (!raw) return defaultEditorWindows(containerWidth)
    const parsed = JSON.parse(raw) as Partial<EditorWindowsState>
    const fallback = defaultEditorWindows(containerWidth)
    const fix = (r: Partial<EditorWindowRect> | undefined, fb: EditorWindowRect): EditorWindowRect => ({
      x: typeof r?.x === 'number' ? r.x : fb.x,
      y: typeof r?.y === 'number' ? r.y : fb.y,
      w: typeof r?.w === 'number' ? Math.max(MIN_W, r.w) : fb.w,
      h: typeof r?.h === 'number' ? Math.max(MIN_H, r.h) : fb.h,
      z: typeof r?.z === 'number' ? r.z : fb.z,
    })
    return {
      source: fix(parsed.source, fallback.source),
      result: fix(parsed.result, fallback.result),
    }
  } catch {
    return defaultEditorWindows(containerWidth)
  }
}

export function clampRectToContainer(
  rect: EditorWindowRect,
  containerW: number,
  containerH: number,
): EditorWindowRect {
  const { minW, minH } = getEditorMinSize()
  const w = Math.min(Math.max(minW, rect.w), containerW)
  const h = Math.min(Math.max(minH, rect.h), containerH)
  const x = Math.min(Math.max(0, rect.x), Math.max(0, containerW - w))
  const y = Math.min(Math.max(0, rect.y), Math.max(0, containerH - h))
  return { ...rect, x, y, w, h }
}
