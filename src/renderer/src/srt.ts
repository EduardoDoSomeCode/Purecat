import type { TranscriptSegment } from './types'

function parseSrtTime(value: string): number {
  const m = value.trim().match(/^(\d+):(\d+):(\d+)[,.](\d+)$/)
  if (!m) return 0
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4].padEnd(3, '0').slice(0, 3)) / 1000
}

export function parseSRT(text: string): TranscriptSegment[] {
  const blocks = text.replace(/\r/g, '').trim().split(/\n{2,}/)
  const segments: TranscriptSegment[] = []

  for (const block of blocks) {
    const lines = block.split('\n')
    const timingIdx = lines.findIndex((l) => l.includes('-->'))
    if (timingIdx === -1) continue

    const [startRaw, endRaw] = lines[timingIdx].split('-->')
    const start = parseSrtTime(startRaw ?? '')
    const end = parseSrtTime(endRaw ?? '')
    const content = lines.slice(timingIdx + 1).join(' ').trim()
    if (end <= start) continue

    segments.push({ id: segments.length + 1, start, end, text: content })
  }

  return segments
}

export function toSRT(segments: TranscriptSegment[]): string {
  const two = (n: number) => n.toString().padStart(2, '0')
  const three = (n: number) => n.toString().padStart(3, '0')
  const stamp = (sec: number) => {
    const ms = Math.max(0, Math.round(sec * 1000))
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${two(h)}:${two(m)}:${two(s)},${three(ms % 1000)}`
  }
  return (
    segments
      .map((seg, i) => `${i + 1}\n${stamp(seg.start)} --> ${stamp(seg.end)}\n${seg.text}\n`)
      .join('\n') + '\n'
  )
}
