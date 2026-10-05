import type { CutSegment, TranscriptSegment, WordTime } from './types.ts'

// maps an original-timeline time onto the compacted (silence-removed) timeline
export function makeTimeMapper(cuts: CutSegment[]): (t: number) => number {
  const silences = cuts.filter((c) => c.isSilence && c.end > c.start).sort((a, b) => a.start - b.start)
  if (!silences.length) return (t) => t
  return (t: number): number => {
    let removed = 0
    for (const s of silences) {
      if (t >= s.end) removed += s.end - s.start
      else if (t > s.start) {
        removed += t - s.start // inside silence → collapses to the cut point
        break
      } else break
    }
    return t - removed
  }
}

// auto-editor's rendered output is compacted (silence removed).
// Map original-timeline times onto that cut timeline so titles stay in sync.
export function remapToCutTimeline(segments: TranscriptSegment[], cuts: CutSegment[]): TranscriptSegment[] {
  if (!cuts.some((c) => c.isSilence && c.end > c.start)) return segments
  const map = makeTimeMapper(cuts)

  const out: TranscriptSegment[] = []
  for (const seg of segments) {
    const start = map(seg.start)
    const end = Math.max(start, map(seg.end))
    if (end - start < 0.01) continue // fully swallowed by a cut
    out.push({ ...seg, start, end })
  }
  return out
}

export function remapWords(words: WordTime[], cuts: CutSegment[]): WordTime[] {
  if (!cuts.some((c) => c.isSilence && c.end > c.start)) return words
  const map = makeTimeMapper(cuts)
  const out: WordTime[] = []
  for (const w of words) {
    const start = map(w.start)
    const end = Math.max(start, map(w.end))
    if (end - start < 0.005) continue
    out.push({ ...w, start, end })
  }
  return out
}
