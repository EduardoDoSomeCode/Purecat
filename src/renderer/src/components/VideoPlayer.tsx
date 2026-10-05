import { useRef, useState, useEffect } from 'react'
import { useStore } from '../store'
import { activeWordIndex, spokenWordCount, subtitleChunk } from '../karaoke'

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function VideoPlayer() {
  const videoPath = useStore((s) => s.videoPath)
  const setDuration = useStore((s) => s.setDuration)
  const setVideoEl = useStore((s) => s.setVideoEl)
  const cuts = useStore((s) => s.cuts)
  const transcript = useStore((s) => s.transcript)
  const subtitleEffect = useStore((s) => s.subtitleEffect)
  const subtitleColor = useStore((s) => s.subtitleColor)
  const subtitleHighlightColor = useStore((s) => s.subtitleHighlightColor)
  const subtitleOutline = useStore((s) => s.subtitleOutline)
  const subtitleOutlineColor = useStore((s) => s.subtitleOutlineColor)
  const subtitleOutlineWidth = useStore((s) => s.subtitleOutlineWidth)
  const subtitlePosition = useStore((s) => s.subtitlePosition)
  const subtitleAlign = useStore((s) => s.subtitleAlign)
  const subtitleCustomX = useStore((s) => s.subtitleCustomX)
  const subtitleCustomY = useStore((s) => s.subtitleCustomY)
  const setSubtitleCustomPos = useStore((s) => s.setSubtitleCustomPos)
  const subtitleFontSize = useStore((s) => s.subtitleFontSize)
  const subtitleLineHeight = useStore((s) => s.subtitleLineHeight)
  const subtitleMaxWidth = useStore((s) => s.subtitleMaxWidth)
  const showWordCounter = useStore((s) => s.showWordCounter)
  const subtitleUppercase = useStore((s) => s.subtitleUppercase)
  const subtitleWordsPerChunk = useStore((s) => s.subtitleWordsPerChunk)
  const subtitleBackground = useStore((s) => s.subtitleBackground)
  const subtitleShadow = useStore((s) => s.subtitleShadow)
  const subtitleHighlight = useStore((s) => s.subtitleHighlight)
  const words = useStore((s) => s.words)
  const videoRef = useRef<HTMLVideoElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setLocalDuration] = useState(0)
  const [skipSilence, setSkipSilence] = useState(false)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const silences = cuts.filter((c) => c.isSilence)
  const activeSubtitle = transcript.find((seg) => current >= seg.start && current < seg.end)
  const wordIdx = activeSubtitle ? activeWordIndex(activeSubtitle, words, current) : -1
  const textWords = activeSubtitle ? activeSubtitle.text.split(/\s+/) : []
  const chunk = activeSubtitle
    ? subtitleChunk(activeSubtitle, textWords.length, current, subtitleWordsPerChunk)
    : { start: 0, count: 0, total: 1 }
  const chunkWords = textWords.slice(chunk.start, chunk.start + chunk.count)
  const totalWords = textWords.length
  const spoken = activeSubtitle ? Math.min(spokenWordCount(activeSubtitle, words, current), totalWords) : 0
  const hasWordData = activeSubtitle
    ? words.some((w) => w.start >= activeSubtitle.start - 0.05 && w.start < activeSubtitle.end)
    : false
  const isCustomPos = subtitleCustomX != null && subtitleCustomY != null
  const effectClass =
    subtitleEffect === 'fade'
      ? 'sub-fade'
      : subtitleEffect === 'pop'
        ? 'sub-pop'
        : subtitleEffect === 'squash'
          ? 'sub-squash'
          : ''

  useEffect(() => {
    setPlaying(false)
    setCurrent(0)
    setLocalDuration(0)
    setSkipSilence(false)
  }, [videoPath])

  useEffect(() => {
    setVideoEl(videoRef.current)
    return () => setVideoEl(null)
  }, [videoPath, setVideoEl])

  useEffect(() => {
    const v = videoRef.current
    if (v) {
      v.volume = volume
      v.muted = muted
    }
  }, [volume, muted, videoPath])

  if (!videoPath) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-900 min-w-0">
        <div className="text-center text-dark-500">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-lg">No video loaded</p>
          <p className="text-sm mt-1">Click "Load Video" on the left to get started</p>
        </div>
      </div>
    )
  }

  const src = `media://local/?path=${encodeURIComponent(videoPath)}`

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) void v.play()
    else v.pause()
  }

  const handleTimeUpdate = (v: HTMLVideoElement) => {
    const t = v.currentTime
    if (skipSilence && !v.paused) {
      const hit = silences.find((s) => t >= s.start && t < s.end - 0.02)
      if (hit) {
        const jump = Math.min(hit.end + 0.01, duration || hit.end + 0.01)
        v.currentTime = jump
        setCurrent(jump)
        return
      }
    }
    setCurrent(t)
  }

  // drag the subtitle anywhere over the preview; first move locks custom pos
  const startSubtitleDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const area = areaRef.current
    const inner = e.currentTarget
    const outer = inner.parentElement
    if (!area || !outer) return
    e.preventDefault()
    const areaRect = area.getBoundingClientRect()
    const innerRect = inner.getBoundingClientRect()
    const grabX = e.clientX - innerRect.left
    const grabY = e.clientY - innerRect.top
    const onMove = (ev: PointerEvent) => {
      const x = Math.round(ev.clientX - areaRect.left - grabX)
      const y = Math.round(ev.clientY - areaRect.top - grabY)
      setSubtitleCustomPos(Math.max(0, Math.min(x, areaRect.width)), Math.max(0, Math.min(y, areaRect.height)))
    }
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-dark-950">
      <div ref={areaRef} className="flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden relative">
        <video
          ref={videoRef}
          src={src}
          className="max-h-full max-w-full"
          onClick={toggle}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration
            if (Number.isFinite(d)) {
              setLocalDuration(d)
              setDuration(d)
            }
          }}
          onTimeUpdate={(e) => handleTimeUpdate(e.currentTarget)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        {activeSubtitle && (
          <div
            className={
              isCustomPos ? 'absolute flex pointer-events-none' : 'absolute left-0 right-0 flex px-4 pointer-events-none'
            }
            style={
              isCustomPos
                ? { left: subtitleCustomX!, top: subtitleCustomY! }
                : {
                    justifyContent:
                      subtitleAlign === 'left' ? 'flex-start' : subtitleAlign === 'right' ? 'flex-end' : 'center',
                    ...(subtitlePosition === 'center'
                      ? { top: 0, bottom: 0, alignItems: 'center' }
                      : subtitlePosition === 'top'
                        ? { top: 12 }
                        : { bottom: 12 }),
                  }
            }
          >
            <div
              key={`${activeSubtitle.id}-${subtitleEffect}-${subtitlePosition}-${subtitleAlign}-${chunk.start}`}
              className={`flex flex-col gap-1 ${effectClass} cursor-move pointer-events-auto`}
              style={{
                alignItems:
                  subtitleAlign === 'left' ? 'flex-start' : subtitleAlign === 'right' ? 'flex-end' : 'center',
              }}
              onPointerDown={startSubtitleDrag}
              title="Drag to reposition subtitle"
            >
              {showWordCounter && hasWordData && (
                <span className="word-counter">{spoken}/{totalWords}</span>
              )}
              <span
                className="subtitle-text"
                style={{
                  color: activeSubtitle.color ?? subtitleColor,
                  WebkitTextStroke:
                    subtitleOutline && subtitleOutlineWidth > 0
                      ? `${subtitleOutlineWidth}px ${subtitleOutlineColor}`
                      : undefined,
                  fontSize: `${subtitleFontSize}px`,
                  lineHeight: subtitleLineHeight,
                  maxWidth: `${subtitleMaxWidth}%`,
                  textTransform: subtitleUppercase ? 'uppercase' : undefined,
                  background: subtitleBackground ? undefined : 'transparent',
                  boxShadow: subtitleShadow ? undefined : 'none',
                }}
              >
                {chunkWords.map((w, i) => {
                  const globalIdx = chunk.start + i
                  return (
                    <span
                      key={globalIdx}
                      style={
                        globalIdx === wordIdx && subtitleHighlight
                          ? { color: subtitleHighlightColor }
                          : undefined
                      }
                    >
                      {w}
                      {i < chunkWords.length - 1 ? ' ' : ''}
                    </span>
                  )
                })}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="flex-none h-12 flex items-center gap-3 px-4 bg-dark-900">
        <button
          onClick={toggle}
          className="btn-primary w-9 h-9 p-0 flex items-center justify-center rounded-full"
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <span className="text-xs font-mono text-dark-400 w-14 text-right">{formatTime(current)}</span>
        <input
          type="range"
          className="slider flex-1"
          min={0}
          max={duration || 1}
          step={0.01}
          value={Math.min(current, duration || 1)}
          onChange={(e) => {
            const v = videoRef.current
            if (!v) return
            v.currentTime = Number(e.target.value)
            setCurrent(Number(e.target.value))
          }}
        />
        <span className="text-xs font-mono text-dark-400 w-14">{formatTime(duration)}</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMuted((m) => !m)}
            className="btn-ghost p-1.5"
            title={muted || volume === 0 ? 'Unmute' : 'Mute'}
          >
            {muted || volume === 0 ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path fillRule="evenodd" d="M16.293 9.293a1 1 0 011.414 1.414L15.414 13l2.293 2.293a1 1 0 01-1.414 1.414L14 14.414l-2.293 2.293a1 1 0 01-1.414-1.414L12.586 13l-2.293-2.293a1 1 0 011.414-1.414L14 11.586l2.293-2.293z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <div className="w-16">
            <input
              type="range"
              className="slider"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = Number(e.target.value)
                setVolume(v)
                if (v > 0) setMuted(false)
              }}
              title={`Volume ${Math.round((muted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>
        <button
          onClick={() => setSkipSilence((s) => !s)}
          disabled={silences.length === 0}
          className={`${skipSilence ? 'btn-primary' : 'btn-secondary'} h-9 px-2.5 text-xs flex items-center gap-1.5`}
          title={
            silences.length
              ? skipSilence
                ? 'Silence skipping is on — playing through cuts only'
                : 'Jump over detected silent parts while playing'
              : 'Run "Detect Silences" first'
          }
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
          </svg>
          Skip silence
          {silences.length > 0 && (
            <span className={`w-1.5 h-1.5 rounded-full ${skipSilence ? 'bg-white' : 'bg-dark-500'}`} />
          )}
        </button>
      </div>
    </div>
  )
}
