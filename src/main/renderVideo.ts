import { spawn } from 'child_process'
import { mkdtemp, writeFile, rm, copyFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { runAutoEditor } from './autoEditorBridge.js'

export interface RenderVideoOptions {
  videoPath: string
  cuts: Array<{ start: number; end: number }>
  /** ASS subtitle file content to burn in; null = no subtitles */
  ass: string | null
  outputPath: string
}

function ffmpeg(args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', args, { cwd })
    let err = ''
    ff.stderr.on('data', (d) => {
      err += d
    })
    ff.on('error', (e) => reject(`ffmpeg not found in PATH: ${e.message}`))
    ff.on('close', (code) => {
      if (code === 0) resolve()
      else reject(err.split('\n').slice(-8).join('\n') || `ffmpeg exited with code ${code}`)
    })
  })
}

export async function renderVideo(
  pythonExec: string,
  options: RenderVideoOptions,
): Promise<string> {
  const tmp = await mkdtemp(join(tmpdir(), 'purecat-'))
  try {
    let source = options.videoPath
    if (options.cuts.length) {
      const cutPath = join(tmp, 'cut.mp4')
      await runAutoEditor(pythonExec, options.videoPath, {
        threshold: '',
        margin: '',
        exportFormat: 'default',
        outputPath: cutPath,
        cuts: options.cuts,
      })
      source = cutPath
    }

    if (options.ass) {
      await writeFile(join(tmp, 'subs.ass'), options.ass, 'utf-8')
      await ffmpeg(
        [
          '-y',
          '-i', source,
          '-vf', 'ass=subs.ass',
          '-c:v', 'libx264',
          '-preset', 'medium',
          '-crf', '18',
          '-c:a', 'copy',
          options.outputPath,
        ],
        tmp,
      )
    } else {
      await copyFile(source, options.outputPath)
    }
    return options.outputPath
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}
