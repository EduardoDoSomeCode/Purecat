const assert = require('node:assert/strict')
const { handleMedia } = require('../main/mediaProtocol.js')

async function main() {
  const file = '/tmp/opencode/audio_test.mp4'
  const url = `media://local/?path=${encodeURIComponent(file)}`

  const full = await handleMedia(new Request(url))
  assert.equal(full.status, 200)
  assert.equal(full.headers.get('accept-ranges'), 'bytes')
  assert.equal(full.headers.get('content-type'), 'video/mp4')
  const size = Number(full.headers.get('content-length'))
  assert.ok(size > 0)
  assert.equal((await full.arrayBuffer()).byteLength, size)

  const part = await handleMedia(new Request(url, { headers: { Range: 'bytes=100-199' } }))
  assert.equal(part.status, 206)
  assert.equal(part.headers.get('content-range'), `bytes 100-199/${size}`)
  assert.equal((await part.arrayBuffer()).byteLength, 100)

  const suffix = await handleMedia(new Request(url, { headers: { Range: 'bytes=-50' } }))
  assert.equal(suffix.status, 206)
  assert.equal((await suffix.arrayBuffer()).byteLength, 50)

  const head = await handleMedia(new Request(url, { method: 'HEAD' }))
  assert.equal(head.status, 200)
  assert.equal(head.headers.get('content-length'), String(size))

  const bad = await handleMedia(new Request(url, { headers: { Range: 'bytes=999999999-' } }))
  assert.equal(bad.status, 416)

  const missing = await handleMedia(new Request(`media://local/?path=${encodeURIComponent('/tmp/nope.mp4')}`))
  assert.equal(missing.status, 404)

  const noPath = await handleMedia(new Request('media://local/'))
  assert.equal(noPath.status, 400)

  console.log('media checks passed')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
