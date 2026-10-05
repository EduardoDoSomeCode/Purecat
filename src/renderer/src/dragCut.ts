export type Cut = { start: number; end: number; isSilence: boolean }
export type DragMode = 'move' | 'start' | 'end'

export interface DragState {
  i: number
  mode: DragMode
  x0: number
  x: number
  origStart: number
  origEnd: number
  moved: boolean
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))

export const dragCut = (c: Cut, d: DragState, dt: number, duration: number): Cut => {
  const len = d.origEnd - d.origStart
  if (d.mode === 'move') {
    const s = clamp(d.origStart + dt, 0, Math.max(0, duration - len))
    return { ...c, start: s, end: s + len }
  }
  if (d.mode === 'start') return { ...c, start: clamp(d.origStart + dt, 0, d.origEnd - 0.05) }
  return { ...c, end: clamp(d.origEnd + dt, d.origStart + 0.05, duration) }
}
