import { useState } from 'react'
import type { TranscriptSegment } from '../types'
import { useStore } from '../store'
import { startColResize } from '../resize'

interface TranscriptEditorProps {
  transcript: TranscriptSegment[]
  onUpdate: (transcript: TranscriptSegment[]) => void
  disabled: boolean
}

export function TranscriptEditor({ transcript, onUpdate, disabled }: TranscriptEditorProps) {
  const globalColor = useStore((s) => s.subtitleColor)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editText, setEditText] = useState('')
  const [width, setWidth] = useState(380)
  const [collapsed, setCollapsed] = useState(false)

  const startResize = (e: React.MouseEvent) => {
    if (collapsed) return
    // panel sits on the right — drag its left edge leftwards to widen
    startColResize(e, () => width, setWidth, {
      min: 260,
      max: Math.max(400, window.innerWidth - 560),
      invert: true,
    })
  }

  const handleDoubleClick = (seg: TranscriptSegment) => {
    if (disabled) return
    setEditingId(seg.id)
    setEditText(seg.text)
  }

  const handleSave = (id: number) => {
    onUpdate(transcript.map((s) => (s.id === id ? { ...s, text: editText } : s)))
    setEditingId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave(id)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  const setSegColor = (id: number, color: string | undefined) => {
    onUpdate(transcript.map((s) => (s.id === id ? { ...s, color } : s)))
  }

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }

  return (
    <div
      className="flex-none h-full flex flex-col bg-dark-900 border-l border-dark-700 overflow-hidden relative"
      style={{ width: collapsed ? 44 : width }}
    >
      {!collapsed && (
        <div
          className="w-1.5 flex-none absolute inset-y-0 left-0 cursor-col-resize hover:bg-primary-500/40 transition-colors"
          onMouseDown={startResize}
          title="Drag to resize"
        />
      )}
      <div
        className={`h-10 px-2 bg-dark-900/50 border-b border-dark-700 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} flex-none`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-6 h-6 flex-none flex items-center justify-center rounded hover:bg-dark-700 text-dark-400 hover:text-white"
            title={collapsed ? 'Expand transcript' : 'Collapse transcript'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
          {!collapsed && <h3 className="font-medium text-white truncate">Transcript Editor</h3>}
        </div>
        {!collapsed && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-dark-500 hidden xl:inline">Double-click text to edit</span>
            <span className="text-xs text-dark-500">{transcript.length} segments</span>
          </div>
        )}
      </div>

      {collapsed ? null : !transcript.length ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-dark-500 px-8">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-lg">No transcript yet</p>
            <p className="text-sm mt-1">Run transcription to generate subtitles</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto scrollbar-panel p-4 space-y-2">
          {transcript.map((seg) => (
            <div
              key={seg.id}
              className="group bg-dark-800/50 border border-dark-700 rounded-lg p-3 transition-colors hover:border-dark-600"
              onDoubleClick={() => handleDoubleClick(seg)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-24 text-right text-xs text-dark-500 font-mono pt-1">
                  {formatTime(seg.start)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-dark-500 mb-1">
                    <span className="font-mono">{formatTime(seg.start)}</span>
                    <span className="text-dark-600">→</span>
                    <span className="font-mono">{formatTime(seg.end)}</span>
                    <span className="text-dark-600">({(seg.end - seg.start).toFixed(1)}s)</span>
                  </div>
                  {editingId === seg.id ? (
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => handleSave(seg.id)}
                      onKeyDown={(e) => handleKeyDown(e, seg.id)}
                      className="w-full bg-dark-900 border border-primary-500 rounded px-2 py-1 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                      rows={2}
                      autoFocus
                    />
                  ) : (
                    <p
                      className="text-white whitespace-pre-wrap break-words cursor-text transition-colors group-hover:text-primary-100"
                      title="Double-click to edit"
                      style={seg.color ? { color: seg.color } : undefined}
                    >
                      {seg.text || <span className="text-dark-500 italic">(empty)</span>}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <input
                    type="color"
                    value={seg.color ?? globalColor}
                    onChange={(e) => setSegColor(seg.id, e.target.value)}
                    disabled={disabled}
                    className="w-6 h-6 bg-transparent border border-dark-600 rounded cursor-pointer p-0"
                    title="Segment color (override)"
                  />
                  {seg.color && (
                    <button
                      onClick={() => setSegColor(seg.id, undefined)}
                      disabled={disabled}
                      className="btn-ghost p-1 text-dark-400 hover:text-white"
                      title="Reset to global color"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                  {editingId === seg.id ? (
                    <button
                      onClick={() => handleSave(seg.id)}
                      disabled={disabled}
                      className="btn-ghost p-1.5 text-dark-400 hover:text-white"
                      title="Save"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDoubleClick(seg)}
                      disabled={disabled}
                      className="btn-ghost p-1.5 text-dark-400 hover:text-white"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
