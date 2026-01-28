import { spawn } from 'child_process'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'

/**
 * OAuth-based worker using rapid -p invocations
 * Uses your OAuth session, not API key
 */
export class OAuthClaudeWorker extends EventEmitter {
  constructor (conversationId, options = {}) {
    super()
    this.conversationId = conversationId || uuidv4()
    this.workspaceDir = options.workspaceDir || process.cwd()
    this.useGlobalClaude = options.useGlobalClaude !== false // Default to true
  }

  /**
   * Send a message using OAuth authentication
   * This uses the -p flag but with your OAuth session instead of API key
   */
  async send (message) {
    return new Promise((resolve, reject) => {
      const args = [
        '-p',
        message, // Put message right after -p
        '--output-format',
        'json',
        '--session-id',
        this.conversationId,
        '--dangerously-skip-permissions'
      ]

      // Use global claude (with OAuth) or local (with API key)
      const claudeCmd = this.useGlobalClaude
        ? process.platform === 'win32'
          ? 'claude.cmd'
          : 'claude'
        : 'node'

      const finalArgs = this.useGlobalClaude
        ? args
        : ['node_modules/@anthropic-ai/claude-code/cli.js', ...args]

      console.log(
        `[OAuth Worker ${
          this.conversationId
        }] Executing: ${claudeCmd} -p "${message.substring(0, 30)}..."`
      )

      const proc = spawn(claudeCmd, this.useGlobalClaude ? args : finalArgs, {
        cwd: this.workspaceDir,
        env: {
          ...process.env,
          // Remove API key to force OAuth (only for global claude)
          ...(this.useGlobalClaude && { ANTHROPIC_API_KEY: undefined }),
          TERM: 'dumb',
          NO_COLOR: '1'
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32' && this.useGlobalClaude
      })

      let stdoutData = ''
      let stderrData = ''

      proc.stdout.on('data', data => {
        stdoutData += data.toString()
      })

      proc.stderr.on('data', data => {
        stderrData += data.toString()
      })

      proc.on('close', code => {
        if (code !== 0) {
          console.error(`[OAuth Worker] Process failed with code ${code}`)
          console.error(`[OAuth Worker] stderr: ${stderrData}`)
          reject(
            new Error(`Claude process exited with code ${code}: ${stderrData}`)
          )
          return
        }

        try {
          const result = JSON.parse(stdoutData)
          resolve(result)
        } catch (error) {
          console.error(
            `[OAuth Worker] Failed to parse JSON: ${stdoutData.substring(
              0,
              200
            )}`
          )
          reject(new Error(`Failed to parse Claude response: ${error.message}`))
        }
      })

      proc.on('error', error => {
        console.error(`[OAuth Worker] Spawn error:`, error)
        reject(error)
      })
    })
  }

  async close () {
    // No persistent process to close
  }
}
