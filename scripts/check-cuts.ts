import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseCutsFromPremiereXML } from '../src/renderer/src/premiereXml.ts'

// Fixture mirrors auto-editor --export premiere output (frames @ timebase 15):
// kept [0,1.2] [1.8,3.2] [3.8,5.0] => silences [1.2,1.8] and [3.2,3.8]
const fixture = `<?xml version='1.0' encoding='utf-8'?>
<xmeml version="5">
  <sequence>
    <duration>57</duration>
    <rate><timebase>15</timebase></rate>
    <media>
      <video>
        <track>
          <clipitem id="clipitem-1"><start>0</start><end>18</end><in>0</in><out>18</out>
            <file id="file-1"><media><video></video><audio></audio></media></file>
          </clipitem>
          <clipitem id="clipitem-2"><start>18</start><end>39</end><in>27</in><out>48</out></clipitem>
          <clipitem id="clipitem-3"><start>39</start><end>57</end><in>57</in><out>75</out></clipitem>
        </track>
      </video>
      <audio>
        <track>
          <clipitem id="clipitem-7"><start>0</start><end>18</end><in>0</in><out>18</out></clipitem>
        </track>
      </audio>
    </media>
  </sequence>
</xmeml>`

const cuts = parseCutsFromPremiereXML(fixture, 5)
assert.equal(cuts.length, 2)
assert.equal(cuts[0].start, 1.2)
assert.equal(cuts[0].end, 1.8)
assert.equal(cuts[1].start, 3.2)
assert.equal(cuts[1].end, 3.8)
assert.equal(cuts[0].isSilence, true)

// leading silence + trailing silence
const leadTail = `<rate><timebase>10</timebase></rate>
<clipitem><in>20</in><out>40</out></clipitem>`
const c2 = parseCutsFromPremiereXML(leadTail, 6)
assert.deepEqual(c2.map((c) => [c.start, c.end]), [[0, 2], [4, 6]])

assert.deepEqual(parseCutsFromPremiereXML('', 5), [])
// unknown duration falls back to last kept end => same two gaps
assert.equal(parseCutsFromPremiereXML(fixture, 0).length, 2)

// real auto-editor output (if present from a prior run)
try {
  const real = parseCutsFromPremiereXML(readFileSync('/tmp/opencode/at.xml', 'utf-8'), 5)
  assert.equal(real.length, 2)
  assert.ok(Math.abs(real[0].start - 1.2) < 0.01 && Math.abs(real[0].end - 1.8) < 0.01)
  assert.ok(Math.abs(real[1].start - 3.2) < 0.01 && Math.abs(real[1].end - 3.8) < 0.01)
} catch (e) {
  if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
}

console.log('cuts checks passed')
