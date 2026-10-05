import type { TranscriptSegment } from './types'

export interface TitleFile {
  name: string
  content: string
}

function escapeXml(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export { escapeXml }

function hexToKdenlive(hex: string): string {
  const m = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return '255,255,255,255'
  const int = parseInt(m, 16)
  return `${(int >> 16) & 255},${(int >> 8) & 255},${int & 255},255`
}

// .kdenlivetitle format per KdenSubs (https://github.com/Gr-og/KdenSubs):
// duration/out are in frames; blank titles pad gaps so a sorted
// multi-select drop lays clips out end-to-end on the Kdenlive timeline.
// When `template` is set (KdenSubs' core feature), titles are cloned from
// a .kdenlivetitle you designed in Kdenlive — font, size, color, position
// all come from the template; only text/duration are patched.
export function buildKdenliveTitles(
  segments: TranscriptSegment[],
  opts: {
    fps: number
    width?: number
    height?: number
    fontColor?: string
    outlineColor?: string
    outlineWidth?: number
    shadow?: boolean
    template?: string
  },
): TitleFile[] {
  const {
    fps,
    width = 1920,
    height = 1080,
    fontColor = '#ffffff',
    outlineColor = '#000000',
    outlineWidth = 2,
    shadow = false,
    template,
  } = opts
  // Kdenlive shadowInfo order: enabled;color;blur;x;y (titlewidget.cpp)
  const shadowAttr = `${shadow ? 1 : 0};#ff000000;3;2;2`
  const files: TitleFile[] = []
  const pad = String(segments.length * 2).length
  const fontSize = Math.round(height / 18)
  const boxHeight = Math.round(fontSize * 1.2)
  const y = height - Math.round(fontSize * 1.6)
  const kFontColor = hexToKdenlive(fontColor)
  const kOutlineColor = hexToKdenlive(outlineColor)
  const kOutlineWidth = Math.max(0, Math.round(outlineWidth))
  const tplWidth = template ? Number(template.match(/\bwidth="(\d+)"/)?.[1]) || width : width
  let prevEndFrame = 0
  let n = 1

  for (const seg of segments) {
    const startFrame = Math.round(seg.start * fps)
    const endFrame = Math.round(seg.end * fps)
    const blankFrames = startFrame - prevEndFrame
    if (blankFrames > 0) {
      files.push({
        name: `${String(n).padStart(pad, '0')}_.kdenlivetitle`,
        content: template
          ? blankFromTemplate(template, blankFrames, width, height)
          : blankTitle(blankFrames, width, height),
      })
      n++
    }
    const frames = Math.max(1, endFrame - startFrame)
    const segFontColor = seg.color ? hexToKdenlive(seg.color) : kFontColor
    files.push({
      name: `${String(n).padStart(pad, '0')}.kdenlivetitle`,
      content: template
        ? textFromTemplate(template, seg.text, frames, tplWidth, height)
        : textTitle(
            escapeXml(seg.text),
            frames,
            width,
            height,
            fontSize,
            boxHeight,
            y,
            segFontColor,
            kOutlineColor,
            kOutlineWidth,
            shadowAttr,
          ),
    })
    n++
    prevEndFrame = endFrame
  }

  return files
}

// KdenSubs template clone: patch duration/out + content, force centered
// full-width text box; blanks drop the <item> children entirely.
function setDuration(tpl: string, frames: number): string {
  return tpl
    .replace(/duration="[^"]*"/, `duration="${frames}"`)
    .replace(/\bout="[^"]*"/, `out="${frames}"`)
}

function blankFromTemplate(tpl: string, frames: number, width: number, height: number): string {
  return setDuration(tpl.replace(/<item\b[\s\S]*?<\/item>\s*/g, ''), frames)
    .replace(/\bwidth="\d+"/, `width="${width}"`)
    .replace(/\bheight="\d+"/, `height="${height}"`)
}

function textFromTemplate(tpl: string, text: string, frames: number, width: number, height: number): string {
  const body = escapeXml(text).replace(/\r/g, '').replace(/\n/g, '\\n')
  return setDuration(tpl, frames)
    .replace(/\bwidth="\d+"/, `width="${width}"`)
    .replace(/\bheight="\d+"/, `height="${height}"`)
    .replace(/<position x="[^"]*"/, '<position x="0"')
    .replace(/alignment="[^"]*"/, 'alignment="4"')
    .replace(/box-width="[^"]*"/, `box-width="${width}"`)
    .replace(/(<content\b[^>]*>)[\s\S]*?(<\/content>)/, `$1${body}$2`)
}

function blankTitle(frames: number, width: number, height: number): string {
  return `<kdenlivetitle LC_NUMERIC="C" duration="${frames}" height="${height}" out="${frames}" width="${width}">
 <startviewport rect="0,0,${width},${height}"/>
 <endviewport rect="0,0,${width},${height}"/>
 <background color="0,0,0,0"/>
</kdenlivetitle>
`
}

function textTitle(
  text: string,
  frames: number,
  width: number,
  height: number,
  fontSize: number,
  boxHeight: number,
  y: number,
  kFontColor: string,
  kOutlineColor: string,
  outlineWidth: number,
  shadowAttr: string,
): string {
  return `<kdenlivetitle LC_NUMERIC="C" duration="${frames}" height="${height}" out="${frames}" width="${width}">
 <item type="QGraphicsTextItem" z-index="0">
  <position x="0" y="${y}">
   <transform>1,0,0,0,1,0,0,0,1</transform>
  </position>
  <content alignment="4" box-height="${boxHeight}" box-width="${width}" font="Arial" font-color="${kFontColor}" font-italic="0" font-outline="${outlineWidth}" font-outline-color="${kOutlineColor}" font-pixel-size="${fontSize}" font-underline="0" font-weight="700" letter-spacing="0" line-spacing="0" shadow="${shadowAttr}" typewriter="0;2;1;0;0">${text}</content>
 </item>
 <startviewport rect="0,0,${width},${height}"/>
 <endviewport rect="0,0,${width},${height}"/>
 <background color="0,0,0,0"/>
</kdenlivetitle>
`
}
