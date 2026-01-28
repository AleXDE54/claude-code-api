import { spawn } from 'child_process'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'

/**
 * Persistent Claude Code Worker - Keeps process alive and injects messages
 * Uses interactive mode instead of -p for long-running sessions
 */
export class PersistentClaudeWorker extends EventEmitter {
  constructor (conversationId, options = {}) {
    super()
    this.conversationId = conversationId
    this.workspaceDir = options.workspaceDir || process.cwd()
    this.proc = null
    this.lastUsed = Date.now()
    this.ready = false
    this.outputBuffer = ''
    this.pendingRequests = new Map()
    this.currentRequestId = null
  }

  /**
   * Spawn Claude in interactive mode (no -p flag)
   * This keeps the process alive and accepts continuous input
   */
  async spawn () {
    if (this.proc && this.proc.exitCode === null) {
      return // Already running
    }

    const claudeCmd = process.platform === 'win32' ? 'claude.cmd' : 'claude'

    const args = [
      '--session-id',
      this.conversationId,
      '--dangerously-skip-permissions',
      '--output-format',
      'json', // Each response as JSON
      '--no-chrome' // Disable Chrome integration
      // Note: No -p flag - this keeps it interactive
    ]

    console.log(
      `[PersistentWorker ${this.conversationId.slice(
        0,
        8
      )}] Starting persistent process...`
    )

    this.proc = spawn(claudeCmd, args, {
      cwd: this.workspaceDir,
      env: {
        ...process.env,
        TERM: 'dumb',
        NO_COLOR: '1',
        CLAUDE_API_KEY: process.env.ANTHROPIC_API_KEY
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    })

    // Handle stdout - look for JSON responses
    this.proc.stdout.on('data', data => {
      this.handleStdout(data)
    })

    // Handle stderr
    this.proc.stderr.on('data', data => {
      const msg = data.toString()
      console.error(
        `[PersistentWorker ${this.conversationId.slice(0, 8)}] stderr:`,
        msg
      )
    })

    // Handle exit
    this.proc.on('exit', code => {
      console.log(
        `[PersistentWorker ${this.conversationId.slice(
          0,
          8
        )}] Process exited: ${code}`
      )
      this.ready = false
      this.emit('exit', code)

      // Reject pending requests
      for (const [id, pending] of this.pendingRequests) {
        pending.reject(new Error(`Worker exited with code ${code}`))
      }
      this.pendingRequests.clear()
    })

    // Wait for process to be ready (look for initial prompt or output)
    await this.waitForReady()
    this.ready = true
    console.log(`[PersistentWorker ${this.conversationId.slice(0, 8)}] Ready`)
  }

  /**
   * Wait for Claude to be ready to accept input
   */
  async waitForReady (timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout waiting for Claude to be ready'))
      }, timeout)

      // Listen for any initial output
      const onData = () => {
        clearTimeout(timer)
        resolve()
      }

      this.proc.stdout.once('data', onData)
    })
  }

  /**
   * Handle stdout data - parse JSON responses
   */
  handleStdout (data) {
    const text = data.toString()
    this.outputBuffer += text

    // Try to parse complete JSON objects
    // Claude might output JSON followed by newlines or prompts
    const lines = this.outputBuffer.split('\n')

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim()
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          const response = JSON.parse(line)
          this.handleJsonResponse(response)
          this.outputBuffer = lines.slice(i + 1).join('\n')
          return
        } catch (e) {
          // Not valid JSON yet, continue
        }
      }
    }
  }

  /**
   * Handle a complete JSON response from Claude
   */
  handleJsonResponse (response) {
    console.log(
      `[PersistentWorker ${this.conversationId.slice(
        0,
        8
      )}] Received response:`,
      response.type || 'unknown'
    )

    // Match response to pending request
    if (
      this.currentRequestId &&
      this.pendingRequests.has(this.currentRequestId)
    ) {
      const pending = this.pendingRequests.get(this.currentRequestId)
      pending.resolve({ chunks: [], result: response })
      this.pendingRequests.delete(this.currentRequestId)
      this.currentRequestId = null
    }
  }

  /**
   * Send a message to the running Claude process
   */
  async send (messages, model = 'claude-code') {
    if (!this.proc || !this.ready) {
      await this.spawn()
    }

    this.lastUsed = Date.now()

    // Build prompt from messages
    let prompt = ''
    for (const msg of messages) {
      if (msg.role === 'system') {
        prompt += `System: ${msg.content}\n\n`
      } else if (msg.role === 'user') {
        prompt += msg.content
      }
    }

    const requestId = uuidv4()
    this.currentRequestId = requestId

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      // Send the prompt followed by newline
      this.proc.stdin.write(prompt + '\n', err => {
        if (err) {
          this.pendingRequests.delete(requestId)
          reject(err)
        }
      })

      // Timeout after 60s
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Request timeout'))
        }
      }, 60000)
    })
  }

  /**
   * Kill the worker process
   */
  kill () {
    if (this.proc && this.proc.exitCode === null) {
      console.log(
        `[PersistentWorker ${this.conversationId.slice(0, 8)}] Killing process`
      )
      this.proc.kill('SIGTERM')
    }
  }

  /**
   * Check if process is alive
   */
  isAlive () {
    return this.proc && this.proc.exitCode === null
  }

  /**
   * Get idle time in milliseconds
   */
  getIdleTime () {
    return Date.now() - this.lastUsed
  }
}
