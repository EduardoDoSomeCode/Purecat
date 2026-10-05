import assert from 'node:assert/strict'
import { buildPremiereTitles, buildPremiereTitlesXml } from '../src/renderer/src/premiereTitles.ts'

const segs = [
  { id: 1, start: 1.0, end: 2.5, text: 'Hello & <world>' },
  { id: 2, start: 3.0, end: 4.0, text: 'Second line' },
]

const opts = {
  fps: 25,
  fontSize: 60,
  fontColor: '#ff0000',
  align: 'center' as const,
  position: 'bottom' as const,
  uppercase: false,
}

const files = buildPremiereTitles(segs, opts)
assert.equal(files.length, 2)
assert.equal(files[0].name, 'sub_000000.prtl')
assert.equal(files[1].name, 'sub_000001.prtl')
assert.equal(files[0].encoding, 'utf16le')

const c = files[0].content
assert.match(c, /<TRString>Hello &amp; &lt;world&gt;<\/TRString>/)
assert.ok(!c.includes('First line'), 'placeholder text replaced')
assert.match(c, /RunCount="15"/) // [...'Hello & <world>'].length
assert.match(c, /<Alignment>center<\/Alignment>/)
assert.match(c, /<txWidth>60<\/txWidth>/)
assert.match(c, /<txHeight>60<\/txHeight>/)
assert.match(c, /encoding="UTF-16"/)
// built-in letter shadow survives patching
assert.match(c, /isExtendedShadowFragment>true</)
// white fills recolored (#ff0000), black shadow fills untouched
assert.match(c, /<ColorSpec index="4"><red>255<\/red><green>0<\/green><blue>0<\/blue><xpar>0<\/xpar><\/ColorSpec>/)
assert.match(c, /<ColorSpec index="4"><red>0<\/red><green>0<\/green><blue>0<\/blue><xpar>0<\/xpar><\/ColorSpec>/)

// uppercase + left + top position
const up = buildPremiereTitles([segs[0]], { ...opts, uppercase: true, align: 'left', position: 'top' })
assert.match(up[0].content, /<TRString>HELLO &amp; &lt;WORLD&gt;<\/TRString>/)
assert.match(up[0].content, /<Alignment>left<\/Alignment>/)

// per-segment color override
const perSeg = buildPremiereTitles(
  [
    { id: 1, start: 0, end: 1, text: 'a', color: '#00ff00' },
    { id: 2, start: 1, end: 2, text: 'b' },
  ],
  opts,
)
assert.match(perSeg[0].content, /<red>0<\/red><green>255<\/green><blue>0<\/blue>/)

// empty input
assert.deepEqual(buildPremiereTitles([], opts), [])

// sequence XML: clipitems match segments, file:// paths, frame times
const xml = buildPremiereTitlesXml(segs, files.map((f) => f.name), {
  fps: 25,
  titlesDir: '/tmp/out/Titles',
})
assert.equal((xml.match(/<clipitem /g) ?? []).length, 2)
assert.match(xml, /<start>25<\/start>/) // 1.0s @25
assert.match(xml, /<end>63<\/end>/) // 2.5s → 63 (max(25+1, 63)=63? round(2.5*25)=63? =62.5→63? JS Math.round(62.5)=63 ✓ wait: Math.round(2.5*25)=Math.round(62.5)=63)
assert.match(xml, /<start>75<\/start>/) // 3.0s
assert.match(xml, /file:\/\/\/tmp\/out\/Titles\/sub_000000\.prtl/)
assert.match(xml, /<timebase>25<\/timebase>/)
assert.ok(xml.startsWith('<?xml'))
assert.ok(xml.includes('<!DOCTYPE xmeml>'))

// xml-escape safety in pathurl
const xml2 = buildPremiereTitlesXml([segs[0]], ['a&b.prtl'], { fps: 25, titlesDir: '/x' })
assert.match(xml2, /a&amp;b\.prtl/)

console.log('premiere-titles checks passed')
