$json = '{"model":"claude-code","messages":[{"role":"user","content":"Count from 1 to 5, one number per line."}],"stream":true}'

Write-Host "Testing streaming response...`n" -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri http://localhost:3001/v1/chat/completions `
        -Method Post `
        -ContentType 'application/json' `
        -Body $json `
        -UseBasicParsing `
        -TimeoutSec 60
    
    Write-Host "Status: $($response.StatusCode)`n"
    Write-Host "Content-Type: $($response.Headers['Content-Type'])`n"
    Write-Host "Raw Response:`n"
    Write-Host $response.Content
    
} catch {
    Write-Host "❌ ERROR: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $body = $reader.ReadToEnd()
        Write-Host "Response Body: $body"
    }
}
