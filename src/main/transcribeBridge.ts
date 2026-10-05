import { execFile } from 'child_process'
import { join } from 'path'

export function runTranscribe(
  pythonExec: string,
  inputPath: string,
  outputPath: string,
  modelSize: string,
  language: string
): Promise<string> {
  const scriptPath = join(pythonExec, '..', 'transcribe.py')

  const args = [scriptPath, inputPath, outputPath, modelSize, language]

  return new Promise((resolve, reject) => {
    execFile(pythonExec, args, { timeout: 600000 }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message)
        return
      }
      resolve(stdout)
    })
  })
}