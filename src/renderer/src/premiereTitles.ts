import type { TranscriptSegment, SubtitleAlign, SubtitlePosition } from './types.ts'
import { PRTL_TEMPLATE } from './prtlTemplate.ts'
import { escapeXml } from './kdenlive.ts'

export interface OutputFile {
  name: string
  content: string
  encoding?: 'utf8' | 'utf16le'
}

export interface PremiereTitleOpts {
  fps: number
  width?: number
  height?: number
  fontSize: number
  fontColor: string
  align: SubtitleAlign
  position: SubtitlePosition
  uppercase: boolean
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(m)) return [255, 255, 255]
  const n = parseInt(m, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function measureWidth(text: string, fontSize: number): number {
  if (typeof document !== 'undefined') {
    const ctx = document.createElement('canvas').getContext('2d')
    if (ctx) {
      ctx.font = `${fontSize}px Arial`
      return ctx.measureText(text).width
    }
  }
  // plain-node check fallback: Arial average advance ≈ 0.55em
  return text.length * fontSize * 0.55
}

// One Premiere legacy title (.prtl, UTF-16LE no BOM) per segment.
// Template proven by pyahmed/sub2xml: text, run count, geometry, fill color,
// font size are patched; the template's built-in letter shadow stays intact.
export function buildPremiereTitles(segments: TranscriptSegment[], opts: PremiereTitleOpts): OutputFile[] {
  const { fps, width = 1920, height = 1080, fontSize, fontColor, align, position, uppercase } = opts
  void fps
  return segments.map((seg, i) => {
    const text = uppercase ? seg.text.toUpperCase() : seg.text
    const [r, g, b] = hexToRgb(seg.color ?? fontColor)
    const measured = Math.max(measureWidth(text, fontSize), fontSize)
    const boxW = Math.min(Math.round(measured * 1.1), width - 80)
    const boxX =
      align === 'left' ? 60 : align === 'right' ? width - boxW - 60 : Math.round((width - boxW) / 2)
    const boxY =
      position === 'top'
        ? Math.round(height * 0.06)
        : position === 'center'
          ? Math.round(height * 0.45)
          : Math.round(height - fontSize * 3.2)
    const startX =
      align === 'left'
        ? boxX + 8
        : align === 'right'
          ? Math.round(boxX + boxW - measured - 8)
          : Math.round(boxX + (boxW - measured) / 2)

    let t = PRTL_TEMPLATE
    t = t.replace('<TRString>First line</TRString>', `<TRString>${escapeXml(text)}</TRString>`)
    t = t.replace(/RunCount="\d+"/, `RunCount="${[...text].length}"`)
    t = t.replace('<Alignment>center</Alignment>', `<Alignment>${align}</Alignment>`)
    t = t.replace(/<txWidth>\d+<\/txWidth>/, `<txWidth>${fontSize}</txWidth>`)
    t = t.replace(/<txHeight>\d+<\/txHeight>/, `<txHeight>${fontSize}</txHeight>`)
    t = t.replace(/<gCrsrX>[^<]+<\/gCrsrX>/, `<gCrsrX>${boxX}</gCrsrX>`)
    t = t.replace(/<gSizeX>[^<]+<\/gSizeX>/, `<gSizeX>${boxW}</gSizeX>`)
    t = t.replace(/<gSizeY>[^<]+<\/gSizeY>/, `<gSizeY>${Math.round(fontSize * 1.74)}</gSizeY>`)
    t = t.replace(/<txBase>[^<]+<\/txBase>/, `<txBase>${Math.round((boxY + fontSize * 0.76) * 1000) / 1000}</txBase>`)
    t = t.replace(/<XPos>[^<]+<\/XPos>/, `<XPos>${startX}</XPos>`)
    t = t.replace(
      /<Position><x>[^<]+<\/x><y>[^<]+<\/y><\/Position>/,
      `<Position><x>${boxX}</x><y>${boxY}</y></Position>`,
    )
    t = t.replace(/<Size><x>[^<]+<\/x><y>[^<]+<\/y><\/Size>/, `<Size><x>${boxW}</x><y>${Math.round(fontSize * 2)}</y></Size>`)
    // recolor near-white fills (letters + any box fill); black shadow specs untouched
    t = t.replace(/<ColorSpec index="4">([\s\S]*?)<\/ColorSpec>/g, (m, inner: string) => {
      const rr = Number(inner.match(/<red>(\d+)<\/red>/)?.[1] ?? 0)
      const gg = Number(inner.match(/<green>(\d+)<\/green>/)?.[1] ?? 0)
      const bb = Number(inner.match(/<blue>(\d+)<\/blue>/)?.[1] ?? 0)
      if (rr >= 250 && gg >= 250 && bb >= 250) {
        return `<ColorSpec index="4"><red>${r}</red><green>${g}</green><blue>${b}</blue><xpar>0</xpar></ColorSpec>`
      }
      return m
    })
    return { name: `sub_${String(i).padStart(6, '0')}.prtl`, content: t, encoding: 'utf16le' as const }
  })
}

// FCP7/xmeml sequence with one clipitem per title, pre-placed on the timeline.
// Import this XML into Premiere and the titles land at their subtitle times.
export function buildPremiereTitlesXml(
  segments: TranscriptSegment[],
  names: string[],
  opts: { fps: number; width?: number; height?: number; titlesDir: string },
): string {
  const { fps, width = 1920, height = 1080, titlesDir } = opts
  const dirUrl = `file://${titlesDir.replace(/\\/g, '/')}`
  const clips = segments
    .map((seg, i) => {
      const start = Math.round(seg.start * fps)
      const end = Math.max(start + 1, Math.round(seg.end * fps))
      const fileUrl = `${dirUrl}/${names[i]}`
      return `          <clipitem id="clipitem-${i}" frameBlend="FALSE">
            <name>${names[i]}</name>
            <duration>${end}</duration>
            <start>${start}</start>
            <end>${end}</end>
            <in>${start}</in>
            <out>${end}</out>
            <pixelaspectratio>square</pixelaspectratio>
            <anamorphic>FALSE</anamorphic>
            <file id="file-${i}">
              <pathurl>${escapeXml(fileUrl)}</pathurl>
              <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
              <media>
                <video>
                  <duration>${end}</duration>
                  <samplecharacteristics>
                    <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
                    <width>${width}</width>
                    <height>${height}</height>
                    <anamorphic>FALSE</anamorphic>
                    <pixelaspectratio>square</pixelaspectratio>
                    <fielddominance>none</fielddominance>
                  </samplecharacteristics>
                </video>
              </media>
            </file>
          </clipitem>`
    })
    .join('\n')
  const duration = segments.length ? Math.round(segments[segments.length - 1].end * fps) : 0
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <project>
    <name>titles</name>
    <children>
      <sequence id="titles-sequence">
        <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
        <name>titles</name>
        <duration>${duration}</duration>
        <media>
          <video>
            <format>
              <samplecharacteristics>
                <rate><timebase>${fps}</timebase><ntsc>FALSE</ntsc></rate>
                <width>${width}</width>
                <height>${height}</height>
                <anamorphic>FALSE</anamorphic>
                <pixelaspectratio>square</pixelaspectratio>
                <fielddominance>upper</fielddominance>
              </samplecharacteristics>
            </format>
            <track MZ.TrackName="Titles" premiereTrackType="Video">
              <enabled>TRUE</enabled>
              <locked>FALSE</locked>
${clips}
            </track>
          </video>
        </media>
      </sequence>
    </children>
  </project>
</xmeml>
`
}
