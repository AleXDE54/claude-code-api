import { spawn } from 'child_process'
import inspector from 'inspector'
import { EventEmitter } from 'events'

/**
 * Inspector-based Claude Worker
 * Spawns Claude with --inspect and uses Chrome DevTools Protocol to:
 * - Intercept function calls
 * - Override methods
 * - Inject messages programmatically
 * - Monitor memory usage
 */
export class InspectorClaudeWorker extends EventEmitter {
  constructor (conversationId, options = {}) {
    super()
    this.conversationId = conversationId
    this.workspaceDir = options.workspaceDir || process.cwd()
    this.proc = null
    this.session = null
    this.inspectorPort = options.inspectorPort || 9229
  }

  /**
   * Spawn Claude with debugging enabled
   */
  async spawn () {
    const claudeCmd = process.platform === 'win32' ? 'claude.cmd' : 'claude'

    // Check if claude is a Node.js app (it likely is since it's @anthropic-ai/claude-code)
    const args = [
      '--session-id',
      this.conversationId,
      '--dangerously-skip-permissions'
    ]

    // Spawn with NODE_OPTIONS to enable inspector
    this.proc = spawn(claudeCmd, args, {
      cwd: this.workspaceDir,
      env: {
        ...process.env,
        NODE_OPTIONS: `--inspect=${this.inspectorPort}`
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: process.platform === 'win32'
    })

    console.log(
      `[InspectorWorker] Spawned Claude with inspector on port ${this.inspectorPort}`
    )

    // Wait for inspector to be ready
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Connect to inspector
    await this.connectInspector()
  }

  /**
   * Connect to the Claude process via inspector protocol
   */
  async connectInspector () {
    const WebSocket = (await import('ws')).default
    const ws = new WebSocket(`ws://localhost:${this.inspectorPort}`)

    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        console.log('[InspectorWorker] Connected to inspector')
        this.ws = ws

        ws.on('message', data => {
          this.handleInspectorMessage(JSON.parse(data))
        })

        resolve()
      })

      ws.on('error', reject)
    })
  }

  /**
   * Handle inspector protocol messages
   */
  handleInspectorMessage (message) {
    console.log('[InspectorWorker] Inspector message:', message)
    this.emit('inspector-message', message)
  }

  /**
   * Inject JavaScript into the running Claude process
   */
  async injectCode (code) {
    if (!this.ws) {
      throw new Error('Inspector not connected')
    }

    const message = {
      id: Date.now(),
      method: 'Runtime.evaluate',
      params: {
        expression: code,
        returnByValue: true
      }
    }

    this.ws.send(JSON.stringify(message))

    return new Promise(resolve => {
      const handler = data => {
        const response = JSON.parse(data)
        if (response.id === message.id) {
          this.ws.off('message', handler)
          resolve(response.result)
        }
      }
      this.ws.on('message', handler)
    })
  }

  /**
   * Override a function in the Claude process
   */
  async overrideFunction (functionPath, newImplementation) {
    const code = `
      ${functionPath} = ${newImplementation.toString()};
    `
    return this.injectCode(code)
  }

  /**
   * Get memory usage of Claude process
   */
  async getMemoryUsage () {
    const result = await this.injectCode(`
      JSON.stringify(process.memoryUsage())
    `)
    return JSON.parse(result.value)
  }

  /**
   * Take heap snapshot
   */
  async takeHeapSnapshot () {
    const v8 = require('v8')
    const fs = require('fs')
    const path = require('path')

    const filename = path.join(
      this.workspaceDir,
      `heap-${this.conversationId}-${Date.now()}.heapsnapshot`
    )

    await this.injectCode(`
      const v8 = require('v8');
      const fs = require('fs');
      v8.writeHeapSnapshot('${filename}');
    `)

    return filename
  }

  kill () {
    if (this.ws) {
      this.ws.close()
    }
    if (this.proc) {
      this.proc.kill()
    }
  }
}
