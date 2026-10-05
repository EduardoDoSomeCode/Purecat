import { useRef, useEffect, useState, useCallback } from 'react'
import { useStore } from '../store'
import { api } from '../api'
import { dragCut, type DragMode, type DragState } from '../dragCut'

interface TimelineProps {
  duration: number
  cuts: Array<{ start: number; end: number; isSilence: boolean }>
  transcript: Array<{ id: number; start: number; end: number; text: string }>
  isProcessing: boolean
  processType: 'silence' | 'transcribe' | 'export' | null
  progress: number
}

const bucketCount = (d: number) => Math.min(4000, Math.max(200, Math.round(d * 10)))

export function Timeline({
  duration,
  cuts,
  transcript,
  isProcessing,
  processType,
  progress,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoPath = useStore((s) => s.videoPath)
  const [zoom, setZoom] = useState(1)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const ppsRef = useRef(100)
  const suppressClickRef = useRef(false)
  dragRef.current = drag
  const dragging = drag !== null

  useEffect(() => {
    if (!videoPath || !duration) {
      setPeaks(null)
      return
    }
    let stale = false
    setPeaks(null)
    api.audio
      .peaks(videoPath, duration, bucketCount(duration))
      .then((p) => {
        if (!stale) setPeaks(p)
      })
      .catch(() => {
        if (!stale) setPeaks([])
      })
    return () => {
      stale = true
    }
  }, [videoPath, duration])

  // px per second of video content; zoom scales linearly
  const pixelsPerSecond = containerRef.current
    ? (containerRef.current.clientWidth * zoom) / duration
    : 100 * zoom
  ppsRef.current = pixelsPerSecond

  const displayCuts = drag
    ? cuts.map((c, i) => (i === drag.i ? dragCut(c, drag, (drag.x - drag.x0) / pixelsPerSecond, duration) : c))
    : cuts

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d) return
      setDrag({ ...d, x: e.clientX, moved: d.moved || Math.abs(e.clientX - d.x0) > 3 })
    }
    const onUp = () => {
      const d = dragRef.current
      setDrag(null)
      if (d?.moved) {
        const store = useStore.getState()
        const next = [...store.cuts]
        if (next[d.i]) {
          next[d.i] = dragCut(next[d.i], d, (d.x - d.x0) / ppsRef.current, duration)
          store.setCuts(next)
        }
      }
      // let the click event (if any) fire first, then re-enable seek-on-click
      setTimeout(() => {
        suppressClickRef.current = false
      }, 0)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging, duration])

  const startDrag = (e: React.MouseEvent, i: number, mode: DragMode) => {
    e.preventDefault()
    e.stopPropagation()
    const c = displayCuts[i]
    if (!c) return
    suppressClickRef.current = true
    setDrag({ i, mode, x0: e.clientX, x: e.clientX, origStart: c.start, origEnd: c.end, moved: false })
  }

  const timeAtClientX = (clientX: number) => {
    const el = containerRef.current
    const rect = el?.getBoundingClientRect()
    if (!rect || !duration || !pixelsPerSecond) return 0
    const x = clientX - rect.left + el!.scrollLeft
    return Math.max(0, Math.min(x / pixelsPerSecond, duration))
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setZoom((prev) => Math.max(0.1, Math.min(100, prev * (e.deltaY > 0 ? 1.1 : 0.9))))
    }
    // plain pans use native horizontal scroll of the overflow container
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      setHoverTime(timeAtClientX(e.clientX))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duration, pixelsPerSecond],
  )

  const handleMouseLeave = useCallback(() => {
    setHoverTime(null)
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (suppressClickRef.current) return
      const v = useStore.getState().videoEl
      if (!v) return
      v.currentTime = timeAtClientX(e.clientX)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duration, pixelsPerSecond],
  )

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 100)
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }

  if (!duration) {
    return (
      <div className="h-full flex items-center justify-center bg-dark-900 border-b border-dark-700">
        <div className="text-center text-dark-500">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-lg">No video loaded</p>
          <p className="text-sm mt-1">Click "Load Video" to get started</p>
        </div>
      </div>
    )
  }

  const totalWidth = duration * pixelsPerSecond

  return (
    <div
      ref={containerRef}
      className="h-full relative bg-dark-900 border-b border-dark-700 overflow-auto scrollbar-thin"
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <div className="relative" style={{ width: totalWidth, minHeight: '100%' }}>
        <div className="absolute inset-0 flex items-end pointer-events-none" style={{ height: '120px' }}>
          {peaks &&
            (peaks.length ? peaks : new Array(bucketCount(duration)).fill(0)).map((p, i, arr) => {
              const bucketSec = duration / arr.length
              const t = i * bucketSec + bucketSec / 2
              const silence = displayCuts.some((c) => c.isSilence && t >= c.start && t < c.end)
              return (
                <div
                  key={i}
                  className={silence ? 'waveform-bar waveform-bar--silence' : 'waveform-bar'}
                  style={{
                    left: `${i * bucketSec * pixelsPerSecond}px`,
                    width: `${Math.max(1, bucketSec * pixelsPerSecond - 1)}px`,
                    height: `${Math.max(4, Math.min(110, p * 110))}px`,
                  }}
                />
              )
            })}
        </div>

        {displayCuts.map((cut, i) => (
          <div
            key={i}
            className={`cut-region ${drag?.i === i ? 'z-10 cursor-grabbing' : ''}`}
            style={{
              left: `${cut.start * pixelsPerSecond}px`,
              width: `${Math.max(2, (cut.end - cut.start) * pixelsPerSecond)}px`,
              backgroundColor: cut.isSilence ? 'rgba(239,68,68,0.15)' : undefined,
            }}
            title={
              cut.isSilence
                ? `Silence: ${formatTime(cut.start)} - ${formatTime(cut.end)} (${(cut.end - cut.start).toFixed(2)}s) — drag to move`
                : `Content: ${formatTime(cut.start)} - ${formatTime(cut.end)}`
            }
            onMouseDown={(e) => startDrag(e, i, 'move')}
          >
            <div
              className="absolute left-0 inset-y-0 w-2 bg-red-500/50 hover:bg-red-400 cursor-ew-resize"
              onMouseDown={(e) => startDrag(e, i, 'start')}
              title="Drag to adjust start"
            />
            <div
              className="absolute right-0 inset-y-0 w-2 bg-red-500/50 hover:bg-red-400 cursor-ew-resize"
              onMouseDown={(e) => startDrag(e, i, 'end')}
              title="Drag to adjust end"
            />
          </div>
        ))}

        {transcript.map((seg) => (
          <div
            key={seg.id}
            className="absolute top-2 bg-primary-600/30 border border-primary-500/50 rounded px-1 text-xs text-primary-300 pointer-events-none"
            style={{
              left: `${seg.start * pixelsPerSecond}px`,
              width: `${Math.max(30, (seg.end - seg.start) * pixelsPerSecond)}px`,
            }}
            title={`${formatTime(seg.start)} - ${formatTime(seg.end)}: ${seg.text}`}
          >
            {seg.text.slice(0, 20)}
          </div>
        ))}

        <div
          className="absolute top-0 bottom-0 w-px bg-primary-500/50 pointer-events-none"
          style={{ left: `${(duration / 2) * pixelsPerSecond}px` }}
        />

        {hoverTime !== null && (
          <div className="tooltip" style={{ left: `${hoverTime * pixelsPerSecond}px`, top: '8px', transform: 'translateX(-50%)' }}>
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-10 bg-dark-900/80 backdrop-blur-sm border-t border-dark-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4 text-sm text-dark-400">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
          <span>Duration: {formatTime(duration)}</span>
        </div>

        {isProcessing && processType && (
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-dark-700 rounded overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-dark-400 capitalize">
              {processType === 'export' ? 'rendering video…' : `${processType} detection...`}
            </span>
          </div>
        )}
      </div>

      <div className="absolute top-0 left-0 right-0 h-8 bg-dark-900/50 backdrop-blur-sm border-b border-dark-700 flex items-end px-4">
        {Array.from({ length: Math.ceil(duration / 10) }).map((_, i) => (
          <div
            key={i}
            className="absolute text-xs text-dark-500 transform -translate-x-1/2"
            style={{ left: `${i * 10 * pixelsPerSecond}px`, bottom: '2px' }}
          >
            {formatTime(i * 10)}
          </div>
        ))}
      </div>
    </div>
  )
}