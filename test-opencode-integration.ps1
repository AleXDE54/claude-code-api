# Quick test script for opencode integration
Write-Host "Testing opencode configuration..." -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "1. Checking if API server is running..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 3
    Write-Host "   Server is running!" -ForegroundColor Green
} catch {
    Write-Host "   Server is NOT running. Start it with: npm start" -ForegroundColor Red
    exit 1
}

# Check models endpoint
Write-Host ""
Write-Host "2. Checking models endpoint..." -ForegroundColor Yellow
try {
    $models = Invoke-RestMethod -Uri "http://localhost:3001/v1/models" -Method GET
    Write-Host "   Available models: $($models.data.id -join ', ')" -ForegroundColor Green
} catch {
    Write-Host "   Failed to get models" -ForegroundColor Red
    exit 1
}

# Test chat completion
Write-Host ""
Write-Host "3. Testing chat completion..." -ForegroundColor Yellow
$testBody = @{
    model = "claude-code"
    messages = @(
        @{ role = "user"; content = "Reply with just 'API working!'" }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3001/v1/chat/completions" `
        -Method POST `
        -ContentType "application/json" `
        -Body $testBody
    
    Write-Host "   Response: $($response.choices[0].message.content)" -ForegroundColor Green
} catch {
    Write-Host "   Chat completion failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "All tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Your API is ready for opencode!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Open VS Code" -ForegroundColor White
Write-Host "  2. Press Ctrl+I in any file" -ForegroundColor White
Write-Host "  3. Type your request" -ForegroundColor White
Write-Host "  4. Watch Claude Code respond!" -ForegroundColor White
