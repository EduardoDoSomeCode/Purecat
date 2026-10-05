import assert from 'node:assert/strict'
import {
  activeWordIndex,
  spokenWordCount,
  estimateWords,
  normalizeWords,
  subtitleChunk,
} from '../src/renderer/src/karaoke.ts'
import type { TranscriptSegment, WordTime } from '../src/renderer/src/types.ts'

const seg: TranscriptSegment = { id: 1, start: 1, end: 3, text: 'hello brave world' }
const words: WordTime[] = [
  { start: 0.0, end: 0.5, word: 'pre' },
  { start: 1.0, end: 1.4, word: 'hello' },
  { start: 1.5, end: 1.9, word: 'brave' },
  { start: 2.0, end: 2.5, word: 'world' },
  { start: 3.5, end: 4.0, word: 'post' },
]

assert.equal(activeWordIndex(seg, words, 1.2), 0)
assert.equal(activeWordIndex(seg, words, 1.7), 1)
assert.equal(activeWordIndex(seg, words, 2.2), 2)
assert.equal(activeWordIndex(seg, words, 0.2), -1) // word outside segment
assert.equal(activeWordIndex(seg, words, 3.8), -1) // word outside segment
assert.equal(activeWordIndex(seg, words, 2.8), -1) // gap between words
assert.equal(activeWordIndex(seg, [], 1.5), -1) // no word data

assert.equal(spokenWordCount(seg, words, 0.2), 0) // before segment words
assert.equal(spokenWordCount(seg, words, 1.2), 1)
assert.equal(spokenWordCount(seg, words, 1.7), 2)
assert.equal(spokenWordCount(seg, words, 4.0), 3) // ignores words outside segment
assert.equal(spokenWordCount(seg, [], 1.5), 0)

// estimation fallback: count matches text, spans cover the whole segment
const est = estimateWords([seg])
assert.equal(est.length, seg.text.split(/\s+/).length)
assert.equal(est[0].start, seg.start)
assert.ok(Math.abs(est[est.length - 1].end - seg.end) < 0.01, 'estimate should reach segment end')
for (let i = 1; i < est.length; i++) assert.ok(est[i].start >= est[i - 1].start, 'monotonic')
// every word is the active one at its midpoint
for (const w of est) {
  const mid = (w.start + w.end) / 2
  const idx = activeWordIndex(seg, est, mid)
  assert.equal(est[idx]?.word, w.word, `midpoint of ${w.word}`)
}
// estimate highlight actually triggers where raw words might be missing
assert.ok(activeWordIndex(seg, est, (est[0].start + est[0].end) / 2) >= 0)

// stale files with end <= start get widened
const fixed = normalizeWords([{ start: 1, end: 1, word: 'x' }])
assert.ok(fixed[0].end > fixed[0].start)

// chunking: natural = all words; compressed = N at a time, advancing over time
const longSeg: TranscriptSegment = { id: 1, start: 0, end: 4, text: 'one two three four five six seven eight nine ten eleven twelve' }
const nat = subtitleChunk(longSeg, 12, 0, 0)
assert.deepEqual(nat, { start: 0, count: 12, total: 1 })
assert.deepEqual(subtitleChunk(longSeg, 12, 0, 3), { start: 0, count: 3, total: 4 })
assert.deepEqual(subtitleChunk(longSeg, 12, 2.0, 3), { start: 6, count: 3, total: 4 }) // midpoint
assert.deepEqual(subtitleChunk(longSeg, 12, 3.99, 3), { start: 9, count: 3, total: 4 }) // last chunk
assert.deepEqual(subtitleChunk(longSeg, 10, 3.99, 3), { start: 9, count: 1, total: 4 }) // partial tail
assert.deepEqual(subtitleChunk(longSeg, 12, 0, 1), { start: 0, count: 1, total: 12 })
// progress sweep: chunk index never decreases, stays in range
let last = -1
for (let t = 0; t <= 4; t += 0.05) {
  const c = subtitleChunk(longSeg, 12, t, 3)
  assert.ok(c.start >= 0 && c.start + c.count <= 12, 'in range')
  assert.ok(c.start >= last, 'monotonic')
  last = c.start
}

console.log('karaoke checks passed')
