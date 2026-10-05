import assert from 'node:assert/strict'
import { parseSRT, toSRT } from '../src/renderer/src/srt.ts'

const srt = `1
00:00:01,000 --> 00:00:03,500
Hola mundo

2
00:01:02,250 --> 00:01:04,000
Line one
line two`

const segs = parseSRT(srt)
assert.equal(segs.length, 2)
assert.equal(segs[0].text, 'Hola mundo')
assert.equal(segs[0].start, 1)
assert.equal(segs[0].end, 3.5)
assert.equal(segs[1].start, 62.25)
assert.equal(segs[1].text, 'Line one line two')

assert.deepEqual(parseSRT('not an srt'), [])
assert.deepEqual(parseSRT(''), [])

// roundtrip: parse(toSRT(x)) === x
const rt = parseSRT(toSRT(segs))
assert.equal(rt.length, segs.length)
assert.equal(rt[0].start, segs[0].start)
assert.equal(rt[0].end, segs[0].end)
assert.equal(rt[0].text, segs[0].text)
assert.equal(rt[1].start, segs[1].start)

console.log('srt checks passed')
