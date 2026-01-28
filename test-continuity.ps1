$convId = [guid]::NewGuid().ToString()
Write-Host "Testing conversation continuity with UUID: $convId`n" -ForegroundColor Cyan

try {
    # First request - introduce name
    $json1 = '{"model":"claude-code","messages":[{"role":"user","content":"My name is Bob. Please remember this."}]}'
    Write-Host "Request 1: Setting name to Bob..."
    $r1 = Invoke-RestMethod -Uri http://localhost:3001/v1/chat/completions -Method Post -ContentType 'application/json' -Body $json1 -Headers @{'X-Conversation-ID'=$convId} -TimeoutSec 60
    Write-Host "Response 1: $($r1.choices[0].message.content.Substring(0, [Math]::Min(150, $r1.choices[0].message.content.Length)))...`n"

    Write-Host "Waiting 5 seconds for session to unlock..." -ForegroundColor Yellow
    Start-Sleep 5

    # Second request - ask for name
    $json2 = '{"model":"claude-code","messages":[{"role":"user","content":"What name did I tell you?"}]}'
    Write-Host "Request 2: Asking for name..."
    $r2 = Invoke-RestMethod -Uri http://localhost:3001/v1/chat/completions -Method Post -ContentType 'application/json' -Body $json2 -Headers @{'X-Conversation-ID'=$convId} -TimeoutSec 60
    Write-Host "Response 2: $($r2.choices[0].message.content)`n"

    if ($r2.choices[0].message.content -like "*Bob*") {
        Write-Host "✅ SUCCESS: Conversation continuity works!" -ForegroundColor Green
    } else {
        Write-Host "❌ FAILED: Claude did not remember the name" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ ERROR: $_" -ForegroundColor Red
}
