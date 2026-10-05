import assert from 'node:assert/strict'
import { dragCut, type DragState, type DragMode } from '../src/renderer/src/dragCut.ts'

const cut = { start: 2, end: 4, isSilence: true }
const st = (mode: DragMode, origStart = cut.start, origEnd = cut.end): DragState => ({
  i: 0,
  mode,
  x0: 0,
  x: 100,
  origStart,
  origEnd,
  moved: true,
})

// move: preserves length, shifts by dt
assert.deepEqual(dragCut(cut, st('move'), 3, 60), { start: 5, end: 7, isSilence: true })
// move: clamps at 0 and at duration - len
assert.equal(dragCut(cut, st('move'), -10, 60).start, 0)
assert.equal(dragCut(cut, st('move'), 100, 60).end, 60)
// start edge: clamps at 0 and at end - 0.05
assert.equal(dragCut(cut, st('start'), -10, 60).start, 0)
assert.equal(dragCut(cut, st('start'), 10, 60).start, 3.95)
// end edge: clamps at start + 0.05 and at duration
assert.equal(dragCut(cut, st('end'), -10, 60).end, 2.05)
assert.equal(dragCut(cut, st('end'), 100, 60).end, 60)

console.log('drag checks passed')
