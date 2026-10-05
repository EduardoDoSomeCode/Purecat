import type { TranscriptSegment, WordTime, SubtitleEffect, SubtitlePosition, SubtitleAlign } from './types'

export interface AssSettings {
  effect: SubtitleEffect
  color: string
  highlightColor: string
  outline: boolean
  outlineColor: string
  outlineWidth: number
  position: SubtitlePosition
  align: SubtitleAlign
  fontSize: number
  uppercase: boolean
  background: boolean
  shadow: boolean
  highlight: boolean
  wordsPerChunk: number
}

// #rrggbb → &H00BBGGRR (ASS is BGR, alpha 00 = opaque)
export function hexToAss(hex: string): string {
  const h = hex.replace('#', '')
  const r = h.slice(0, 2)
  const g = h.slice(2, 4)
  const b = h.slice(4, 6)
  return `&H00${b}${g}${r}`.toUpperCase()
}

const fmtTime = (t: number): string => {
  const cs = Math.max(0, Math.round(t * 100))
  const h = Math.floor(cs / 360000)
  const m = Math.floor((cs % 360000) / 6000)
  const s = Math.floor((cs % 6000) / 100)
  const c = cs % 100
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`
}

const escapeText = (text: string): string =>
  text.replace(/[{}]/g, '').replace(/\r?\n/g, '\\N')

// ASS alignment is a numpad: 1-3 bottom, 4-6 mid, 7-9 top; column = left/center/right
const alignment = (position: SubtitlePosition, align: SubtitleAlign): number => {
  const col = align === 'left' ? 1 : align === 'right' ? 3 : 2
  const row = position === 'top' ? 6 : position === 'center' ? 3 : 0
  return row + col
}

const effectTag = (effect: SubtitleEffect): string => {
  switch (effect) {
    case 'fade':
      return '{\\fad(500,0)}'
    case 'pop':
      return '{\\fad(300,0)\\fscx130\\fscy130\\t(0,350,\\fscx100\\fscy100)}'
    case 'squash':
      return '{\\fad(300,0)\\fscx150\\fscy40\\t(0,450,\\fscx100\\fscy100)}'
    default:
      return ''
  }
}

interface StyledEvent {
  start: number
  end: number
  text: string
  first: boolean
}

export function buildAss(segments: TranscriptSegment[], words: WordTime[], s: AssSettings): string {
  // preview px → 1080-height space, same scale Premiere titles use
  const assFont = Math.max(8, Math.round((s.fontSize / 16) * (1080 / 18)))
  // CSS text-stroke is centred; ASS outline is fully outward — halve to match
  const strokeW = s.outline && s.outlineWidth > 0
    ? Math.max(1, Math.round((s.outlineWidth * assFont) / Math.max(1, s.fontSize) / 2))
    : 0
  const boxPad = Math.max(4, Math.round(assFont * 0.2))
  const align = alignment(s.position, s.align)
  const marginV = s.position === 'center' ? 0 : 50
  const boxColour = '&H8C000000' // rgba(0,0,0,.45) as in the preview
  const secondary = s.highlight ? hexToAss(s.highlightColor) : hexToAss(s.color)
  const normalColour = hexToAss(s.color)

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${assFont},${normalColour},${secondary},${hexToAss(s.outlineColor)},${boxColour},-1,0,0,0,100,100,0,0,1,${strokeW},${s.background || !s.shadow ? 0 : 2},${align},60,60,${marginV},1${s.background ? `\nStyle: Boxed,Arial,${assFont},${normalColour},${secondary},${boxColour},${boxColour},-1,0,0,0,100,100,0,0,3,${boxPad},0,${align},60,60,${marginV},1` : ''}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  const textEvents: StyledEvent[] = []
  const boxEvents: StyledEvent[] = []

  for (const seg of segments) {
    const segColor = seg.color ? hexToAss(seg.color) : normalColour
    const rawText = s.uppercase ? seg.text.toUpperCase() : seg.text
    const textWords = rawText.split(/\s+/).filter(Boolean)
    if (!textWords.length || seg.end - seg.start < 0.01) continue
    const segWords = words.filter((w) => w.start >= seg.start - 0.05 && w.start < seg.end)
    const aligned = segWords.length === textWords.length
    const eff = effectTag(s.effect)

    if (s.wordsPerChunk > 0 && textWords.length > s.wordsPerChunk) {
      // chunked display — one event per chunk, karaoke fill inside the chunk
      const n = textWords.length
      const span = Math.max(seg.end - seg.start, 1e-6)
      const chunkStart = (j: number) => (j === 0 ? seg.start : seg.start + ((j * s.wordsPerChunk) / n) * span)
      for (let j = 0, k = 0; k < n; j++, k += s.wordsPerChunk) {
        const start = chunkStart(j)
        const end = Math.min(seg.end, chunkStart(j + 1))
        if (end - start < 0.01) continue
        const chunkWords = textWords.slice(k, k + s.wordsPerChunk)
        let text = ''
        chunkWords.forEach((w, i) => {
          const word = aligned ? segWords[k + i] : null
          const wStart = word ? Math.max(start, word.start) : start + ((end - start) * i) / chunkWords.length
          const wEnd = word ? Math.min(end, word.end) : start + ((end - start) * (i + 1)) / chunkWords.length
          const dur = Math.max(1, Math.round((wEnd - (i === 0 ? start : wStart)) * 100))
          text += `{\\k${dur}}${escapeText(w)} `
        })
        textEvents.push({ start, end, text: (j === 0 ? eff : '') + text.trimEnd(), first: j === 0 })
        if (s.background) {
          boxEvents.push({ start, end, text: `{\\1a&HFF&}` + (j === 0 ? eff : '') + escapeText(chunkWords.join(' ')), first: j === 0 })
        }
      }
    } else if (s.highlight && aligned && textWords.length > 1) {
      // full text — one event per word period, current word in highlight colour
      textWords.forEach((w, k) => {
        const start = k === 0 ? seg.start : Math.max(seg.start, segWords[k].start)
        const end = k < textWords.length - 1 ? Math.max(start, segWords[k + 1].start) : seg.end
        if (end - start < 0.005) return
        const line = textWords
          .map((tw, i) => `{\\1c${i === k ? hexToAss(s.highlightColor) : segColor}&}${escapeText(tw)}`)
          .join(' ')
        textEvents.push({ start, end, text: (k === 0 ? eff : '') + line, first: k === 0 })
      })
      if (s.background) {
        // one box for the whole segment — constant width, no flicker at word boundaries
        boxEvents.push({
          start: seg.start,
          end: seg.end,
          text: `{\\1a&HFF&}` + eff + escapeText(rawText),
          first: true,
        })
      }
    } else {
      textEvents.push({ start: seg.start, end: seg.end, text: eff + escapeText(rawText), first: true })
      if (s.background) {
        boxEvents.push({ start: seg.start, end: seg.end, text: `{\\1a&HFF&}` + eff + escapeText(rawText), first: true })
      }
    }
  }

  const lines: string[] = []
  // box under text: layer 0, invisible glyphs size the box; text above on layer 1
  for (const e of boxEvents) {
    lines.push(`Dialogue: 0,${fmtTime(e.start)},${fmtTime(e.end)},Boxed,,0,0,0,,${e.text}`)
  }
  for (const e of textEvents) {
    lines.push(`Dialogue: ${s.background ? 1 : 0},${fmtTime(e.start)},${fmtTime(e.end)},Default,,0,0,0,,${e.text}`)
  }

  return header + '\n' + lines.join('\n') + '\n'
}
