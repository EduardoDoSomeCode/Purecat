import { useState } from 'react'
import { useStore } from './store'
import { api } from './api'
import { parseSRT, toSRT } from './srt'
import { parseCutsFromPremiereXML } from './premiereXml'
import { buildKdenliveTitles } from './kdenlive'
import { buildPremiereTitles, buildPremiereTitlesXml } from './premiereTitles'
import { remapToCutTimeline, remapWords } from './cutRemap'
import { buildAss } from './ass'
import { estimateWords, normalizeWords } from './karaoke'
import { startRowResize } from './resize'
import type { TranscriptSegment, WordTime } from './types'
import { Header } from './components/Header'
import { VideoPlayer } from './components/VideoPlayer'
import { Timeline } from './components/Timeline'
import { TranscriptEditor } from './components/TranscriptEditor'
import { ControlPanel } from './components/ControlPanel'
import { StatusBar } from './components/StatusBar'

export function App() {
  const [timelineH, setTimelineH] = useState(192)
  const {
    videoPath,
    videoDuration,
    isProcessing,
    processType,
    progress,
    setVideo,
    setCuts,
    setTranscript,
    setWords,
    setProcessing,
    setProgress,
  } = useStore()

  const loadWords = async (srtPath: string, segs: TranscriptSegment[]) => {
    try {
      const json = await api.fs.readFile(srtPath.replace(/(\.srt)?$/, '.words.json'))
      const parsed = JSON.parse(json) as WordTime[]
      setWords(parsed.length ? normalizeWords(parsed) : estimateWords(segs))
    } catch {
      // no words sidecar (old transcription) — approximate so karaoke still works
      setWords(estimateWords(segs))
    }
  }

  const loadVideo = async () => {
    const path = await api.dialog.openFile([
      { name: 'Video Files', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'] },
    ])
    if (!path) return

    // Duration arrives from the player's loadedmetadata event
    setVideo(path, 0)
    setTranscript([])
    setWords([])
    setCuts([])

    try {
      const srt = await api.fs.readFile(path.replace(/\.[^.]+$/, '.srt'))
      const segs = parseSRT(srt)
      setTranscript(segs)
      await loadWords(path.replace(/\.[^.]+$/, '.srt'), segs)
    } catch {
      // No existing transcript
    }
  }

  const runSilenceDetection = async () => {
    if (!videoPath) return
    setProcessing('silence', true)

    const outputPath = videoPath.replace(/\.[^.]+$/, '_cuts.xml')
    try {
      // detection always uses the premiere export internally: its structure is
      // stable to parse regardless of the user's NLE export choice
      await api.autoEditor.run(videoPath, {
        threshold: useStore.getState().threshold,
        margin: useStore.getState().margin,
        exportFormat: 'premiere',
        outputPath,
      })
      const xml = await api.fs.readFile(outputPath)
      setCuts(parseCutsFromPremiereXML(xml, videoDuration))
    } catch (err) {
      console.error('Silence detection failed:', err)
      alert(`Silence detection failed: ${err}`)
    } finally {
      setProcessing(null, false)
    }
  }

  const runTranscription = async () => {
    if (!videoPath) return
    setProcessing('transcribe', true)

    const outputPath = videoPath.replace(/\.[^.]+$/, '.srt')
    try {
      const state = useStore.getState()
      await api.transcribe.run(videoPath, outputPath, state.modelSize, state.language)
      const srt = await api.fs.readFile(outputPath)
      const segs = parseSRT(srt)
      setTranscript(segs)
      await loadWords(outputPath, segs)
    } catch (err) {
      console.error('Transcription failed:', err)
      alert(`Transcription failed: ${err}`)
    } finally {
      setProcessing(null, false)
    }
  }

  const updateTranscript = (transcript: TranscriptSegment[]) => {
    setTranscript(transcript)
    // persist edits to the .srt sidecar so fixes survive reload
    if (!videoPath) return
    const dir = videoPath.replace(/[\\/][^\\/]+$/, '')
    const name = (videoPath.split(/[\\/]/).pop() ?? 'video').replace(/\.[^.]+$/, '.srt')
    api.fs.writeFiles(dir, [{ name, content: toSRT(transcript) }]).catch(() => {})
  }

  const exportProject = async () => {
    if (!videoPath) return
    const state = useStore.getState()
    // user-edited silence ranges drive every export; empty → fall back to threshold detection
    const silences = state.cuts.filter((c) => c.isSilence && c.end > c.start)
    const cuts = silences.length ? silences : undefined
    const videoBase = (videoPath.split(/[\\/]/).pop() ?? 'video').replace(/\.[^.]+$/, '')

    if (state.exportFormat === 'video') {
      const path = await api.dialog.saveFile({
        defaultPath: `${videoPath.replace(/\.[^.]+$/, '')}_final.mp4`,
        filters: [{ name: 'MP4', extensions: ['mp4'] }],
      })
      if (!path) return
      setProcessing('export', true)
      try {
        const ass = state.transcript.length
          ? buildAss(
              remapToCutTimeline(state.transcript, silences),
              remapWords(state.words, silences),
              {
                effect: state.subtitleEffect,
                color: state.subtitleColor,
                highlightColor: state.subtitleHighlightColor,
                outline: state.subtitleOutline,
                outlineColor: state.subtitleOutlineColor,
                outlineWidth: state.subtitleOutlineWidth,
                position: state.subtitlePosition,
                align: state.subtitleAlign,
                fontSize: state.subtitleFontSize,
                uppercase: state.subtitleUppercase,
                background: state.subtitleBackground,
                shadow: state.subtitleShadow,
                highlight: state.subtitleHighlight,
                wordsPerChunk: state.subtitleWordsPerChunk,
              },
            )
          : null
        await api.video.render({ videoPath, cuts: silences, ass, outputPath: path })
        alert(
          `Video exported → ${path}` +
            (ass ? '\nSilences cut, subtitles + effects burned in.' : '\n(no transcript — cut video only)'),
        )
      } catch (err) {
        alert(`Video export failed: ${err}`)
      } finally {
        setProcessing(null, false)
      }
      return
    }

    if (state.exportFormat === 'kdenlive') {
      if (!state.transcript.length) {
        alert('Generate a transcript first.')
        return
      }
      if (!state.cuts.length) {
        alert('Run Silence Detection first — needed so titles line up with the cut audio.')
        return
      }
      const dir = await api.dialog.openDirectory()
      if (!dir) return
      try {
        let template: string | undefined
        if (state.kdenliveTemplatePath) {
          try {
            template = await api.fs.readFile(state.kdenliveTemplatePath)
          } catch {
            alert('Template could not be read — using default style.')
          }
        }
        // titles retimed onto the cut timeline to match the rendered audio
        const segments = remapToCutTimeline(state.transcript, silences)
        const files = buildKdenliveTitles(segments, {
          fps: state.kdenliveFps,
          fontColor: state.subtitleColor,
          outlineColor: state.subtitleOutlineColor,
          outlineWidth: state.subtitleOutline ? state.subtitleOutlineWidth : 0,
          shadow: state.subtitleShadow,
          template,
        })
        await api.fs.writeFiles(`${dir}/${videoBase}_Titles`, files)
        const wavPath = `${dir}/${videoBase}.wav`
        await api.autoEditor.run(videoPath, {
          threshold: state.threshold,
          margin: state.margin,
          exportFormat: 'default',
          outputPath: wavPath,
          cuts,
        })
        alert(
          `Exported:\n${files.length} titles → ${dir}/${videoBase}_Titles\nCut audio → ${wavPath}\n(titles retimed to match)`,
        )
      } catch (err) {
        alert(`Kdenlive export failed: ${err}`)
      }
      return
    }

    // premiere / final-cut-pro / resolve — auto-editor forces .fcpxml for the latter two
    const ext = state.exportFormat === 'premiere' ? 'xml' : 'fcpxml'
    const path = await api.dialog.saveFile({
      defaultPath: `${videoPath.replace(/\.[^.]+$/, '')}_cuts.${ext}`,
      filters: [{ name: 'XML', extensions: [ext] }],
    })
    if (!path) return

    try {
      await api.autoEditor.run(videoPath, {
        threshold: state.threshold,
        margin: state.margin,
        exportFormat: state.exportFormat,
        outputPath: path,
        cuts,
      })
      let msg = 'Export successful!'
      // cut audio (silence removed) alongside the NLE cut list
      const wavPath = path.replace(/\.[^.]+$/, '.wav')
      try {
        await api.autoEditor.run(videoPath, {
          threshold: state.threshold,
          margin: state.margin,
          exportFormat: 'default',
          outputPath: wavPath,
          cuts,
        })
        msg += `\nCut audio → ${wavPath}`
      } catch (audioErr) {
        msg += `\n(Cut audio failed: ${audioErr})`
      }
      // Premiere export also turns the SRT into pre-placed legacy title clips
      // Premiere XML is on the ORIGINAL timeline — titles stay unremapped.
      if (state.exportFormat === 'premiere' && state.transcript.length) {
        const dir = path.replace(/[\\/][^\\/]+$/, '')
        const baseName = (path.split(/[\\/]/).pop() ?? 'video').replace(/\.[^.]+$/, '')
        const titlesDir = path.replace(/\.[^.]+$/, '') + '_Titles'
        const fontSize = Math.round((state.subtitleFontSize / 16) * (1080 / 18))
        const titles = buildPremiereTitles(state.transcript, {
          fps: state.kdenliveFps,
          fontSize,
          fontColor: state.subtitleColor,
          align: state.subtitleAlign,
          position: state.subtitlePosition,
          uppercase: state.subtitleUppercase,
        })
        const xml = buildPremiereTitlesXml(
          state.transcript,
          titles.map((f) => f.name),
          { fps: state.kdenliveFps, titlesDir },
        )
        await api.fs.writeFiles(titlesDir, titles)
        await api.fs.writeFiles(dir, [{ name: `${baseName}_titles.xml`, content: xml }])
        msg += `\n${titles.length} title clips → ${titlesDir}\nImport ${dir}/${baseName}_titles.xml — titles land pre-placed`
      }
      alert(msg)
    } catch (err) {
      alert(`Export failed: ${err}`)
    }
  }

  return (
    <div className="h-full w-full flex flex-col bg-dark-950">
      <Header />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex min-h-0">
          <ControlPanel
            onLoadVideo={loadVideo}
            onSilenceDetection={runSilenceDetection}
            onTranscription={runTranscription}
            onExport={exportProject}
            hasVideo={!!videoPath}
            disabled={isProcessing || !videoPath}
            isProcessing={isProcessing}
            processType={processType}
            progress={progress}
          />
          <VideoPlayer />
          <TranscriptEditor
            transcript={useStore.getState().transcript}
            onUpdate={updateTranscript}
            disabled={isProcessing}
          />
        </div>
        <div
          className="h-1.5 flex-none cursor-row-resize hover:bg-primary-500/40 transition-colors"
          onMouseDown={(e) =>
            startRowResize(e, () => timelineH, setTimelineH, {
              min: 80,
              max: Math.round(window.innerHeight * 0.6),
            })
          }
          title="Drag to resize preview / timeline"
        />
        <div className="flex-none overflow-hidden" style={{ height: timelineH }}>
          <Timeline
            duration={videoDuration}
            cuts={useStore.getState().cuts}
            transcript={useStore.getState().transcript}
            isProcessing={isProcessing}
            processType={processType}
            progress={progress}
          />
        </div>
      </div>
      <StatusBar videoPath={videoPath} duration={videoDuration} />
    </div>
  )
}
