const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { mkdtempSync, rmSync, statSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { renderVideo } = require('../main/renderVideo.js')

const ASS = `[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,60,&H00FFFFFF,&H0000FFFF,&H00000000,&H8C000000,0,0,0,0,100,100,0,0,3,8,0,2,60,60,40,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.20,0:00:01.50,Default,,0,0,0,,{\\fad(500,0)}check
`

function probeDuration(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
    encoding: 'utf8',
  })
  return Number(out.trim())
}

async function main() {
  const dir = mkdtempSync(join(tmpdir(), 'purecat-check-render-'))
  try {
    const input = join(dir, 'in.mp4')
    execFileSync('ffmpeg', [
      '-y', '-v', 'error',
      '-f', 'lavfi', '-i', 'testsrc=duration=4:size=320x240:rate=15',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
      input,
    ])
    const pythonExec = join(__dirname, '..', 'python_env', 'bin', 'python')

    // cut 1s-2s out of a 4s clip → ~3s
    const cutOnly = join(dir, 'cut.mp4')
    await renderVideo(pythonExec, { videoPath: input, cuts: [{ start: 1, end: 2 }], ass: null, outputPath: cutOnly })
    const d1 = probeDuration(cutOnly)
    assert.ok(Math.abs(d1 - 3) < 0.3, `cut-only duration ${d1}, expected ~3`)

    // same cut with subtitles burned in
    const burnt = join(dir, 'burnt.mp4')
    await renderVideo(pythonExec, { videoPath: input, cuts: [{ start: 1, end: 2 }], ass: ASS, outputPath: burnt })
    const d2 = probeDuration(burnt)
    assert.ok(Math.abs(d2 - 3) < 0.3, `burnt duration ${d2}, expected ~3`)
    assert.ok(statSync(burnt).size > 10000, 'burnt output has content')

    // no cuts + no ass → straight copy of source duration
    const copy = join(dir, 'copy.mp4')
    await renderVideo(pythonExec, { videoPath: input, cuts: [], ass: null, outputPath: copy })
    const d3 = probeDuration(copy)
    assert.ok(Math.abs(d3 - 4) < 0.3, `copy duration ${d3}, expected ~4`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  console.log('render checks passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
