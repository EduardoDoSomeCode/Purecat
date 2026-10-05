import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { runAutoEditor, type AutoEditorOptions } from './autoEditorBridge.js'
import { renderVideo, type RenderVideoOptions } from './renderVideo.js'
import { runTranscribe } from './transcribeBridge.js'
import { handleMedia } from './mediaProtocol.js'
import { computePeaks } from './audioPeaks.js'

const isDev = process.env.NODE_ENV === 'development'

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { standard: true, stream: true, bypassCSP: true, supportFetchAPI: true } },
])

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

if (isDev) {
  app.disableHardwareAcceleration()
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-gpu-compositing')
  app.commandLine.appendSwitch('disable-software-rasterizer')
  app.commandLine.appendSwitch('disable-gpu-process-crash-limit')
  app.commandLine.appendSwitch('no-sandbox')
  app.commandLine.appendSwitch('disable-dev-shm-usage')
  app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor')
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  const isLinux = process.platform === 'linux'
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: !isDev,
    },
    titleBarStyle: isLinux ? 'default' : 'hidden',
    titleBarOverlay: isLinux ? false : {
      color: '#0f172a',
      symbolColor: '#ffffff',
      height: 36,
    },
    backgroundColor: '#0f172a',
    show: false,
  })

  if (isDev) {
    loadDevUrl(mainWindow)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    console.log('[Renderer]', message)
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Renderer process gone:', details)
  })

  mainWindow.webContents.on('unresponsive', () => {
    console.error('Renderer unresponsive')
  })

  mainWindow.webContents.on('responsive', () => {
    console.log('Renderer responsive again')
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    console.log('Main window closed')
    mainWindow = null
  })
}

app.whenReady().then(() => {
  protocol.handle('media', handleMedia)

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !isDev) app.quit()
})

app.on('before-quit', () => {
  console.log('App is quitting...')
})

ipcMain.handle('dialog:openFile', async (_event, filters: Electron.FileFilter[]) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters,
  })
  return result.filePaths[0]
})

ipcMain.handle('dialog:saveFile', async (_event, options: Electron.SaveDialogOptions) => {
  const result = await dialog.showSaveDialog(mainWindow!, options)
  return result.filePath
})

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
  })
  return result.filePaths[0]
})

ipcMain.handle('auto-editor:run', async (_event, inputPath: string, options: AutoEditorOptions) => {
  const pythonExec = getPythonExec()
  return runAutoEditor(pythonExec, inputPath, options)
})

ipcMain.handle('video:render', async (_event, options: RenderVideoOptions) => {
  const pythonExec = getPythonExec()
  return renderVideo(pythonExec, options)
})

ipcMain.handle('transcribe:run', async (_event, inputPath: string, outputPath: string, modelSize: string, language: string) => {
  const pythonExec = getPythonExec()
  return runTranscribe(pythonExec, inputPath, outputPath, modelSize, language)
})

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  return readFile(filePath, 'utf-8')
})

ipcMain.handle(
  'fs:writeFiles',
  async (
    _event,
    dirPath: string,
    files: Array<{ name: string; content: string; encoding?: 'utf8' | 'utf16le' }>,
  ) => {
    await mkdir(dirPath, { recursive: true })
    await Promise.all(files.map((f) => writeFile(join(dirPath, f.name), f.content, f.encoding ?? 'utf8')))
    return files.length
  },
)

ipcMain.handle('audio:peaks', async (_event, inputPath: string, duration: number, buckets: number) => {
  return computePeaks(inputPath, duration, Math.max(10, Math.min(4000, Math.floor(buckets))))
})

function getPythonExec(): string {
  const base = isDev
    ? join(process.cwd(), 'python_env')
    : join(process.resourcesPath, 'python_env')
  return process.platform === 'win32'
    ? join(base, 'Scripts', 'python.exe')
    : join(base, 'bin', 'python')
}

function loadDevUrl(window: BrowserWindow): void {
  const url = 'http://localhost:5173'
  let retries = 0
  const maxRetries = 30

  const attemptLoad = () => {
    window.loadURL(url)
  }

  window.webContents.on('did-fail-load', (_event, errorCode) => {
    if (retries < maxRetries && (errorCode === -102 || errorCode === -105 || errorCode === -118 || errorCode === -7)) {
      retries++
      console.log(`Vite server not ready (${errorCode}), retry ${retries}/${maxRetries}...`)
      setTimeout(attemptLoad, 1000)
    } else if (retries >= maxRetries) {
      console.error('Vite server did not start in time')
    }
  })

  attemptLoad()
}