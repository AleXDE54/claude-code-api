# Test OAuth Mode
Write-Host "Testing OAuth Mode..." -ForegroundColor Cyan
Write-Host ""

$body = @{
    model = "claude-code"
    messages = @(
        @{
            role = "user"
            content = "What is 15 + 27? Just give me the number."
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "Sending request to OAuth-enabled API..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3001/v1/chat/completions" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "`nSuccess!" -ForegroundColor Green
    Write-Host "Response: $($response.choices[0].message.content)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "This response came from your OAuth-authenticated Claude Code!" -ForegroundColor Yellow
    Write-Host "No API key was used." -ForegroundColor Yellow
}
catch {
    Write-Host "`nError!" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
