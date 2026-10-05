export interface FileFilter {
  name: string
  extensions: string[]
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  filters?: FileFilter[]
  properties?: string[]
}

declare global {
  interface Window {
    api: {
      dialog: {
        openFile: (filters: FileFilter[]) => Promise<string | undefined>
        openDirectory: () => Promise<string | undefined>
        saveFile: (options: SaveDialogOptions) => Promise<string | undefined>
      }
      autoEditor: {
        run: (inputPath: string, options: AutoEditorOptions) => Promise<string>
      }
      video: {
        render: (options: RenderVideoOptions) => Promise<string>
      }
      transcribe: {
        run: (inputPath: string, outputPath: string, modelSize: string, language: string) => Promise<string>
      }
      fs: {
        readFile: (filePath: string) => Promise<string>
        writeFiles: (
          dirPath: string,
          files: Array<{ name: string; content: string; encoding?: 'utf8' | 'utf16le' }>,
        ) => Promise<number>
      }
      audio: {
        peaks: (inputPath: string, duration: number, buckets: number) => Promise<number[]>
      }
    }
  }
}

export interface AutoEditorOptions {
  threshold: string
  margin: string
  exportFormat: string
  outputPath: string
  cuts?: Array<{ start: number; end: number }>
}

export interface RenderVideoOptions {
  videoPath: string
  cuts: Array<{ start: number; end: number }>
  ass: string | null
  outputPath: string
}

export const api = window.api