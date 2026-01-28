import { spawn } from 'child_process'
import { createInterface } from 'readline'
import { EventEmitter } from 'events'

/**
 * OAuth-based worker that uses your existing Claude Code session
 * No API key required - uses your authenticated session
 */
export class OAuthClaudeWorker extends EventEmitter {
  constructor (conversationId, options = {}) {
    super()
    this.conversationId = conversationId
    this.workspaceDir = options.workspaceDir || process.cwd()
    this.proc = null
    this.readline = null
    this.ready = false
    this.responseBuffer = ''
  }

  /**
   * Start Claude Code in interactive mode using OAuth
   */
  async start () {
    return new Promise((resolve, reject) => {
      console.log(
        `[OAuth Worker ${this.conversationId}] Starting Claude Code with OAuth...`
      )

      // Use the global claude command (which has OAuth already set up)
      // Or use local installation if you've authenticated it
      const claudeCmd = process.platform === 'win32' ? 'claude.cmd' : 'claude'

      // Start in interactive mode (no -p flag)
      // This will use your existing OAuth session
      this.proc = spawn(claudeCmd, [], {
        cwd: this.workspaceDir,
        env: {
          ...process.env,
          // Remove API key to force OAuth mode
          ANTHROPIC_API_KEY: undefined,
          TERM: 'dumb',
          NO_COLOR: '1'
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      })

      // Set up line reading from stdout
      this.readline = createInterface({
        input: this.proc.stdout,
        crlfDelay: Infinity
      })

      // Listen for output
      this.readline.on('line', line => {
        const trimmed = line.trim()
        if (trimmed) {
          console.log(`[OAuth Worker] stdout: ${trimmed}`)
          this.responseBuffer += line + '\n'

          // Emit line-by-line for streaming
          this.emit('data', line)
        }
      })

      // Also listen to raw stdout for debugging
      this.proc.stdout.on('data', chunk => {
        console.log(
          `[OAuth Worker] raw stdout (${chunk.length} bytes):`,
          chunk.toString().substring(0, 100)
        )
      })

      // Handle stderr
      this.proc.stderr.on('data', data => {
        const msg = data.toString().trim()
        console.error(`[OAuth Worker] stderr: ${msg}`)
        this.emit('error', msg)
      })

      // Handle process exit
      this.proc.on('exit', code => {
        console.log(`[OAuth Worker] Process exited with code ${code}`)
        this.ready = false
        this.emit('exit', code)
      })

      // Wait a moment for initialization
      setTimeout(() => {
        this.ready = true
        resolve()
      }, 2000)
    })
  }

  /**
   * Send a message to Claude and wait for response
   */
  async send (message, timeoutMs = 30000) {
    if (!this.ready || !this.proc) {
      throw new Error('Worker not ready. Call start() first.')
    }

    return new Promise((resolve, reject) => {
      this.responseBuffer = ''
      let responseComplete = false
      let silenceTimer = null
      let timeoutTimer = null

      const cleanup = () => {
        if (silenceTimer) clearTimeout(silenceTimer)
        if (timeoutTimer) clearTimeout(timeoutTimer)
        this.removeListener('data', onData)
      }

      // Set up response handler
      const onData = line => {
        // Reset silence timer on each new line
        if (silenceTimer) clearTimeout(silenceTimer)

        // Wait for 2 seconds of silence before considering response complete
        silenceTimer = setTimeout(() => {
          if (!responseComplete) {
            responseComplete = true
            cleanup()
            resolve(this.responseBuffer.trim())
          }
        }, 2000)
      }

      this.on('data', onData)

      // Overall timeout
      timeoutTimer = setTimeout(() => {
        if (!responseComplete) {
          responseComplete = true
          cleanup()
          reject(new Error(`Response timeout after ${timeoutMs}ms`))
        }
      }, timeoutMs)

      // Send the message
      console.log(`[OAuth Worker] Sending: ${message.substring(0, 50)}...`)
      this.proc.stdin.write(message + '\n')
    })
  }

  /**
   * Close the worker
   */
  async close () {
    if (this.proc) {
      this.proc.stdin.end()
      this.proc.kill()
      this.proc = null
      this.ready = false
    }
  }
}
