#Requires -Version 5.1
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Color helpers ───────────────────────────────────────────────────────────

function Write-Info    { param([string]$Message) Write-Host "[*] $Message" -ForegroundColor Cyan }
function Write-Warn    { param([string]$Message) Write-Host "[!] $Message" -ForegroundColor Yellow }
function Write-Err     { param([string]$Message) Write-Host "[x] $Message" -ForegroundColor Red }
function Write-Success { param([string]$Message) Write-Host "[+] $Message" -ForegroundColor Green }

# ── Utility ─────────────────────────────────────────────────────────────────

function Test-Command {
    param([string]$Name)
    try {
        $null = Get-Command $Name -ErrorAction SilentlyContinue
        return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
    } catch {
        return $false
    }
}

# Resolve project root (one level up from this script)
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Push-Location $ProjectRoot

try {

# ── 1. Prerequisites ───────────────────────────────────────────────────────

Write-Info "Checking prerequisites..."

# Git
if (Test-Command "git") {
    Write-Success "git $(git --version | Select-String -Pattern '\d+\.\d+' | ForEach-Object { $_.Matches[0].Value })"
} else {
    Write-Err "Git is not installed."
    Write-Err "  Install it:  winget install Git.Git"
    exit 1
}

# Docker
if (Test-Command "docker") {
    Write-Success "docker found"
} else {
    Write-Err "Docker is not installed."
    Write-Err "  Install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    exit 1
}

# Docker Compose v2
try {
    $composeVersion = docker compose version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "compose missing" }
    Write-Success "docker compose $($composeVersion -replace '.*v','v' -replace '[^v0-9.]','')"
} catch {
    Write-Err "Docker Compose v2 is not available."
    Write-Err "  Upgrade Docker Desktop — Compose v2 is bundled with recent versions."
    Write-Err "  https://docs.docker.com/compose/install/"
    exit 1
}

# Docker daemon
try {
    $null = docker info 2>$null
    if ($LASTEXITCODE -ne 0) { throw "daemon not running" }
    Write-Success "Docker daemon is running"
} catch {
    Write-Err "Docker daemon is not running."
    Write-Err "  Start Docker Desktop and wait for it to be ready."
    exit 1
}

# Node >= 20
if (Test-Command "node") {
    $nodeRaw = (node --version).TrimStart("v")
    $nodeMajor = [int]($nodeRaw.Split(".")[0])
    if ($nodeMajor -ge 20) {
        Write-Success "node v$nodeRaw"
    } else {
        Write-Err "Node $nodeRaw found, but >= 20 is required."
        Write-Err "  Install Node 20+ from https://nodejs.org/ or run: winget install OpenJS.NodeJS.LTS"
        exit 1
    }
} else {
    Write-Err "Node.js is not installed."
    Write-Err "  Install Node 20+ from https://nodejs.org/ or run: winget install OpenJS.NodeJS.LTS"
    exit 1
}

# Corepack
if (Test-Command "corepack") {
    Write-Success "corepack found"
} else {
    Write-Err "corepack is not installed."
    Write-Err "  Run: npm install -g corepack"
    exit 1
}

# ── 2. Port conflict warnings ──────────────────────────────────────────────

Write-Info "Checking for port conflicts..."

$portsToCheck = @(
    @{ Port = 5432; Label = "PostgreSQL" },
    @{ Port = 3000; Label = "API server" },
    @{ Port = 5173; Label = "Web dev server" }
)

foreach ($entry in $portsToCheck) {
    $port  = $entry.Port
    $label = $entry.Label
    try {
        $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conn) {
            Write-Warn "Port $port ($label) is already in use. You may need to free it before starting."
        } else {
            Write-Success "Port $port ($label) is available"
        }
    } catch {
        Write-Success "Port $port ($label) is available"
    }
}

# ── 3. Create .env ─────────────────────────────────────────────────────────

Write-Info "Setting up environment..."

$envFile     = Join-Path $ProjectRoot ".env"
$envExample  = Join-Path $ProjectRoot ".env.example"

if (Test-Path $envFile) {
    Write-Info "Using existing .env"
} else {
    if (-not (Test-Path $envExample)) {
        Write-Err ".env.example not found at $envExample"
        exit 1
    }
    Copy-Item $envExample $envFile
    Write-Success "Created .env from template"
}

# ── 4. Enable pnpm via corepack ────────────────────────────────────────────

Write-Info "Enabling pnpm via corepack..."

$packageJson   = Get-Content (Join-Path $ProjectRoot "package.json") | ConvertFrom-Json
$pnpmSpecifier = $packageJson.packageManager          # e.g. "pnpm@10.33.0"
$pnpmVersion   = $pnpmSpecifier -replace 'pnpm@', ''  # e.g. "10.33.0"

$corepackOk = $false
try {
    corepack enable
    if ($LASTEXITCODE -eq 0) {
        $corepackOk = $true
        Write-Success "corepack enabled"
    }
} catch {
    # corepack enable failed — fall through to npm fallback
}

if (-not $corepackOk) {
    Write-Warn "corepack enable failed; installing pnpm $pnpmVersion via npm..."
    npm install -g "pnpm@$pnpmVersion"
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Failed to install pnpm. Please install it manually: npm install -g pnpm@$pnpmVersion"
        exit 1
    }
}

# Validate pnpm is available
try {
    $pnpmActual = pnpm --version
    if ($LASTEXITCODE -ne 0) { throw "pnpm not found" }
    Write-Success "pnpm v$pnpmActual"
} catch {
    Write-Err "pnpm is not available after setup. Please install manually: npm install -g pnpm@$pnpmVersion"
    exit 1
}

# ── 5. Bootstrap ────────────────────────────────────────────────────────────

Write-Info "Running bootstrap (docker compose up, pnpm install, migrations, seed)..."
Write-Info "This may take a few minutes on first run."

pnpm bootstrap
if ($LASTEXITCODE -ne 0) {
    Write-Err "Bootstrap failed. Check the output above for details."
    exit 1
}

# ── 6. Success ──────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  lifeos is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "    Start the dev servers:  " -NoNewline; Write-Host "pnpm dev" -ForegroundColor Cyan
Write-Host "    API:                    " -NoNewline; Write-Host "http://127.0.0.1:3000" -ForegroundColor Cyan
Write-Host "    Web:                    " -NoNewline; Write-Host "http://127.0.0.1:5173" -ForegroundColor Cyan
Write-Host ""

} finally {
    Pop-Location
}
