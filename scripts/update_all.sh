#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
  echo
  echo "==> $1"
}

run_npm_block() {
  local dir="$1"
  local description="$2"
  log "$description"
  if command -v npm >/dev/null 2>&1; then
    if ! (cd "$dir" && npm install); then
      echo "npm install failed for $dir; skipping build and tests" >&2
      return
    fi
    (cd "$dir" && npm run build)
    if ! (cd "$dir" && npm test -- --watch=false); then
      (cd "$dir" && npm test)
    fi
  else
    echo "npm is not available on PATH; skipping $description" >&2
  fi
}

run_python_block() {
  local dir="$1"
  local description="$2"
  log "$description"
  local py_bin=""
  if command -v python3 >/dev/null 2>&1; then
    py_bin="python3"
  elif command -v python >/dev/null 2>&1; then
    py_bin="python"
  fi

  if [[ -n "$py_bin" ]]; then
    (
      cd "$dir" && \
      "$py_bin" -m venv .venv && \
      source .venv/bin/activate && \
      pip install --upgrade pip && \
      pip install -r requirements.txt && \
      pytest
    )
  else
    echo "Python is not available on PATH; skipping $description" >&2
  fi
}

log "Pulling latest changes"
if command -v git >/dev/null 2>&1; then
  (cd "$ROOT_DIR" && git pull --ff-only || true)
else
  echo "git is not available on PATH; skipping repository update" >&2
fi

run_npm_block "$ROOT_DIR/backend" "Updating backend dependencies, building, and testing"
run_npm_block "$ROOT_DIR/frontend" "Updating frontend dependencies, building, and testing"
run_python_block "$ROOT_DIR/ai-services" "Updating AI services dependencies and running tests"

log "Collecting workspace status"
(cd "$ROOT_DIR" && git status)

log "All update steps completed"
