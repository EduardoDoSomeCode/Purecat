# BUILD.md — PureCat

This document provides step-by-step instructions to set up the development environment, integrate background dependencies (`auto-editor` and `faster-whisper`), and package **PureCat** into a standalone desktop application.

---

## 1. System Requirements

Ensure the host machine meets the following prerequisites before building:

* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher
* **Python**: `3.10+`
* **FFmpeg**: Must be installed and accessible in the system `PATH` environment variable.

---

## 2. Environment Setup

### Step 1: Clone Repository & Install Node Modules
```bash
git clone [https://github.com/your-username/purecat.git](https://github.com/your-username/purecat.git)
cd purecat
npm install

Step 2: Set Up Python Virtual Environment

PureCat utilizes a embedded Python virtual environment to execute silence detection and speech recognition without needing external cloud APIs.
Bash

# Create local virtual environment inside python_env directory
python3 -m venv python_env

# Activate the virtual environment
# macOS / Linux:
source python_env/bin/activate
# Windows (PowerShell):
.\python_env\Scripts\Activate.ps1

# Upgrade package manager and install dependencies
pip install --upgrade pip
pip install auto-editor faster-whisper

3. Core Engine Architecture

 PureCat (Electron / Node.js)
 ├── Frontend UI (React / Tailwind CSS)
 │   ├── Timeline Waveform Preview
 │   ├── dB Threshold & Frame Margin Controls
 │   └── Live SRT Transcript Editor
 │
 └── Backend Engines (Python Services)
     ├── auto-editor CLI (Silence detection & non-destructive XML exports)
     └── faster-whisper (Local AI speech-to-text inference)

A. Silence Detection Integration (auto-editor)

The auto-editor CLI tool processes media files to produce frame-accurate cut parameters and non-destructive project exports (.xml).
JavaScript

// src/main/autoEditorBridge.js
const { execFile } = require('child_process');
const path = require('path');

function runAutoEditor(inputPath, options = {}) {
  const {
    threshold = '-19dB',
    margin = '0.2sec',
    exportFormat = 'premiere', // Options: premiere (XML), final-cut-pro, resolve
    outputPath
  } = options;

  const pythonExec = path.join(__dirname, '../../python_env/bin/auto-editor');

  const args = [
    inputPath,
    '--edit', `audio:${threshold}`,
    '--margin', margin,
    '--export', exportFormat,
    '--output', outputPath
  ];

  return new Promise((resolve, reject) => {
    execFile(pythonExec, args, (error, stdout, stderr) => {
      if (error) return reject(stderr || error.message);
      resolve(stdout);
    });
  });
}

module.exports = { runAutoEditor };

B. Local AI Subtitling Engine (faster-whisper)

Generates transcript tracks locally on CPU/GPU without token limits:
Python

# python_env/transcribe.py
import sys
from faster_whisper import WhisperModel

def generate_srt(video_path, output_srt_path, model_size="medium"):
    model = WhisperModel(model_size, device="auto", compute_type="default")
    segments, _ = model.transcribe(video_path, word_timestamps=True)

    with open(output_srt_path, "w", encoding="utf-8") as f:
        for i, segment in enumerate(segments, start=1):
            start_m, start_s = divmod(segment.start, 60)
            start_h, start_m = divmod(start_m, 60)
            start_ms = int((segment.start % 1) * 1000)

            end_m, end_s = divmod(segment.end, 60)
            end_h, end_m = divmod(end_m, 60)
            end_ms = int((segment.end % 1) * 1000)

            f.write(f"{i}\n")
            f.write(f"{start_h:02d}:{start_m:02d}:{start_s:02d},{start_ms:03d} --> ")
            f.write(f"{end_h:02d}:{end_m:02d}:{end_s:02d},{end_ms:03d}\n")
            f.write(f"{segment.text.strip()}\n\n")

if __name__ == "__main__":
    generate_srt(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "medium")

4. Local Development Mode

To run PureCat in development mode with hot-reloading enabled:
Bash

npm run dev

5. Building & Packaging

PureCat uses electron-builder to bundle the app, GUI frontend, and embedded Python virtual environment into standalone distribution files.
Configuration (electron-builder.json)
JSON

{
  "appId": "com.purecat.editor",
  "productName": "PureCat",
  "directories": {
    "output": "dist"
  },
  "extraResources": [
    {
      "from": "python_env",
      "to": "python_env",
      "filter": ["**/*"]
    }
  ],
  "mac": {
    "target": ["dmg", "zip"],
    "category": "public.app-category.video"
  },
  "win": {
    "target": ["nsis", "portable"]
  },
  "linux": {
    "target": ["AppImage", "deb"]
  }
}

Build Commands
Bash

# Build binary for current operating system
npm run build

# Targeted build commands
npm run build:win    # Windows installer (.exe)
npm run build:mac    # macOS disk image (.dmg)
npm run build:linux  # Linux package (.AppImage / .deb)

## Desing system
use a dark and blue collor pallet and
make sure to build a clean and profesional looking app
