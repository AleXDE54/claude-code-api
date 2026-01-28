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
