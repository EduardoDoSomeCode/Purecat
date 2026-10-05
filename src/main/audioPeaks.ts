import { spawn } from 'child_process'

const PEAK_RATE = 8000

export function computePeaks(inputPath: string, duration: number, buckets: number): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const totalSamples = Math.max(1, Math.round(PEAK_RATE * duration))
    const peaks: number[] = new Array(buckets).fill(0)
    let sampleIdx = 0
    let pending: Buffer = Buffer.alloc(0)

    const ff = spawn('ffmpeg', ['-v', 'quiet', '-i', inputPath, '-ac', '1', '-ar', String(PEAK_RATE), '-f', 's16le', '-'])
    const timer = setTimeout(() => {
      ff.kill()
      reject(new Error('audio peaks timed out'))
    }, 120000)

    ff.stdout.on('data', (chunk: Buffer) => {
      const buf = pending.length ? Buffer.concat([pending, chunk]) : chunk
      const usable = buf.length - (buf.length % 2)
      for (let i = 0; i < usable; i += 2) {
        const v = Math.abs(buf.readInt16LE(i)) / 32768
        let b = Math.floor((sampleIdx * buckets) / totalSamples)
        if (b >= buckets) b = buckets - 1
        if (v > peaks[b]) peaks[b] = v
        sampleIdx++
      }
      pending = usable < buf.length ? Buffer.from(buf.subarray(usable)) : Buffer.alloc(0)
    })

    ff.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    ff.on('close', (code) => {
      clearTimeout(timer)
      if (sampleIdx > 0) resolve(peaks.map((p) => Math.min(1, p)))
      else reject(new Error(`ffmpeg exited with code ${code}`))
    })
  })
}
