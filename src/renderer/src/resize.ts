// shared row-resize drag: invert=true means dragging up makes it taller
export function startRowResize(
  e: React.MouseEvent,
  getH: () => number,
  setH: (h: number) => void,
  opts: { min: number; max: number; invert?: boolean },
): void {
  e.preventDefault()
  const startY = e.clientY
  const startH = getH()
  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientY - startY
    const h = startH + (opts.invert ? -delta : delta)
    setH(Math.max(opts.min, Math.min(opts.max, h)))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// horizontal drag: dragging right makes it wider (invert: dragging left makes it wider)
export function startColResize(
  e: React.MouseEvent,
  getW: () => number,
  setW: (w: number) => void,
  opts: { min: number; max: number; invert?: boolean },
): void {
  e.preventDefault()
  const startX = e.clientX
  const startW = getW()
  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientX - startX
    const w = startW + (opts.invert ? -delta : delta)
    setW(Math.max(opts.min, Math.min(opts.max, w)))
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
