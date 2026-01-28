# Configure VS Code opencode extension to use local Claude Code API
Write-Host "Configuring opencode extension for VS Code..." -ForegroundColor Cyan
Write-Host ""

$settingsPath = "$env:APPDATA\Code\User\settings.json"

if (-not (Test-Path $settingsPath)) {
    Write-Host "VS Code settings.json not found at: $settingsPath" -ForegroundColor Red
    Write-Host "Please create it manually or run VS Code first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found VS Code settings at: $settingsPath" -ForegroundColor Green

# Read existing settings
$settings = Get-Content $settingsPath -Raw | ConvertFrom-Json -AsHashtable

# Configure opencode
$settings["opencode.apiBaseUrl"] = "http://localhost:3001/v1"
$settings["opencode.apiKey"] = "dummy-key"
$settings["opencode.model"] = "claude-code"

# Write back
$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath

Write-Host ""
Write-Host "Configuration updated!" -ForegroundColor Green
Write-Host ""
Write-Host "Settings applied:" -ForegroundColor Cyan
Write-Host "  API Base URL: http://localhost:3001/v1" -ForegroundColor White
Write-Host "  API Key: dummy-key (not validated)" -ForegroundColor White
Write-Host "  Model: claude-code" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start your API server: npm start" -ForegroundColor White
Write-Host "2. Restart VS Code to apply settings" -ForegroundColor White
Write-Host "3. Press Ctrl+I in any file to use opencode" -ForegroundColor White
Write-Host ""
Write-Host "Your opencode will now use Claude Code via your local API!" -ForegroundColor Green
