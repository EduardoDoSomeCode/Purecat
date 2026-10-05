import type { CutSegment } from './types'

export function parseCutsFromPremiereXML(xml: string, duration: number): CutSegment[] {
  const timebase = parseFloat(xml.match(/<timebase>([\d.]+)<\/timebase>/)?.[1] ?? '') || 30

  const kept: Array<[number, number]> = []
  for (const item of xml.match(/<clipitem[\s\S]*?<\/clipitem>/g) ?? []) {
    const inRaw = item.match(/<in>([\d.]+)<\/in>/)?.[1]
    const outRaw = item.match(/<out>([\d.]+)<\/out>/)?.[1]
    if (inRaw === undefined || outRaw === undefined) continue
    const start = parseFloat(inRaw) / timebase
    const end = parseFloat(outRaw) / timebase
    if (Number.isFinite(start) && Number.isFinite(end) && end > start) kept.push([start, end])
  }
  if (!kept.length) return []

  kept.sort((a, b) => a[0] - b[0])
  const total = duration > 0 ? duration : kept[kept.length - 1][1]
  const eps = 0.04

  const cuts: CutSegment[] = []
  let pos = 0
  for (const [start, end] of kept) {
    if (start > pos + eps && pos < total) {
      cuts.push({ start: pos, end: Math.min(start, total), isSilence: true })
    }
    pos = Math.max(pos, end)
    if (pos >= total) break
  }
  if (pos < total - eps) cuts.push({ start: pos, end: total, isSilence: true })

  return cuts.filter((c) => c.end > c.start)
}
