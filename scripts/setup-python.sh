#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PYTHON_ENV="$PROJECT_ROOT/python_env"

echo "Setting up Python virtual environment at $PYTHON_ENV"

if [ ! -d "$PYTHON_ENV" ]; then
    python3 -m venv "$PYTHON_ENV"
fi

source "$PYTHON_ENV/bin/activate"

pip install --upgrade pip
pip install auto-editor faster-whisper

# faster-whisper 1.2 still passes metadata_errors= to av.open(); PyAV 19 removed it.
python3 - << 'PY'
from pathlib import Path
import faster_whisper.audio as audio

path = Path(audio.__file__)
old = 'with av.open(input_file, mode="r", metadata_errors="ignore") as container:'
new = """    try:
        container = av.open(input_file, mode="r", metadata_errors="ignore")
    except TypeError:
        container = av.open(input_file, mode="r")
    with container:"""
text = path.read_text()
if old in text:
    path.write_text(text.replace(old, new, 1))
    print(f"Patched {path} for PyAV compatibility")
else:
    print(f"No PyAV metadata_errors patch needed in {path}")
PY

# Create transcribe.py in the venv bin directory
cat > "$PYTHON_ENV/bin/transcribe.py" << 'EOF'
import json
import os
import sys

import av

_av_open = av.open


def _open_compat(*args, **kwargs):
    # faster-whisper 1.2 still passes metadata_errors; PyAV 19 removed it.
    kwargs.pop("metadata_errors", None)
    return _av_open(*args, **kwargs)


av.open = _open_compat

from faster_whisper import WhisperModel


def srt_time(t):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def generate_srt(video_path, output_srt_path, model_size="medium", language=None):
    # cuda first (if usable), fall back to cpu — device="auto" can pick a
    # broken CUDA setup that only fails at inference time
    errors = []
    segments_out = None
    for device, compute_type in (("cuda", "default"), ("cpu", "int8")):
        try:
            model = WhisperModel(model_size, device=device, compute_type=compute_type)
            segments, _ = model.transcribe(video_path, word_timestamps=True, language=language)
            segments_out = list(segments)
            break
        except Exception as exc:
            errors.append(exc)

    if segments_out is None:
        raise errors[-1]

    words = []
    with open(output_srt_path, "w", encoding="utf-8") as f:
        for i, segment in enumerate(segments_out, start=1):
            f.write(f"{i}\n")
            f.write(f"{srt_time(segment.start)} --> {srt_time(segment.end)}\n")
            f.write(f"{segment.text.strip()}\n\n")
            for w in segment.words or []:
                start = round(w.start, 3)
                end = round(w.end, 3)
                if end <= start:
                    end = round(start + 0.02, 3)
                words.append({"start": start, "end": end, "word": w.word.strip()})

    words_path = os.path.splitext(output_srt_path)[0] + ".words.json"
    with open(words_path, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False)


if __name__ == "__main__":
    lang = sys.argv[4] if len(sys.argv) > 4 else "auto"
    generate_srt(
        sys.argv[1],
        sys.argv[2],
        sys.argv[3] if len(sys.argv) > 3 else "medium",
        None if lang == "auto" else lang,
    )
EOF

chmod +x "$PYTHON_ENV/bin/transcribe.py"

echo "Python environment ready at $PYTHON_ENV"
echo "auto-editor: $($PYTHON_ENV/bin/auto-editor --version 2>/dev/null || echo 'not found')"
echo "faster-whisper installed"