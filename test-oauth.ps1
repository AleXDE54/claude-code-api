# Test OAuth-based Claude Code automation
Write-Host "Testing OAuth-based Claude Code Worker..." -ForegroundColor Cyan
Write-Host ""

# Check if Claude Code is authenticated
Write-Host "Checking Claude Code authentication..." -ForegroundColor Yellow
$claudeCheck = claude --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Claude Code not found or not authenticated" -ForegroundColor Red
    Write-Host "Please run 'claude' once interactively to set up OAuth" -ForegroundColor Yellow
    exit 1
}

Write-Host "Claude Code version: $claudeCheck" -ForegroundColor Green
Write-Host ""

# Create a simple test script
$testScript = @'
import { OAuthClaudeWorker } from './worker-oauth.js';

async function test() {
    console.log('Creating OAuth worker...');
    const worker = new OAuthClaudeWorker('test-conversation', {
        workspaceDir: process.cwd()
    });

    try {
        console.log('Starting worker...');
        await worker.start();

        console.log('\nSending first message...');
        const response1 = await worker.send('What is 5 + 7? Just give me the number.');
        console.log('Response 1:', response1);

        console.log('\nSending second message...');
        const response2 = await worker.send('What was my previous question?');
        console.log('Response 2:', response2);

        console.log('\nClosing worker...');
        await worker.close();
        
        console.log('\n✓ Test completed successfully!');
    } catch (error) {
        console.error('✗ Test failed:', error);
        process.exit(1);
    }
}

test();
'@

Set-Content -Path 'test-oauth-worker.js' -Value $testScript

Write-Host "Running OAuth worker test..." -ForegroundColor Yellow
node test-oauth-worker.js

Write-Host ""
Write-Host "Test complete!" -ForegroundColor Cyan
