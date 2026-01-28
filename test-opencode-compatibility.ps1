# Test OpenAI API Compatibility (for opencode)
Write-Host "Testing OpenAI API Compatibility..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3001"

# Test 1: Models endpoint
Write-Host "Test 1: GET /v1/models" -ForegroundColor Yellow
try {
    $models = Invoke-RestMethod -Uri "$baseUrl/v1/models" -Method GET
    Write-Host "  Available models: $($models.data.id -join ', ')" -ForegroundColor Green
} catch {
    Write-Host "  FAILED: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Chat completions (simple)
Write-Host "Test 2: POST /v1/chat/completions (simple)" -ForegroundColor Yellow
$body = @{
    model = "claude-code"
    messages = @(
        @{
            role = "user"
            content = "Say 'Hello from opencode test' and nothing else"
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod `
        -Uri "$baseUrl/v1/chat/completions" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "  Response: $($response.choices[0].message.content)" -ForegroundColor Green
    Write-Host "  Model: $($response.model)" -ForegroundColor Gray
    Write-Host "  Tokens: $($response.usage.total_tokens)" -ForegroundColor Gray
} catch {
    Write-Host "  FAILED: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 3: Chat completions with system message
Write-Host "Test 3: POST /v1/chat/completions (with system message)" -ForegroundColor Yellow
$body2 = @{
    model = "claude-code"
    messages = @(
        @{
            role = "system"
            content = "You are a helpful coding assistant. Be concise."
        }
        @{
            role = "user"
            content = "Write a hello world in Python"
        }
    )
    temperature = 0.7
    max_tokens = 100
} | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-RestMethod `
        -Uri "$baseUrl/v1/chat/completions" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body2
    
    Write-Host "  Response length: $($response2.choices[0].message.content.Length) chars" -ForegroundColor Green
    Write-Host "  Finish reason: $($response2.choices[0].finish_reason)" -ForegroundColor Gray
} catch {
    Write-Host "  FAILED: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

Write-Host "All tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Your API is fully compatible with opencode!" -ForegroundColor Cyan
Write-Host ""
Write-Host "To use with opencode:" -ForegroundColor Yellow
Write-Host "1. Install opencode extension in VS Code" -ForegroundColor White
Write-Host "2. Run: powershell -File configure-opencode.ps1" -ForegroundColor White
Write-Host "3. Restart VS Code" -ForegroundColor White
Write-Host "4. Press Ctrl+I to use it!" -ForegroundColor White
