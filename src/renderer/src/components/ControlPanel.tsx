import { useState } from 'react'
import { useStore } from '../store'
import { startColResize } from '../resize'
import { EXPORT_FORMATS, MODEL_SIZES, LANGUAGES, SUBTITLE_EFFECTS, SUBTITLE_POSITIONS, SUBTITLE_ALIGNS } from '../types'

interface ControlPanelProps {
  onLoadVideo: () => void
  onSilenceDetection: () => void
  onTranscription: () => void
  onExport: () => void
  hasVideo: boolean
  disabled: boolean
  isProcessing: boolean
  processType: 'silence' | 'transcribe' | 'export' | null
  progress: number
}

export function ControlPanel({
  onLoadVideo,
  onSilenceDetection,
  onTranscription,
  onExport,
  hasVideo,
  disabled,
  isProcessing,
  processType,
  progress,
}: ControlPanelProps) {
  const {
    threshold,
    margin,
    exportFormat,
    kdenliveFps,
    kdenliveTemplatePath,
    modelSize,
    language,
    subtitleEffect,
    subtitleColor,
    subtitleHighlightColor,
    subtitleOutline,
    subtitleOutlineColor,
    subtitleOutlineWidth,
    subtitlePosition,
    subtitleAlign,
    subtitleCustomX,
    subtitleFontSize,
    subtitleLineHeight,
    subtitleMaxWidth,
    showWordCounter,
    subtitleUppercase,
    subtitleWordsPerChunk,
    subtitleBackground,
    subtitleShadow,
    subtitleHighlight,
    transcript,
    setThreshold,
    setMargin,
    setExportFormat,
    setKdenliveFps,
    setKdenliveTemplatePath,
    setModelSize,
    setLanguage,
    setSubtitleEffect,
    setSubtitleColor,
    setSubtitleHighlightColor,
    setSubtitleOutline,
    setSubtitleOutlineColor,
    setSubtitleOutlineWidth,
    setSubtitlePosition,
    setSubtitleAlign,
    setSubtitleCustomPos,
    setSubtitleFontSize,
    setSubtitleLineHeight,
    setSubtitleMaxWidth,
    setShowWordCounter,
    setSubtitleUppercase,
    setSubtitleWordsPerChunk,
    setSubtitleBackground,
    setSubtitleShadow,
    setSubtitleHighlight,
  } = useStore()
  const [collapsed, setCollapsed] = useState(false)
  const [panelW, setPanelW] = useState(288)
  const thresholdDb = parseInt(threshold, 10)
  const marginSec = parseFloat(margin)

  if (collapsed) {
    return (
      <aside className="w-12 flex-none bg-dark-900/80 backdrop-blur-sm border-r border-dark-700 flex flex-col items-center pt-3 gap-4">
        <button
          onClick={() => setCollapsed(false)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-dark-700 text-dark-400 hover:text-white"
          title="Show controls"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
        <span className="text-xs text-dark-500 tracking-widest" style={{ writingMode: 'vertical-rl' }}>
          CONTROLS
        </span>
      </aside>
    )
  }

  return (
    <aside
      className="relative flex-none bg-dark-900/80 backdrop-blur-sm border-r border-dark-700 flex flex-col overflow-hidden"
      style={{ width: panelW }}
    >
      <div
        className="absolute inset-y-0 right-0 w-1.5 z-20 cursor-col-resize hover:bg-primary-500/40 transition-colors"
        onMouseDown={(e) => startColResize(e, () => panelW, setPanelW, { min: 240, max: 480 })}
        title="Drag to resize panel"
      />
      <div className="p-3 border-b border-dark-700 flex items-start gap-2">
        <div className="flex-1 space-y-2 min-w-0">
          <button
            onClick={onLoadVideo}
            disabled={hasVideo || isProcessing}
            className="btn-primary w-full justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Load Video
          </button>
          <p className="text-xs text-dark-500 truncate">
            {transcript.length > 0 ? `${transcript.length} subtitle segments` : 'No transcript yet'}
          </p>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="w-8 h-8 flex-none flex items-center justify-center rounded hover:bg-dark-700 text-dark-400 hover:text-white"
          title="Hide controls"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-panel p-4 space-y-6">
        <section>
          <h3 className="sticky top-0 z-10 bg-dark-900 text-xs font-medium text-dark-400 uppercase tracking-wider mb-3 py-1.5 -mx-4 px-4">Silence Detection</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1">
                Threshold <span className="text-primary-400 font-mono">{thresholdDb} dB</span>
              </label>
              <input
                type="range"
                className="slider"
                min={-40}
                max={0}
                step={1}
                value={thresholdDb}
                onChange={(e) => setThreshold(`${e.target.value}dB`)}
                disabled={disabled || isProcessing}
              />
              <p className="text-xs text-dark-500 mt-1">Quieter than this = silence. Lower cuts less.</p>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">
                Margin <span className="text-primary-400 font-mono">{marginSec.toFixed(2)}s</span>
              </label>
              <input
                type="range"
                className="slider"
                min={0}
                max={2}
                step={0.05}
                value={marginSec}
                onChange={(e) => setMargin(`${e.target.value}sec`)}
                disabled={disabled || isProcessing}
              />
              <p className="text-xs text-dark-500 mt-1">Padding kept around speech.</p>
            </div>
            <button
              onClick={onSilenceDetection}
              disabled={disabled || isProcessing}
              className="btn-primary w-full justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {isProcessing && processType === 'silence' ? (
                <>
                  <span>Detecting... {Math.round(progress)}%</span>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </>
              ) : (
                'Detect Silences'
              )}
            </button>
          </div>
        </section>

        <div className="border-t border-dark-700 pt-6" />

        <section>
          <h3 className="sticky top-0 z-10 bg-dark-900 text-xs font-medium text-dark-400 uppercase tracking-wider mb-3 py-1.5 -mx-4 px-4">Transcription</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Model Size</label>
              <select
                value={modelSize}
                onChange={(e) => setModelSize(e.target.value as typeof modelSize)}
                disabled={disabled || isProcessing}
                className="select"
              >
                {MODEL_SIZES.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
              <p className="text-xs text-dark-500 mt-1">Larger = more accurate, slower</p>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as typeof language)}
                disabled={disabled || isProcessing}
                className="select"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <p className="text-xs text-dark-500 mt-1">Whisper runs fully offline (EN / ES)</p>
            </div>
            <button
              onClick={onTranscription}
              disabled={disabled || isProcessing}
              className="btn-primary w-full justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {isProcessing && processType === 'transcribe' ? (
                <>
                  <span>Transcribing... {Math.round(progress)}%</span>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </>
              ) : (
                'Generate Transcript'
              )}
            </button>
          </div>
        </section>

        <div className="border-t border-dark-700 pt-6" />

        <section>
          <h3 className="sticky top-0 z-10 bg-dark-900 text-xs font-medium text-dark-400 uppercase tracking-wider mb-3 py-1.5 -mx-4 px-4">Subtitles</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Animation</label>
              <select
                value={subtitleEffect}
                onChange={(e) => setSubtitleEffect(e.target.value as typeof subtitleEffect)}
                className="select"
              >
                {SUBTITLE_EFFECTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <label className="flex items-center gap-2 text-xs text-dark-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showWordCounter}
                  onChange={(e) => setShowWordCounter(e.target.checked)}
                  className="accent-primary-600"
                />
                Word counter
              </label>
              <label className="flex items-center gap-2 text-xs text-dark-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtitleUppercase}
                  onChange={(e) => setSubtitleUppercase(e.target.checked)}
                  className="accent-primary-600"
                />
                ALL CAPS
              </label>
              <label className="flex items-center gap-2 text-xs text-dark-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtitleBackground}
                  onChange={(e) => setSubtitleBackground(e.target.checked)}
                  className="accent-primary-600"
                />
                Background
              </label>
              <label className="flex items-center gap-2 text-xs text-dark-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtitleShadow}
                  onChange={(e) => setSubtitleShadow(e.target.checked)}
                  className="accent-primary-600"
                />
                Shadow
              </label>
              <label className="flex items-center gap-2 text-xs text-dark-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtitleHighlight}
                  onChange={(e) => setSubtitleHighlight(e.target.checked)}
                  className="accent-primary-600"
                />
                Highlight
              </label>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">
                Words at a time{' '}
                <span className="text-primary-400 font-mono">
                  {subtitleWordsPerChunk === 0 ? 'Natural' : subtitleWordsPerChunk}
                </span>
              </label>
              <input
                type="range"
                className="slider"
                min={0}
                max={8}
                step={1}
                value={subtitleWordsPerChunk}
                onChange={(e) => setSubtitleWordsPerChunk(Number(e.target.value))}
              />
              <p className="text-xs text-dark-500 mt-1">0 = all words; 2–3 = compressed, advances as they speak</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-dark-400 mb-1">Position</label>
                <select
                  value={subtitlePosition}
                  onChange={(e) => {
                    setSubtitlePosition(e.target.value as typeof subtitlePosition)
                    setSubtitleCustomPos(null, null)
                  }}
                  className="select"
                >
                  {SUBTITLE_POSITIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-dark-400 mb-1">Alignment</label>
                <select
                  value={subtitleAlign}
                  onChange={(e) => {
                    setSubtitleAlign(e.target.value as typeof subtitleAlign)
                    setSubtitleCustomPos(null, null)
                  }}
                  className="select"
                >
                  {SUBTITLE_ALIGNS.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {subtitleCustomX != null ? (
              <button
                className="btn-secondary w-full text-xs"
                onClick={() => setSubtitleCustomPos(null, null)}
              >
                Reset dragged position
              </button>
            ) : (
              <p className="text-xs text-dark-500">Drag the subtitle in the preview to place it freely</p>
            )}
            <div>
              <label className="block text-xs text-dark-400 mb-1">
                Font Size <span className="text-primary-400 font-mono">{subtitleFontSize}px</span>
              </label>
              <input
                type="range"
                className="slider"
                min={10}
                max={64}
                step={1}
                value={subtitleFontSize}
                onChange={(e) => setSubtitleFontSize(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">
                Line Height <span className="text-primary-400 font-mono">{subtitleLineHeight.toFixed(2)}</span>
              </label>
              <input
                type="range"
                className="slider"
                min={1}
                max={2}
                step={0.05}
                value={subtitleLineHeight}
                onChange={(e) => setSubtitleLineHeight(Number(e.target.value))}
              />
              <p className="text-xs text-dark-500 mt-1">Spacing between rows on wrapped subtitles</p>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">
                Max Width <span className="text-primary-400 font-mono">{subtitleMaxWidth}%</span>
              </label>
              <input
                type="range"
                className="slider"
                min={30}
                max={100}
                step={5}
                value={subtitleMaxWidth}
                onChange={(e) => setSubtitleMaxWidth(Number(e.target.value))}
              />
              <p className="text-xs text-dark-500 mt-1">Lower = wraps long lines into two rows sooner</p>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Text Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={subtitleColor}
                  onChange={(e) => setSubtitleColor(e.target.value)}
                  className="w-10 h-8 bg-dark-800 border border-dark-600 rounded cursor-pointer p-0.5"
                />
                <span className="text-xs font-mono text-dark-400 uppercase">{subtitleColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs text-dark-400 mb-1">Highlight Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={subtitleHighlightColor}
                  onChange={(e) => setSubtitleHighlightColor(e.target.value)}
                  className="w-10 h-8 bg-dark-800 border border-dark-600 rounded cursor-pointer p-0.5"
                />
                <span className="text-xs font-mono text-dark-400 uppercase">{subtitleHighlightColor}</span>
              </div>
              <p className="text-xs text-dark-500 mt-1">Spoken word highlight (karaoke)</p>
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs text-dark-400 mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subtitleOutline}
                  onChange={(e) => setSubtitleOutline(e.target.checked)}
                  className="accent-primary-600"
                />
                Outline
              </label>
              {subtitleOutline && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-dark-400 mb-1">
                      Outline Size <span className="text-primary-400 font-mono">{subtitleOutlineWidth}px</span>
                    </label>
                    <input
                      type="range"
                      className="slider"
                      min={0}
                      max={8}
                      step={0.5}
                      value={subtitleOutlineWidth}
                      onChange={(e) => setSubtitleOutlineWidth(Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={subtitleOutlineColor}
                      onChange={(e) => setSubtitleOutlineColor(e.target.value)}
                      className="w-10 h-8 bg-dark-800 border border-dark-600 rounded cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono text-dark-400 uppercase">{subtitleOutlineColor}</span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-dark-500">Colors apply to preview, final video, and NLE title exports. Double-click a transcript segment below to fix text.</p>
          </div>
        </section>

        <div className="border-t border-dark-700 pt-6" />

        <section>
          <h3 className="sticky top-0 z-10 bg-dark-900 text-xs font-medium text-dark-400 uppercase tracking-wider mb-3 py-1.5 -mx-4 px-4">Export</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-dark-400 mb-1">Export Format</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as typeof exportFormat)}
                disabled={disabled || isProcessing}
                className="select"
              >
                {EXPORT_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            {exportFormat === 'kdenlive' && (
              <div>
                <label className="block text-xs text-dark-400 mb-1">Title Template (optional)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={disabled || isProcessing}
                    onClick={async () => {
                      const p = await window.api?.dialog?.openFile?.([
                        { name: 'Kdenlive title', extensions: ['kdenlivetitle'] },
                      ])
                      if (p) setKdenliveTemplatePath(p)
                    }}
                    className="btn-secondary flex-1 justify-center text-xs truncate"
                  >
                    {kdenliveTemplatePath
                      ? kdenliveTemplatePath.split(/[\\/]/).pop()
                      : 'Choose .kdenlivetitle…'}
                  </button>
                  {kdenliveTemplatePath && (
                    <button
                      type="button"
                      onClick={() => setKdenliveTemplatePath(null)}
                      className="btn-secondary px-3"
                      title="Clear template"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            )}
            {(exportFormat === 'kdenlive' || exportFormat === 'premiere') && (
              <div>
                <label className="block text-xs text-dark-400 mb-1">Title FPS</label>
                <select
                  value={kdenliveFps}
                  onChange={(e) => setKdenliveFps(Number(e.target.value))}
                  disabled={disabled || isProcessing}
                  className="select"
                >
                  {[24, 25, 30, 50, 60].map((f) => (
                    <option key={f} value={f}>{f} fps</option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={onExport}
              disabled={disabled || isProcessing || (exportFormat === 'kdenlive' && transcript.length === 0)}
              className="btn-secondary w-full justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {exportFormat === 'kdenlive'
                ? 'Export Audio + Titles'
                : exportFormat === 'video'
                  ? isProcessing && processType === 'export'
                    ? 'Rendering…'
                    : 'Export Video'
                  : 'Export Project (XML + Audio)'}
            </button>
            <p className="text-xs text-dark-500 text-center">
              {exportFormat === 'kdenlive'
                ? 'Cut .wav + numbered .kdenlivetitle clips (titles retimed to match)'
                : exportFormat === 'video'
                  ? 'Cut video with subtitles + effects burned in (uses your edited timeline ranges)'
                  : 'Cut list XML + cut .wav for NLE import (non-destructive, uses your edited ranges)'}
            </p>
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-dark-700 bg-dark-900/50">
        <div className="flex items-center gap-2 text-xs text-dark-500">
          <div className="w-2 h-2 rounded-full bg-primary-500" />
          <span>Content</span>
          <div className="w-2 h-2 rounded-full bg-red-500/30 border border-red-500/50 ml-4" />
          <span>Silence</span>
        </div>
      </div>
    </aside>
  )
}
