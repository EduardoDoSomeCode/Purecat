import assert from 'node:assert/strict'
import { buildAss, hexToAss } from '../src/renderer/src/ass.ts'
import { remapToCutTimeline, remapWords } from '../src/renderer/src/cutRemap.ts'
import type { AssSettings } from '../src/renderer/src/ass.ts'

assert.equal(hexToAss('#ff8000'), '&H000080FF')
assert.equal(hexToAss('ffffff'), '&H00FFFFFF')

const settings: AssSettings = {
  effect: 'fade',
  color: '#ffffff',
  highlightColor: '#facc15',
  outline: true,
  outlineColor: '#000000',
  outlineWidth: 2,
  position: 'bottom',
  align: 'center',
  fontSize: 16,
  uppercase: false,
  background: true,
  shadow: true,
  highlight: true,
  wordsPerChunk: 0,
}

const segs = [{ id: 1, start: 1, end: 3, text: 'Hello world' }]
const words = [
  { start: 1, end: 1.5, word: 'Hello' },
  { start: 1.5, end: 3, word: 'world' },
]
// leading silence 0-0.5 → everything shifts -0.5 on the cut timeline
const cuts = [{ start: 0, end: 0.5, isSilence: true }]

const remappedSegs = remapToCutTimeline(segs, cuts)
const remappedWords = remapWords(words, cuts)
assert.equal(remappedSegs[0].start, 0.5)
assert.equal(remappedSegs[0].end, 2.5)

const dialogue = (ass: string, layer: number, style: string) =>
  ass.split('\n').filter((l) => l.startsWith(`Dialogue: ${layer},`) && l.includes(`,${style},`))

const ass = buildAss(remappedSegs, remappedWords, settings)
assert.match(ass, /\[V4\+ Styles\]/)
assert.match(ass, /Style: Default,Arial,\d+,&H00FFFFFF,&H0015CCFA,/, 'primary white, secondary highlight (BGR)')
assert.match(ass, /Style: Boxed,Arial,/, 'box style present when background on')
// numpad alignment: bottom-center = 2 (Border, Outline, Shadow, Alignment, MarginL...)
const defStyle = ass.split('\n').find((l) => l.startsWith('Style: Default,'))
const boxStyle = ass.split('\n').find((l) => l.startsWith('Style: Boxed,'))
assert.ok(defStyle && /,1,\d+,0,2,60,60,\d+,1$/.test(defStyle), `bottom-center Default, got: ${defStyle}`)
assert.ok(boxStyle && /,3,\d+,0,2,60,60,\d+,1$/.test(boxStyle), `bottom-center Boxed, got: ${boxStyle}`)
// box under text: layer 0 box with invisible glyphs, layer 1 real text
assert.match(dialogue(ass, 0, 'Boxed')[0], /Dialogue: 0,0:00:00\.50,0:00:02\.50,Boxed,,0,0,0,,\{\\1a&HFF&\}/, 'one box for whole segment')
assert.match(dialogue(ass, 1, 'Default')[0], /Dialogue: 1,0:00:00\.50,0:00:01\.00,Default,,0,0,0,,/, 'word-0 event, remapped timing')
assert.match(dialogue(ass, 1, 'Default')[1], /Dialogue: 1,0:00:01\.00,0:00:02\.50,Default,,0,0,0,,/, 'word-1 event, remapped timing')
assert.match(ass, /\{\\1c&H0015CCFA&\}/, 'current word gets highlight colour')
assert.equal(dialogue(ass, 1, 'Default').length, 2, 'one text event per word period')
assert.equal(dialogue(ass, 0, 'Boxed').length, 1, 'single box event — no colour-run seams')
assert.equal(dialogue(ass, 1, 'Default').filter((l) => l.includes('\\fad')).length, 1, 'animation not restarted on later text events')
assert.equal(dialogue(ass, 0, 'Boxed').filter((l) => l.includes('\\fad')).length, 1, 'box animates once')

// uppercase + no highlight → single text event per segment (plus box)
const plain = buildAss(remappedSegs, remappedWords, { ...settings, uppercase: true, highlight: false })
assert.match(plain, /HELLO WORLD/)
assert.equal((plain.match(/Dialogue:/g) ?? []).length, 2, 'box + one text event')
assert.doesNotMatch(dialogue(plain, 1, 'Default')[0].split(',,')[1], /\\1c/)

// chunked display → karaoke tags on text events, box per chunk
const chunked = buildAss(remappedSegs, remappedWords, { ...settings, wordsPerChunk: 1 })
assert.equal(dialogue(chunked, 1, 'Default').length, 2, 'one text event per chunk')
assert.equal(dialogue(chunked, 0, 'Boxed').length, 2, 'one box per chunk')
assert.match(chunked, /\\k\d+/)

// no background → single layer-0 events, one style, highlight colour runs kept
const bgOff = buildAss(remappedSegs, remappedWords, { ...settings, background: false })
assert.doesNotMatch(bgOff, /Style: Boxed,/)
assert.equal(dialogue(bgOff, 0, 'Default').length, 2)
assert.match(bgOff, /\{\\1c&H0015CCFA&\}/)
assert.equal((bgOff.match(/Dialogue:/g) ?? []).length, 2, 'no box events')

// pop effect
assert.match(buildAss(segs, words, { ...settings, effect: 'pop' }), /\\fscx130/)
assert.match(buildAss(segs, words, { ...settings, effect: 'squash' }), /\\fscy40/)

// braces in text are stripped so they cannot break override parsing
const nasty = buildAss([{ id: 2, start: 0, end: 1, text: 'bad {\\an8} text' }], [], { ...settings, highlight: false })
assert.ok(!nasty.includes('bad {'), 'braces stripped from dialogue text')

console.log('ass checks passed')
