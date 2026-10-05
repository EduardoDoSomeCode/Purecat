import assert from 'node:assert/strict'
import { buildKdenliveTitles } from '../src/renderer/src/kdenlive.ts'

const segs = [
  { id: 1, start: 1.0, end: 2.5, text: 'Hello <world> & "friends"' },
  { id: 2, start: 3.0, end: 4.0, text: 'Second line' },
]

const files = buildKdenliveTitles(segs, { fps: 30 })
assert.equal(files.length, 4)
assert.equal(files[0].name, '1_.kdenlivetitle')
assert.match(files[0].content, /duration="30"/)
assert.match(files[1].name, /^2\.kdenlivetitle$/)
assert.match(files[1].content, /duration="45"/)
assert.match(files[1].content, /Hello &lt;world&gt; &amp; &quot;friends&quot;/)
assert.match(files[2].name, /_\.kdenlivetitle$/)
assert.match(files[2].content, /duration="15"/)
assert.equal(files[3].name, '4.kdenlivetitle')
assert.match(files[3].content, /duration="30"/)
assert.ok(files.every((f) => f.content.startsWith('<kdenlivetitle')))
assert.ok(files.every((f) => f.content.includes('width="1920"')))

// no leading gap -> no blank title
const noGap = buildKdenliveTitles([{ id: 1, start: 0, end: 1, text: 'x' }], { fps: 25 })
assert.equal(noGap.length, 1)
assert.equal(noGap[0].name, '1.kdenlivetitle')
assert.match(noGap[0].content, /duration="25"/)

// empty input
assert.deepEqual(buildKdenliveTitles([], { fps: 30 }), [])

// custom colors: #ff0000 text, #00ff00 outline -> kdenlive rgba quads
const colored = buildKdenliveTitles([{ id: 1, start: 0, end: 1, text: 'x' }], {
  fps: 30,
  fontColor: '#ff0000',
  outlineColor: '#00ff00',
  outlineWidth: 0,
})
assert.match(colored[0].content, /font-color="255,0,0,255"/)
assert.match(colored[0].content, /font-outline-color="0,255,0,255"/)
assert.match(colored[0].content, /font-outline="0"/)

// outline width is passed through (default 2)
assert.match(files[1].content, /font-outline="2"/)
const thick = buildKdenliveTitles([{ id: 1, start: 0, end: 1, text: 'x' }], { fps: 30, outlineWidth: 4 })
assert.match(thick[0].content, /font-outline="4"/)

// per-segment color override beats the global font color
const perSeg = buildKdenliveTitles(
  [
    { id: 1, start: 0, end: 1, text: 'a', color: '#123456' },
    { id: 2, start: 1, end: 2, text: 'b' },
  ],
  { fps: 30, fontColor: '#ff0000' },
)
assert.match(perSeg[0].content, /font-color="18,52,86,255"/)
assert.match(perSeg[1].content, /font-color="255,0,0,255"/)

console.log('kdenlive checks passed')

// --- template mode (KdenSubs core feature) ---
const TPL = `<kdenlivetitle LC_NUMERIC="C" duration="30" height="1080" out="30" width="1920">
 <item type="QGraphicsTextItem" z-index="0">
  <position x="123" y="900">
   <transform>1,0,0,0,1,0,0,0,1</transform>
  </position>
  <content alignment="4" box-height="72" box-width="800" font="Impact" font-color="255,0,0,255" font-pixel-size="48">Template text</content>
 </item>
 <startviewport rect="0,0,1920,1080"/>
 <endviewport rect="0,0,1920,1080"/>
 <background color="0,0,0,0"/>
</kdenlivetitle>
`
const withTpl = buildKdenliveTitles(
  [
    { id: 1, start: 1.0, end: 2.5, text: 'Hello <world>' },
    { id: 2, start: 3.0, end: 4.0, text: 'Second' },
  ],
  { fps: 25, template: TPL },
)
// leading 1s gap -> blank clone with items stripped, duration=25
assert.equal(withTpl[0].name, '1_.kdenlivetitle')
assert.ok(!withTpl[0].content.includes('<item'))
assert.ok(!withTpl[0].content.includes('Template text'))
assert.match(withTpl[0].content, /duration="25"/)
assert.match(withTpl[0].content, /<startviewport/)
// text title: cloned style, patched text + duration, forced x=0/center/full box
const t1 = withTpl[1].content
assert.equal(withTpl[1].name, '2.kdenlivetitle')
assert.match(t1, /duration="38"/) // round(2.5*25)-round(1*25)=63-25=38
assert.match(t1, /font="Impact"/) // template font preserved
assert.match(t1, /font-color="255,0,0,255"/) // template color preserved
assert.match(t1, />Hello &lt;world&gt;<\/content>/)
assert.match(t1, /<position x="0" y="900">/) // x forced to 0, template y kept
assert.match(t1, /box-width="1920"/) // full project width
// no template -> existing generated path unchanged
const noTpl = buildKdenliveTitles([{ id: 1, start: 0, end: 1, text: 'x' }], { fps: 30 })
assert.match(noTpl[0].content, /font="Arial"/)

console.log('kdenlive template checks passed')
