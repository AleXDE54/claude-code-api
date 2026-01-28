// Test 2: Persistent Worker with Interactive Mode
import { spawn } from 'child_process'

console.log('=== Test 2: Persistent Interactive Worker ===\n')

class TestPersistentWorker {
  constructor () {
    this.proc = null
    this.outputBuffer = ''
    this.responseReceived = false
  }

  async spawn () {
    return new Promise((resolve, reject) => {
      console.log('Spawning Claude in interactive mode (no -p flag)...')

      const claudeCmd = 'claude.cmd'
      const sessionId = '11111111-2222-3333-4444-555555555555'

      const args = [
        '--session-id',
        sessionId,
        '--dangerously-skip-permissions'
        // NO -p flag - this keeps it interactive
      ]

      console.log(`Command: ${claudeCmd} ${args.join(' ')}\n`)

      this.proc = spawn(claudeCmd, args, {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      })

      // Collect stdout
      this.proc.stdout.on('data', data => {
        const text = data.toString()
        console.log('[STDOUT]:', text.substring(0, 200))
        this.outputBuffer += text

        // Look for any output as a sign it's ready
        if (this.outputBuffer.length > 0 && !this.responseReceived) {
          this.responseReceived = true
          resolve()
        }
      })

      // Collect stderr
      this.proc.stderr.on('data', data => {
        console.log('[STDERR]:', data.toString())
      })

      this.proc.on('error', err => {
        console.log('❌ Process error:', err.message)
        reject(err)
      })

      this.proc.on('exit', code => {
        console.log(`Process exited with code: ${code}`)
      })

      // Timeout if no response in 10 seconds
      setTimeout(() => {
        if (!this.responseReceived) {
          console.log('⚠️  No output after 10s, continuing anyway...')
          resolve()
        }
      }, 10000)
    })
  }

  async sendMessage (message) {
    return new Promise((resolve, reject) => {
      console.log(`\nSending message: "${message}"`)

      this.outputBuffer = ''
      let gotResponse = false

      const responseHandler = data => {
        const text = data.toString()
        console.log('[Response]:', text.substring(0, 300))

        if (!gotResponse) {
          gotResponse = true
          setTimeout(() => resolve(text), 1000) // Give it time to finish
        }
      }

      this.proc.stdout.once('data', responseHandler)

      this.proc.stdin.write(message + '\n', err => {
        if (err) {
          console.log('❌ Write error:', err.message)
          reject(err)
        } else {
          console.log('✅ Message sent to stdin')
        }
      })

      // Timeout
      setTimeout(() => {
        if (!gotResponse) {
          console.log('❌ No response received after 15s')
          reject(new Error('Timeout'))
        }
      }, 15000)
    })
  }

  kill () {
    if (this.proc) {
      this.proc.kill()
    }
  }
}

async function run () {
  const worker = new TestPersistentWorker()

  try {
    console.log('Step 1: Spawning persistent worker...')
    await worker.spawn()
    console.log('✅ Worker spawned and ready\n')

    console.log('Step 2: Sending first message...')
    const response1 = await worker.sendMessage(
      'What is 2+2? Answer with just the number.'
    )
    console.log('\n✅ Got response 1\n')

    console.log('Step 3: Sending second message...')
    const response2 = await worker.sendMessage(
      'What is 5+3? Answer with just the number.'
    )
    console.log('\n✅ Got response 2\n')

    console.log('=== SUCCESS ===')
    console.log('Persistent worker can send multiple messages!')
  } catch (err) {
    console.log('❌ FAILED:', err.message)
  } finally {
    worker.kill()
  }
}

run().catch(console.error)
