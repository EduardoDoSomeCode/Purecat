export interface CutSegment {
  start: number
  end: number
  isSilence: boolean
}

export interface TranscriptSegment {
  id: number
  start: number
  end: number
  text: string
  color?: string
}

export interface WordTime {
  start: number
  end: number
  word: string
}

export interface ProjectState {
  videoPath: string | null
  videoDuration: number
  cuts: CutSegment[]
  transcript: TranscriptSegment[]
  words: WordTime[]
  isProcessing: boolean
  processType: 'silence' | 'transcribe' | 'export' | null
  progress: number
  threshold: string
  margin: string
  exportFormat: ExportFormat
  kdenliveFps: number
  kdenliveTemplatePath: string | null
  modelSize: ModelSize
  language: Language
  subtitleEffect: SubtitleEffect
  subtitleColor: string
  subtitleHighlightColor: string
  subtitleOutline: boolean
  subtitleOutlineColor: string
  subtitleOutlineWidth: number
  subtitlePosition: SubtitlePosition
  subtitleAlign: SubtitleAlign
  subtitleCustomX: number | null
  subtitleCustomY: number | null
  subtitleFontSize: number
  subtitleLineHeight: number
  subtitleMaxWidth: number
  showWordCounter: boolean
  subtitleUppercase: boolean
  subtitleWordsPerChunk: number
  subtitleBackground: boolean
  subtitleShadow: boolean
  subtitleHighlight: boolean
}

export type ExportFormat = 'video' | 'premiere' | 'final-cut-pro' | 'resolve' | 'kdenlive'

export const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'video', label: 'Final Video (MP4, cut + subtitles)' },
  { value: 'premiere', label: 'Premiere Pro (XML)' },
  { value: 'final-cut-pro', label: 'Final Cut Pro (XML)' },
  { value: 'resolve', label: 'DaVinci Resolve (XML)' },
  { value: 'kdenlive', label: 'Kdenlive (titles)' },
]

export const MODEL_SIZES = ['tiny', 'base', 'small', 'medium', 'large-v3'] as const
export type ModelSize = typeof MODEL_SIZES[number]

export const LANGUAGES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
] as const
export type Language = typeof LANGUAGES[number]['value']

export const SUBTITLE_EFFECTS = [
  { value: 'fade', label: 'Fade in' },
  { value: 'pop', label: 'Pop up' },
  { value: 'squash', label: 'Squash & stretch' },
  { value: 'none', label: 'None' },
] as const
export type SubtitleEffect = typeof SUBTITLE_EFFECTS[number]['value']

export const SUBTITLE_POSITIONS = [
  { value: 'bottom', label: 'Bottom' },
  { value: 'center', label: 'Center' },
  { value: 'top', label: 'Top' },
] as const
export type SubtitlePosition = typeof SUBTITLE_POSITIONS[number]['value']

export const SUBTITLE_ALIGNS = [
  { value: 'center', label: 'Center' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
] as const
export type SubtitleAlign = typeof SUBTITLE_ALIGNS[number]['value']