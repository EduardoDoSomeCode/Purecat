const assert = require('node:assert/strict')
const { computePeaks } = require('../main/audioPeaks.js')

async function main() {
  // t1.wav: 1s tone + 1s silence + 1s tone
  const peaks = await computePeaks('/tmp/opencode/t1.wav', 3, 30)
  assert.ok(peaks.length === 30)
  assert.ok(peaks[0] > 0.1, `loud start expected, got ${peaks[0]}`)
  assert.ok(peaks[15] < 0.01, `silent middle expected, got ${peaks[15]}`)
  assert.ok(peaks[25] > 0.1, `loud end expected, got ${peaks[25]}`)
  assert.ok(peaks.every((p) => p >= 0 && p <= 1))

  await assert.rejects(() => computePeaks('/tmp/definitely-missing.wav', 1, 10))
  console.log('peaks checks passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
