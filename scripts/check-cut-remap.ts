import assert from 'node:assert/strict'
import { remapToCutTimeline } from '../src/renderer/src/cutRemap.ts'
import type { CutSegment, TranscriptSegment } from '../src/renderer/src/types.ts'

const cuts: CutSegment[] = [
  { start: 0, end: 1, isSilence: true },
  { start: 3, end: 5, isSilence: true },
  { start: 5, end: 6, isSilence: false },
]

const segs: TranscriptSegment[] = [
  { id: 1, start: 1.5, end: 2.5, text: 'after first cut' },
  { id: 2, start: 5.5, end: 6.5, text: 'spans second cut' },
  { id: 3, start: 3.5, end: 4.5, text: 'inside silence' },
  { id: 4, start: 0.2, end: 0.8, text: 'in leading silence' },
]

const out = remapToCutTimeline(segs, cuts)

// no cuts → identity
assert.deepEqual(remapToCutTimeline(segs, []), segs)

// 1s silence before t=1.5 → shift by 1
assert.equal(out[0].start, 0.5)
assert.equal(out[0].end, 1.5)
assert.equal(out[0].text, 'after first cut')

// spans silence [3,5]: start 5.5 → 5.5-1-2=2.5; end 6.5 → 6.5-3=3.5
const spanning = out.find((s) => s.id === 2)!
assert.equal(spanning.start, 2.5)
assert.equal(spanning.end, 3.5)

// entirely inside silence → dropped
assert.ok(!out.some((s) => s.id === 3))
// leading silence swallowed → dropped
assert.ok(!out.some((s) => s.id === 4))

// order preserved, all positive duration
assert.ok(out.every((s) => s.end > s.start))

console.log('cut-remap checks passed')
