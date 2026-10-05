import { create } from 'zustand'
import type {
  ProjectState,
  CutSegment,
  TranscriptSegment,
  WordTime,
  ExportFormat,
  ModelSize,
  Language,
  SubtitleEffect,
  SubtitlePosition,
  SubtitleAlign,
} from './types'

interface Store extends ProjectState {
  videoEl: HTMLVideoElement | null
  setVideoEl: (el: HTMLVideoElement | null) => void
  setVideo: (path: string, duration: number) => void
  setDuration: (duration: number) => void
  setCuts: (cuts: CutSegment[]) => void
  setTranscript: (transcript: TranscriptSegment[]) => void
  setWords: (words: WordTime[]) => void
  setProcessing: (type: 'silence' | 'transcribe' | 'export' | null, isProcessing: boolean) => void
  setProgress: (progress: number) => void
  setThreshold: (threshold: string) => void
  setMargin: (margin: string) => void
  setExportFormat: (format: ExportFormat) => void
  setKdenliveFps: (fps: number) => void
  setKdenliveTemplatePath: (path: string | null) => void
  setModelSize: (size: ModelSize) => void
  setLanguage: (language: Language) => void
  setSubtitleEffect: (effect: SubtitleEffect) => void
  setSubtitleColor: (color: string) => void
  setSubtitleHighlightColor: (color: string) => void
  setSubtitleOutline: (outline: boolean) => void
  setSubtitleOutlineColor: (color: string) => void
  setSubtitleOutlineWidth: (width: number) => void
  setSubtitlePosition: (position: SubtitlePosition) => void
  setSubtitleAlign: (align: SubtitleAlign) => void
  setSubtitleCustomPos: (x: number | null, y: number | null) => void
  setSubtitleFontSize: (size: number) => void
  setSubtitleLineHeight: (height: number) => void
  setSubtitleMaxWidth: (width: number) => void
  setShowWordCounter: (show: boolean) => void
  setSubtitleUppercase: (uppercase: boolean) => void
  setSubtitleWordsPerChunk: (n: number) => void
  setSubtitleBackground: (on: boolean) => void
  setSubtitleShadow: (on: boolean) => void
  setSubtitleHighlight: (on: boolean) => void
  reset: () => void
}

const initialState: ProjectState = {
  videoPath: null,
  videoDuration: 0,
  cuts: [],
  transcript: [],
  words: [],
  isProcessing: false,
  processType: null,
  progress: 0,
  threshold: '-19dB',
  margin: '0.2sec',
  exportFormat: 'premiere',
  kdenliveFps: 30,
  kdenliveTemplatePath: null,
  modelSize: 'medium',
  language: 'auto',
  subtitleEffect: 'fade',
  subtitleColor: '#ffffff',
  subtitleHighlightColor: '#facc15',
  subtitleOutline: true,
  subtitleOutlineColor: '#000000',
  subtitleOutlineWidth: 2,
  subtitlePosition: 'bottom',
  subtitleAlign: 'center',
  subtitleCustomX: null,
  subtitleCustomY: null,
  subtitleFontSize: 16,
  subtitleLineHeight: 1.3,
  subtitleMaxWidth: 90,
  showWordCounter: true,
  subtitleUppercase: false,
  subtitleWordsPerChunk: 0,
  subtitleBackground: true,
  subtitleShadow: true,
  subtitleHighlight: true,
}

export const useStore = create<Store>((set) => ({
  ...initialState,
  videoEl: null,

  setVideoEl: (videoEl) => set({ videoEl }),
  setVideo: (path, duration) => set({ videoPath: path, videoDuration: duration }),
  setDuration: (duration) => set({ videoDuration: duration }),
  setCuts: (cuts) => set({ cuts }),
  setTranscript: (transcript) => set({ transcript }),
  setWords: (words) => set({ words }),
  setProcessing: (type, isProcessing) => set({ processType: type, isProcessing, progress: 0 }),
  setProgress: (progress) => set({ progress }),
  setThreshold: (threshold) => set({ threshold }),
  setMargin: (margin) => set({ margin }),
  setExportFormat: (exportFormat) => set({ exportFormat }),
  setKdenliveFps: (kdenliveFps) => set({ kdenliveFps }),
  setKdenliveTemplatePath: (kdenliveTemplatePath) => set({ kdenliveTemplatePath }),
  setModelSize: (modelSize) => set({ modelSize }),
  setLanguage: (language) => set({ language }),
  setSubtitleEffect: (subtitleEffect) => set({ subtitleEffect }),
  setSubtitleColor: (subtitleColor) => set({ subtitleColor }),
  setSubtitleHighlightColor: (subtitleHighlightColor) => set({ subtitleHighlightColor }),
  setSubtitleOutline: (subtitleOutline) => set({ subtitleOutline }),
  setSubtitleOutlineColor: (subtitleOutlineColor) => set({ subtitleOutlineColor }),
  setSubtitleOutlineWidth: (subtitleOutlineWidth) => set({ subtitleOutlineWidth }),
  setSubtitlePosition: (subtitlePosition) => set({ subtitlePosition }),
  setSubtitleAlign: (subtitleAlign) => set({ subtitleAlign }),
  setSubtitleCustomPos: (subtitleCustomX, subtitleCustomY) => set({ subtitleCustomX, subtitleCustomY }),
  setSubtitleFontSize: (subtitleFontSize) => set({ subtitleFontSize }),
  setSubtitleLineHeight: (subtitleLineHeight) => set({ subtitleLineHeight }),
  setSubtitleMaxWidth: (subtitleMaxWidth) => set({ subtitleMaxWidth }),
  setShowWordCounter: (showWordCounter) => set({ showWordCounter }),
  setSubtitleUppercase: (subtitleUppercase) => set({ subtitleUppercase }),
  setSubtitleWordsPerChunk: (subtitleWordsPerChunk) => set({ subtitleWordsPerChunk }),
  setSubtitleBackground: (subtitleBackground) => set({ subtitleBackground }),
  setSubtitleShadow: (subtitleShadow) => set({ subtitleShadow }),
  setSubtitleHighlight: (subtitleHighlight) => set({ subtitleHighlight }),
  reset: () => set(initialState),
}))