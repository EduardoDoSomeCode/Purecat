import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  dialog: {
    openFile: (filters: Electron.FileFilter[]) => ipcRenderer.invoke('dialog:openFile', filters),
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
    saveFile: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('dialog:saveFile', options),
  },
  autoEditor: {
    run: (inputPath: string, options: AutoEditorOptions) => ipcRenderer.invoke('auto-editor:run', inputPath, options),
  },
  video: {
    render: (options: RenderVideoOptions) => ipcRenderer.invoke('video:render', options),
  },
  transcribe: {
    run: (inputPath: string, outputPath: string, modelSize: string, language: string) =>
      ipcRenderer.invoke('transcribe:run', inputPath, outputPath, modelSize, language),
  },
  fs: {
    readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
    writeFiles: (dirPath: string, files: Array<{ name: string; content: string; encoding?: 'utf8' | 'utf16le' }>) =>
      ipcRenderer.invoke('fs:writeFiles', dirPath, files),
  },
  audio: {
    peaks: (inputPath: string, duration: number, buckets: number) =>
      ipcRenderer.invoke('audio:peaks', inputPath, duration, buckets),
  },
})

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