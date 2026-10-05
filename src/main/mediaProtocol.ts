import { extname } from 'path'
import { stat } from 'fs/promises'
import { createReadStream } from 'fs'
import { Readable } from 'stream'

const MEDIA_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mov': 'video/quicktime',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
}

// Range-aware file handler: Chromium needs Accept-Ranges/206 for seeking
export async function handleMedia(request: Request): Promise<Response> {
  const filePath = new URL(request.url).searchParams.get('path')
  if (!filePath) return new Response('Missing path', { status: 400 })

  let size: number
  try {
    size = (await stat(filePath)).size
  } catch {
    return new Response('Not found', { status: 404 })
  }

  const headers: Record<string, string> = {
    'Accept-Ranges': 'bytes',
    'Content-Type': MEDIA_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  }

  const range = request.headers.get('range')
  const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null
  if (m && (m[1] || m[2])) {
    let start: number
    let end: number
    if (m[1]) {
      start = Number(m[1])
      end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
    } else {
      start = Math.max(0, size - Number(m[2]))
      end = size - 1
    }
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    }
    return new Response(Readable.toWeb(createReadStream(filePath, { start, end })) as ReadableStream, {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(end - start + 1),
      },
    })
  }

  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers: { ...headers, 'Content-Length': String(size) } })
  }
  return new Response(Readable.toWeb(createReadStream(filePath)) as ReadableStream, {
    status: 200,
    headers: { ...headers, 'Content-Length': String(size) },
  })
}
