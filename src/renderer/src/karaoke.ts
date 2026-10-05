import type { TranscriptSegment, WordTime } from './types'

// index of the word currently being spoken inside this segment, or -1.
// ponytail: index-aligned with whisper's words — if the user edits the text
// to change the word count, the highlight can drift; rematch by text if that
// ever matters
export function activeWordIndex(seg: TranscriptSegment, words: WordTime[], current: number): number {
  const inSeg = words.filter((w) => w.start >= seg.start - 0.05 && w.start < seg.end)
  return inSeg.findIndex((w) => current >= w.start && current < w.end)
}

// how many of this segment's words have started by `current`
export function spokenWordCount(seg: TranscriptSegment, words: WordTime[], current: number): number {
  return words.filter((w) => w.start >= seg.start - 0.05 && w.start < seg.end && w.start <= current).length
}

// approximate word timings when no .words.json exists (old transcriptions):
// split each segment's duration across its words weighted by word length
export function estimateWords(segs: TranscriptSegment[]): WordTime[] {
  return segs.flatMap((seg) => {
    const parts = seg.text.split(/\s+/).filter(Boolean)
    if (!parts.length) return []
    const totalLen = parts.reduce((n, w) => n + w.length, 0) || 1
    const span = Math.max(seg.end - seg.start, 0)
    let t = seg.start
    return parts.map((word) => {
      const start = t
      t += (span * word.length) / totalLen
      return { start: +start.toFixed(3), end: +t.toFixed(3), word }
    })
  })
}

// old files could have end <= start for trailing words; widen so they highlight
export function normalizeWords(words: WordTime[]): WordTime[] {
  return words.map((w) => (w.end > w.start ? w : { ...w, end: +(w.start + 0.02).toFixed(3) }))
}

// which slice of the subtitle's words to show at `current`.
// perChunk 0 = natural (all words); otherwise N words at a time, advancing with playback
export function subtitleChunk(
  seg: TranscriptSegment,
  textLen: number,
  current: number,
  perChunk: number,
): { start: number; count: number; total: number } {
  if (perChunk <= 0 || textLen === 0) return { start: 0, count: textLen, total: 1 }
  const total = Math.ceil(textLen / perChunk)
  const span = Math.max(seg.end - seg.start, 1e-6)
  const progress = Math.min(Math.max((current - seg.start) / span, 0), 0.999999)
  const wordPos = Math.min(textLen - 1, Math.floor(progress * textLen))
  const idx = Math.min(total - 1, Math.floor(wordPos / perChunk))
  return { start: idx * perChunk, count: Math.min(perChunk, textLen - idx * perChunk), total }
}
