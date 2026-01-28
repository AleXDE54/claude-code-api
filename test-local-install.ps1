# Test script for local Claude installation
Write-Host "Testing local Claude installation..." -ForegroundColor Cyan

$body = @{
    model = "claude-sonnet-4"
    messages = @(
        @{
            role = "user"
            content = "What is 5 + 7? Answer with just the number."
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "`nSending request..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3001/v1/chat/completions" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "`nSuccess!" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
}
catch {
    Write-Host "`nError!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        Write-Host $reader.ReadToEnd()
    }
}
