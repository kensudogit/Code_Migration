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

/** Bump when default layout changes (clears old overlapping positions). */
export const EDITOR_WINDOWS_STORAGE_KEY = 'code-migration-editor-windows-v3'

const MIN_W = 240
const MIN_H = 180
const PAD = 12
const GAP = 12
const DEFAULT_WINDOW_H = 460
const STACK_BREAKPOINT = 760

export function getEditorMinSize() {
  return { minW: MIN_W, minH: MIN_H }
}

function rectsOverlap(a: EditorWindowRect, b: EditorWindowRect): boolean {
  const ax2 = a.x + a.w
  const ay2 = a.y + a.h
  const bx2 = b.x + b.w
  const by2 = b.y + b.h
  return a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y
}

export function defaultEditorWindows(
  containerWidth: number,
  containerHeight = 520,
): EditorWindowsState {
  const usable = Math.max(MIN_W * 2 + GAP, containerWidth - PAD * 2)
  const h = Math.max(MIN_H, Math.min(DEFAULT_WINDOW_H, containerHeight - PAD * 2 - 8))

  if (usable < STACK_BREAKPOINT) {
    const w = usable
    const stackH = Math.min(h, Math.floor((containerHeight - PAD * 2 - GAP) / 2))
    return {
      source: { x: PAD, y: PAD, w, h: stackH, z: 1 },
      result: { x: PAD, y: PAD + stackH + GAP, w, h: stackH, z: 2 },
    }
  }

  const half = Math.floor((usable - GAP) / 2)
  return {
    source: { x: PAD, y: PAD, w: Math.max(MIN_W, half), h, z: 1 },
    result: { x: PAD + half + GAP, y: PAD, w: Math.max(MIN_W, half), h, z: 2 },
  }
}

export function normalizeEditorWindows(
  state: EditorWindowsState,
  containerWidth: number,
): EditorWindowsState {
  const def = defaultEditorWindows(containerWidth)
  const source = {
    ...state.source,
    w: Math.max(MIN_W, state.source.w),
    h: Math.max(MIN_H, state.source.h),
  }
  const result = {
    ...state.result,
    w: Math.max(MIN_W, state.result.w),
    h: Math.max(MIN_H, state.result.h),
  }
  const merged = { source, result }
  if (rectsOverlap(source, result)) {
    return def
  }
  return {
    source: clampRectToContainer(source, containerWidth, workspaceHeightFor(merged, 520)),
    result: clampRectToContainer(result, containerWidth, workspaceHeightFor(merged, 520)),
  }
}

export function workspaceHeightFor(windows: EditorWindowsState, minHeight = 520): number {
  const bottom = Math.max(windows.source.y + windows.source.h, windows.result.y + windows.result.h)
  return Math.max(minHeight, bottom + PAD + 8)
}

export function loadEditorWindows(containerWidth: number, containerHeight = 520): EditorWindowsState {
  if (typeof window === 'undefined') return defaultEditorWindows(containerWidth, containerHeight)
  try {
    const raw = localStorage.getItem(EDITOR_WINDOWS_STORAGE_KEY)
    if (!raw) return defaultEditorWindows(containerWidth, containerHeight)
    const parsed = JSON.parse(raw) as Partial<EditorWindowsState>
    const fallback = defaultEditorWindows(containerWidth, containerHeight)
    const fix = (r: Partial<EditorWindowRect> | undefined, fb: EditorWindowRect): EditorWindowRect => ({
      x: typeof r?.x === 'number' ? r.x : fb.x,
      y: typeof r?.y === 'number' ? r.y : fb.y,
      w: typeof r?.w === 'number' ? Math.max(MIN_W, r.w) : fb.w,
      h: typeof r?.h === 'number' ? Math.max(MIN_H, r.h) : fb.h,
      z: typeof r?.z === 'number' ? r.z : fb.z,
    })
    return normalizeEditorWindows(
      {
        source: fix(parsed.source, fallback.source),
        result: fix(parsed.result, fallback.result),
      },
      containerWidth,
    )
  } catch {
    return defaultEditorWindows(containerWidth, containerHeight)
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
