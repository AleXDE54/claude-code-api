# Final Validation Tests for Claude Code API

Write-Host "`n=== Claude Code API - Validation Tests ===`n" -ForegroundColor Cyan

# Test 1: Basic Health Check
Write-Host "Test 1: Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri http://localhost:3001/health -TimeoutSec 10
    if ($health.status -eq "ok") {
        Write-Host "✅ PASS: Health endpoint working`n" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ FAIL: Health check failed - $_`n" -ForegroundColor Red
}

# Test 2: Models Endpoint
Write-Host "Test 2: Models Endpoint..." -ForegroundColor Yellow
try {
    $models = Invoke-RestMethod -Uri http://localhost:3001/v1/models -TimeoutSec 10
    if ($models.data.Count -gt 0) {
        Write-Host "✅ PASS: Models endpoint returns $($models.data.Count) models`n" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ FAIL: Models endpoint failed - $_`n" -ForegroundColor Red
}

# Test 3: Simple Chat Completion
Write-Host "Test 3: Simple Chat Completion..." -ForegroundColor Yellow
try {
    $json = '{"model":"claude-code","messages":[{"role":"user","content":"What is 5+3? Answer with just the number."}]}'
    $response = Invoke-RestMethod -Uri http://localhost:3001/v1/chat/completions -Method Post -ContentType 'application/json' -Body $json -TimeoutSec 60
    
    if ($response.choices[0].message.content -match "8") {
        Write-Host "✅ PASS: Chat completion working correctly`n" -ForegroundColor Green
        Write-Host "   Response: $($response.choices[0].message.content)" -ForegroundColor Gray
        Write-Host "   Tokens: $($response.usage.total_tokens)`n" -ForegroundColor Gray
    } else {
        Write-Host "❌ FAIL: Unexpected response: $($response.choices[0].message.content)`n" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: Chat completion failed - $_`n" -ForegroundColor Red
}

# Test 4: Response Format Validation
Write-Host "Test 4: OpenAI Format Compatibility..." -ForegroundColor Yellow
try {
    $json = '{"model":"claude-code","messages":[{"role":"user","content":"Hi"}]}'
    $response = Invoke-RestMethod -Uri http://localhost:3001/v1/chat/completions -Method Post -ContentType 'application/json' -Body $json -TimeoutSec 60
    
    $valid = ($response.id -and 
              $response.object -eq "chat.completion" -and
              $response.model -and
              $response.choices -and
              $response.usage)
    
    if ($valid) {
        Write-Host "✅ PASS: Response format is OpenAI-compatible`n" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Response format invalid`n" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: Format validation failed - $_`n" -ForegroundColor Red
}

# Test 5: Custom Conversation ID (UUID)
Write-Host "Test 5: Custom Conversation ID..." -ForegroundColor Yellow
try {
    $uuid = [guid]::NewGuid().ToString()
    $json = '{"model":"claude-code","messages":[{"role":"user","content":"Test"}]}'
    $response = Invoke-RestMethod -Uri http://localhost:3001/v1/chat/completions -Method Post -ContentType 'application/json' -Body $json -Headers @{'X-Conversation-ID'=$uuid} -TimeoutSec 60
    
    if ($response.choices[0].message.content) {
        Write-Host "✅ PASS: Custom conversation ID accepted ($($uuid.Substring(0,8))...)`n" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ FAIL: Custom conversation ID failed - $_`n" -ForegroundColor Red
}

Write-Host "`n=== Test Suite Complete ===`n" -ForegroundColor Cyan
