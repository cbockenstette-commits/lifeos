#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# lifeos setup script
# Detects prerequisites, creates .env, enables pnpm, and runs bootstrap.
# Safe to re-run (idempotent). Never installs anything silently.
# ---------------------------------------------------------------------------

# ---- Color constants ------------------------------------------------------

if [[ -n "${NO_COLOR:-}" ]] || [[ ! -t 1 ]]; then
  RED="" GREEN="" YELLOW="" CYAN="" RESET=""
else
  RED="\033[0;31m"
  GREEN="\033[0;32m"
  YELLOW="\033[0;33m"
  CYAN="\033[0;36m"
  RESET="\033[0m"
fi

# ---- Helper functions -----------------------------------------------------

info()    { printf "${CYAN}%s${RESET}\n" "$*"; }
warn()    { printf "${YELLOW}WARNING: %s${RESET}\n" "$*"; }
success() { printf "${GREEN}%s${RESET}\n" "$*"; }
error()   { printf "${RED}ERROR: %s${RESET}\n" "$*" >&2; exit 1; }

check_cmd() { command -v "$1" >/dev/null 2>&1; }

# ---- OS detection ---------------------------------------------------------

OS="$(uname -s)"
case "$OS" in
  Linux)  PLATFORM="linux"  ;;
  Darwin) PLATFORM="macos"  ;;
  *)      error "Unsupported operating system: $OS. This script supports Linux and macOS only." ;;
esac

info "Detected platform: $PLATFORM"

# ---- Prerequisite checks --------------------------------------------------

MISSING=0

# Git
if check_cmd git; then
  success "  git            $(git --version)"
else
  MISSING=1
  warn "git is not installed."
  if [[ "$PLATFORM" == "linux" ]]; then
    echo "  Install: sudo apt update && sudo apt install -y git"
  else
    echo "  Install: brew install git"
  fi
fi

# Docker
if check_cmd docker; then
  success "  docker         $(docker --version | head -1)"
else
  MISSING=1
  warn "Docker is not installed."
  echo "  Install: https://docs.docker.com/get-docker/"
fi

# Docker Compose v2
if docker compose version >/dev/null 2>&1; then
  success "  docker compose $(docker compose version --short 2>/dev/null || docker compose version)"
else
  MISSING=1
  warn "Docker Compose v2 is not available."
  echo "  Docker Desktop includes Compose v2 by default."
  echo "  Standalone: https://docs.docker.com/compose/install/"
fi

# Docker daemon running
if docker info >/dev/null 2>&1; then
  success "  docker daemon  running"
else
  MISSING=1
  warn "Docker daemon is not running."
  if [[ "$PLATFORM" == "macos" ]]; then
    echo "  Start Docker Desktop from your Applications folder."
  else
    echo "  Start with: sudo systemctl start docker"
  fi
fi

# Node >= 20
REQUIRED_NODE_MAJOR=20
if check_cmd node; then
  NODE_VERSION="$(node --version)"
  NODE_MAJOR="${NODE_VERSION#v}"
  NODE_MAJOR="${NODE_MAJOR%%.*}"
  if [[ "$NODE_MAJOR" -ge "$REQUIRED_NODE_MAJOR" ]]; then
    success "  node           $NODE_VERSION"
  else
    MISSING=1
    warn "Node $NODE_VERSION is too old (need >= $REQUIRED_NODE_MAJOR)."
    echo "  Install Node 20+ from https://nodejs.org/ or via nvm/fnm."
  fi
else
  MISSING=1
  warn "Node.js is not installed."
  echo "  Install Node 20+ from https://nodejs.org/ or via nvm/fnm."
fi

# corepack
if check_cmd corepack; then
  success "  corepack       $(corepack --version 2>/dev/null || echo "available")"
else
  MISSING=1
  warn "corepack is not installed."
  echo "  Install: npm install -g corepack"
fi

if [[ "$MISSING" -ne 0 ]]; then
  echo ""
  error "One or more prerequisites are missing. Install them and re-run this script."
fi

echo ""
success "All prerequisites satisfied."
echo ""

# ---- Port conflict warnings (advisory) -----------------------------------

check_port() {
  local port="$1"
  local label="$2"
  local occupied=0

  if [[ "$PLATFORM" == "linux" ]]; then
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
      occupied=1
    fi
  else
    if lsof -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | grep -q .; then
      occupied=1
    fi
  fi

  if [[ "$occupied" -eq 1 ]]; then
    warn "Port $port ($label) is already in use. You may need to stop the conflicting process."
  fi
}

check_port 5432 "Postgres"
check_port 3000 "API"
check_port 5173 "Web/Vite"

# ---- Create .env ----------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

if [[ -f .env ]]; then
  info "Using existing .env"
else
  if [[ -f .env.example ]]; then
    cp .env.example .env
    success "Created .env from template"
  else
    error ".env.example not found. Cannot create .env."
  fi
fi

echo ""

# ---- Enable pnpm via corepack --------------------------------------------

info "Enabling pnpm via corepack..."

if corepack enable 2>/dev/null; then
  success "corepack enable succeeded"
else
  warn "corepack enable failed — falling back to global pnpm install."
  PNPM_VERSION="$(grep -o '"pnpm@[^"]*"' package.json | tr -d '"' | cut -d@ -f2)"
  if [[ -z "$PNPM_VERSION" ]]; then
    error "Could not parse pnpm version from package.json."
  fi
  info "Installing pnpm@$PNPM_VERSION globally..."
  npm install -g "pnpm@$PNPM_VERSION"
fi

if check_cmd pnpm; then
  success "  pnpm           $(pnpm --version)"
else
  error "pnpm is not available after setup. Check your PATH."
fi

echo ""

# ---- Run bootstrap --------------------------------------------------------

info "Running bootstrap (docker compose up, pnpm install, migrations, seed)..."
echo ""

pnpm bootstrap

echo ""

# ---- Success banner -------------------------------------------------------

printf "${GREEN}"
cat <<'BANNER'
  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___  ___
 /   \/   \/   \/   \/   \/   \/   \/   \/   \/   \/   \/   \/   \/   \
|                                                                       |
|   lifeos is ready!                                                    |
|                                                                       |
|     Start the dev servers:  pnpm dev                                  |
|     API:                    http://127.0.0.1:3000                     |
|     Web:                    http://127.0.0.1:5173                     |
|                                                                       |
 \___/\___/\___/\___/\___/\___/\___/\___/\___/\___/\___/\___/\___/\___/
BANNER
printf "${RESET}"
