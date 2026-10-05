import { execFile } from 'child_process'
import { join } from 'path'

export interface AutoEditorOptions {
  threshold: string
  margin: string
  exportFormat: string
  outputPath: string
  /** explicit ranges to remove (seconds); when present, threshold/margin detection is skipped */
  cuts?: Array<{ start: number; end: number }>
}

export function runAutoEditor(
  pythonExec: string,
  inputPath: string,
  options: AutoEditorOptions
): Promise<string> {
  const autoEditorPath = join(
    pythonExec,
    '..',
    process.platform === 'win32' ? 'auto-editor.exe' : 'auto-editor'
  )

  const args = [inputPath]
  const cuts = (options.cuts ?? []).filter((c) => c.end > c.start)
  if (cuts.length) {
    args.push('--edit', 'none')
    for (const c of cuts) args.push('--cut-out', `${c.start}sec,${c.end}sec`)
  } else {
    args.push('--edit', `audio:${options.threshold}`, '--margin', options.margin)
  }
  args.push('--export', options.exportFormat, '--output', options.outputPath, '--no-open')

  return new Promise((resolve, reject) => {
    execFile(autoEditorPath, args, { timeout: 600000 }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message)
        return
      }
      resolve(stdout)
    })
  })
}
