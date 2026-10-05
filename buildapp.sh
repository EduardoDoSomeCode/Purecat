#!/usr/bin/env bash
#
# buildapp.sh — Install dependencies and build PureCat for this platform.
#
set -e
set -o pipefail

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
ok()   { echo -e "\033[1;32m[OK]\033[0m $*"; }
fail() { echo -e "\033[1;31m[ERROR]\033[0m $*" >&2; }
info() { echo -e "\033[1;34m[..]\033[0m $*"; }

# ---------------------------------------------------------------------------
# Cleanup on unexpected failure
# ---------------------------------------------------------------------------
trap 'fail "Build failed at line $LINENO."; exit 1' ERR

# ---------------------------------------------------------------------------
# 1. Check prerequisites
# ---------------------------------------------------------------------------
command -v node >/dev/null 2>&1 || { fail "Node.js is not installed."; exit 1; }
command -v npm  >/dev/null 2>&1 || { fail "npm is not installed."; exit 1; }
command -v ffmpeg >/dev/null 2>&1 || { fail "ffmpeg is not installed or not in PATH."; exit 1; }

ok "Prerequisites found: node $(node -v), npm $(npm -v)"

# ---------------------------------------------------------------------------
# 2. Install dependencies
# ---------------------------------------------------------------------------
info "Installing dependencies (npm install)..."
if npm install; then
  ok "Dependencies installed."
else
  fail "npm install failed."
  exit 1
fi

# ---------------------------------------------------------------------------
# 3. Set up embedded Python environment
# ---------------------------------------------------------------------------
if [ ! -d "python_env" ]; then
  info "Creating Python virtual environment in python_env/..."
  command -v python3 >/dev/null 2>&1 || { fail "python3 is not installed."; exit 1; }
  if python3 -m venv python_env; then
    ok "Virtual environment created."
  else
    fail "Failed to create virtual environment."
    exit 1
  fi
else
  info "python_env/ already exists, reusing it."
fi

info "Installing Python dependencies (auto-editor, faster-whisper)..."
if [ -f "python_env/bin/pip" ]; then
  PIP="python_env/bin/pip"
else
  PIP="python_env/Scripts/pip.exe"
fi

if "$PIP" install --upgrade pip && "$PIP" install auto-editor faster-whisper; then
  ok "Python dependencies installed."
else
  fail "Failed to install Python dependencies."
  exit 1
fi

# ---------------------------------------------------------------------------
# 4. Detect platform and build
# ---------------------------------------------------------------------------
OS="$(uname -s)"
case "$OS" in
  Linux*)   TARGET="--linux" ;;
  Darwin*)  TARGET="--mac" ;;
  MINGW*|MSYS*|CYGWIN*) TARGET="--win" ;;
  *)        fail "Unsupported platform: $OS"; exit 1 ;;
esac

info "Building for $OS (target: $TARGET)..."
if npm run build -- "$TARGET"; then
  ok "Build succeeded! Output is in the dist/ folder:"
  ls -lh dist/ | grep -v '^d' | tail -n +2 || true
  ls dist/
else
  fail "Build failed. Check the output above for details."
  exit 1
fi
