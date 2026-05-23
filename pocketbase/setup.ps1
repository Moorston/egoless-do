# PocketBase Setup Script
# Usage: .\setup.ps1

$PB_VERSION = "0.38.2"
$PB_DIR = "$PSScriptRoot"
$PB_URL = "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_windows_amd64.zip"
$ZIP_FILE = "$PB_DIR\pocketbase.zip"

Write-Host "Downloading PocketBase v${PB_VERSION}..." -ForegroundColor Cyan

if (!(Test-Path "$PB_DIR\pocketbase.exe")) {
    Invoke-WebRequest -Uri $PB_URL -OutFile $ZIP_FILE
    Expand-Archive -Path $ZIP_FILE -DestinationPath $PB_DIR -Force
    Remove-Item $ZIP_FILE
    Write-Host "PocketBase downloaded successfully!" -ForegroundColor Green
} else {
    Write-Host "PocketBase already exists." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "To start PocketBase:" -ForegroundColor Cyan
Write-Host "  cd $PB_DIR" -ForegroundColor White
Write-Host "  .\pocketbase.exe serve --http=0.0.0.0:8090" -ForegroundColor White
Write-Host ""
Write-Host "Admin UI: http://localhost:8090/_/" -ForegroundColor Cyan
Write-Host "API Base: http://localhost:8090/api" -ForegroundColor Cyan
