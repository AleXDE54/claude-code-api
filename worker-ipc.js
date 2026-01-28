import { fork } from 'child_process'
import { EventEmitter } from 'events'

/**
 * IPC-based Claude Worker
 * If Claude can be forked as a Node.js module, use IPC for clean message passing
 */
export class IPCClaudeWorker extends EventEmitter {
  constructor (conversationId, options = {}) {
    super()
    this.conversationId = conversationId
    this.workspaceDir = options.workspaceDir || process.cwd()
    this.proc = null
    this.pendingRequests = new Map()
  }

  /**
   * Fork Claude as a child process with IPC channel
   */
  async spawn () {
    // Try to fork Claude's main module directly
    const claudePath = require.resolve('@anthropic-ai/claude-code/cli.js')

    this.proc = fork(
      claudePath,
      ['--session-id', this.conversationId, '--dangerously-skip-permissions'],
      {
        cwd: this.workspaceDir,
        env: {
          ...process.env,
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY
        },
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'] // Enable IPC channel
      }
    )

    console.log(
      `[IPCWorker ${this.conversationId.slice(0, 8)}] Forked with IPC`
    )

    // Listen for messages via IPC
    this.proc.on('message', message => {
      this.handleIPCMessage(message)
    })

    this.proc.on('exit', code => {
      console.log(
        `[IPCWorker ${this.conversationId.slice(0, 8)}] Exited: ${code}`
      )
      this.emit('exit', code)
    })

    // Wait for ready signal
    await this.waitForReady()
  }

  /**
   * Wait for Claude to send ready signal
   */
  async waitForReady (timeout = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Timeout waiting for ready'))
      }, timeout)

      const handler = message => {
        if (message.type === 'ready') {
          clearTimeout(timer)
          this.proc.off('message', handler)
          resolve()
        }
      }

      this.proc.on('message', handler)
    })
  }

  /**
   * Handle IPC messages from Claude
   */
  handleIPCMessage (message) {
    console.log(`[IPCWorker] Received:`, message.type)

    if (message.type === 'response' && message.requestId) {
      const pending = this.pendingRequests.get(message.requestId)
      if (pending) {
        pending.resolve(message.data)
        this.pendingRequests.delete(message.requestId)
      }
    }

    this.emit('message', message)
  }

  /**
   * Send message to Claude via IPC
   */
  async send (messages, model = 'claude-code') {
    const requestId = Date.now().toString()

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      // Send via IPC channel
      this.proc.send({
        type: 'request',
        requestId,
        messages,
        model
      })

      // Timeout
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          reject(new Error('Request timeout'))
        }
      }, 60000)
    })
  }

  kill () {
    if (this.proc) {
      this.proc.kill()
    }
  }
}

/**
 * Alternative: Wrapper script that mediates between API and Claude
 * Run this as: node claude-ipc-wrapper.js
 */
export function createIPCWrapper () {
  // This would be a separate file that Claude spawns
  return `
const { spawn } = require('child_process');

// Start Claude
const claude = spawn('claude', process.argv.slice(2), {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Forward stdin from parent to Claude
process.stdin.pipe(claude.stdin);

// Parse Claude output and send to parent via IPC
claude.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    process.send({ type: 'response', data: response });
  } catch (e) {
    // Not JSON, might be partial
    process.send({ type: 'output', data: data.toString() });
  }
});

claude.stderr.on('data', (data) => {
  process.send({ type: 'error', data: data.toString() });
});

// Listen for messages from parent
process.on('message', (message) => {
  if (message.type === 'input') {
    claude.stdin.write(message.data + '\\n');
  }
});

// Signal ready
process.send({ type: 'ready' });
  `
}
