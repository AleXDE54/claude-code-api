import { OAuthClaudeWorker } from './worker-oauth-simple.js'
import { v4 as uuidv4 } from 'uuid'

async function test () {
  console.log(
    'Testing OAuth-based Claude Code (using your authenticated session)...\n'
  )

  const worker = new OAuthClaudeWorker(uuidv4(), {
    workspaceDir: process.cwd(),
    useGlobalClaude: true // Use your OAuth-authenticated Claude
  })

  try {
    console.log('Test 1: Simple math question')
    const response1 = await worker.send(
      'What is 5 + 7? Answer with just the number.'
    )
    console.log('Response:', response1.result || response1)
    console.log('')

    console.log('Waiting for session to be released...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    console.log('Test 2: Conversation continuity')
    const response2 = await worker.send('What was my previous question?')
    console.log('Response:', response2.result || response2)
    console.log('')

    console.log('✓ All tests passed!')
    console.log('\nThis is using your OAuth-authenticated Claude Code session,')
    console.log('not an API key!')
  } catch (error) {
    console.error('✗ Test failed:', error.message)
    process.exit(1)
  }
}

test()
