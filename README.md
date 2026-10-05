# PureCat

Local AI video editor with silence detection and transcription. Built with Electron, React, and Python.

## Features

- **Silence Detection** — Uses `auto-editor` to detect and cut silence from videos
- **Local Transcription** — Uses `faster-whisper` for offline speech-to-text
- **Timeline Editor** — Visual waveform with cut regions and transcript segments
- **SRT Editor** — Inline editing of transcript segments
- **NLE Export** — Export cut lists as XML for Premiere, Final Cut, DaVinci Resolve

## Quick Start

```bash
# Install Node dependencies
npm install

# Set up Python environment (auto-editor + faster-whisper)
npm run setup:python

# Start development server
npm run dev
```

## Build

```bash
# Build for current platform (Linux)
npm run build:linux

# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac
```

## Requirements

- Node.js 18+
- Python 3.10+
- FFmpeg (in PATH)

## Project Structure

```
src/
├── main/                 # Electron main process
│   ├── index.ts         # Main entry point
│   ├── preload.ts       # Preload script
│   ├── autoEditorBridge.ts
│   └── transcribeBridge.ts
├── renderer/            # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── store.ts     # Zustand store
│   │   ├── api.ts       # IPC wrapper
│   │   └── types.ts     # TypeScript types
│   └── index.html
scripts/
└── setup-python.sh      # Python venv setup
python_env/              # Embedded Python environment (gitignored)
```

## Tech Stack

- **Electron 28** — Desktop framework
- **React 18 + TypeScript** — Frontend
- **Vite** — Build tool
- **Tailwind CSS** — Styling
- **Zustand** — State management
- **auto-editor** — Silence detection (Python)
- **faster-whisper** — Transcription (Python)

## License

MIT