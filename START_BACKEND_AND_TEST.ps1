# Quick test script for Windows PowerShell
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "  LOCAL MUSIC PLAYER - Quick Start Script" -ForegroundColor Cyan
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host ""

# Check if music_library exists
if (!(Test-Path "music_library")) {
    Write-Host "Creating music_library folder..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path "music_library" -Force | Out-Null
}

# Check for music files
$musicFiles = Get-ChildItem -Path "music_library" -Recurse -Include "*.mp3","*.flac","*.m4a","*.ogg","*.wav" -ErrorAction SilentlyContinue
$fileCount = ($musicFiles | Measure-Object).Count

Write-Host ""
Write-Host "Music Library Status:" -ForegroundColor White
Write-Host "  Location: " -NoNewline; Write-Host "$(Get-Location)\music_library" -ForegroundColor Cyan
Write-Host "  Files found: " -NoNewline

if ($fileCount -eq 0) {
    Write-Host "$fileCount" -ForegroundColor Red
    Write-Host ""
    Write-Host "  WARNING: No music files found!" -ForegroundColor Yellow
    Write-Host "  Your music player will work, but the library will be empty." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick Setup Options:" -ForegroundColor White
    Write-Host "  1. Copy music files to: music_library\Artist\Album\" -ForegroundColor Gray
    Write-Host "  2. Use YouTube downloader (see QUICK_TEST.md)" -ForegroundColor Gray
    Write-Host "  3. Continue anyway and add files later" -ForegroundColor Gray
    Write-Host ""
    
    $response = Read-Host "Continue with empty library? (y/n)"
    if ($response -ne "y") {
        Write-Host "Exiting. Add music files first." -ForegroundColor Yellow
        exit
    }
} else {
    Write-Host "$fileCount" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Found music files:" -ForegroundColor Green
    $musicFiles | Select-Object -First 5 | ForEach-Object {
        Write-Host "    - $($_.Name)" -ForegroundColor Gray
    }
    if ($fileCount -gt 5) {
        Write-Host "    ... and $($fileCount - 5) more" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 79) -ForegroundColor Cyan

# Check Python
Write-Host ""
Write-Host "Checking requirements..." -ForegroundColor White

try {
    $pythonVersion = python --version 2>&1
    Write-Host "  Python: " -NoNewline; Write-Host "$pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "  Python: " -NoNewline; Write-Host "NOT FOUND" -ForegroundColor Red
    Write-Host "  Please install Python 3.8+ from python.org" -ForegroundColor Yellow
    exit
}

# Check if backend dependencies are installed
if (!(Test-Path "backend/requirements.txt")) {
    Write-Host "  Backend requirements: " -NoNewline; Write-Host "requirements.txt not found" -ForegroundColor Red
    exit
}

Write-Host "  Backend requirements: " -NoNewline; Write-Host "Found" -ForegroundColor Green

Write-Host ""
Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 79) -ForegroundColor Cyan

# Start backend
Write-Host ""
Write-Host "Starting backend server..." -ForegroundColor White
Write-Host "  Location: http://localhost:8000" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop" -ForegroundColor Gray
Write-Host ""

cd backend

# Check if virtual environment exists
if (Test-Path ".venv") {
    Write-Host "  Activating virtual environment..." -ForegroundColor Gray
    .\.venv\Scripts\Activate.ps1
}

Write-Host "=" -ForegroundColor Cyan -NoNewline; Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host ""

# Run the server
python main.py
