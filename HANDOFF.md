# Claude Code API - Handoff Document

## ✅ PROJECT STATUS: FUNCTIONAL

**Last Updated:** January 27, 2026  
**Status:** Using local Claude Code installation  
**Ready For:** Local development use, Docker testing

### Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Set environment variables in .env
ANTHROPIC_API_KEY=your-key-here
PORT=3001
WORKSPACE_DIR=C:\Users\benam\claude-code-api\workspace

# 3. Start server
npm start

# 4. Test
curl -X POST http://localhost:3001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-code","messages":[{"role":"user","content":"Hello"}]}'
```

## Project Overview

This project creates a **Dockerized OpenAI-compatible API wrapper** for Claude Code CLI. It enables any OpenAI-compatible client (like [opencode](https://github.com/sst/opencode)) to use Claude Code's full capabilities including file editing, bash execution, and tool use.

## Architecture Decision

After evaluating three approaches:
1. **Resume from Disk (Stateless)** - Spawn process per request, resume from saved session
2. **Persistent Workers** - Keep workers alive, route conversations to same worker
3. **Hybrid Approach** ✓ (Selected)

The **hybrid approach** was chosen because it provides:
- Hot workers for active conversations (instant responses)
- Automatic eviction of idle workers (no memory waste)
- Disk-based session persistence for fault tolerance
- Named conversations via `X-Conversation-ID` header

## Local Claude Installation

**✅ SUCCESS:** Claude Code is now installed as a local npm package instead of relying on global installation.

### Benefits:
- **Isolation:** No conflict with your global Claude Code installation
- **Version Control:** Package version is tracked in package.json
- **Portability:** Anyone cloning the repo gets the exact same version
- **Docker Ready:** Will work in Docker without requiring separate Claude install

### Package Details:
- **Package:** `@anthropic-ai/claude-code@2.1.21`
- **Location:** `node_modules/@anthropic-ai/claude-code/cli.js`
- **Execution:** `node node_modules/@anthropic-ai/claude-code/cli.js [args]`

### Implementation:
```javascript
// worker.js now uses local installation
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLAUDE_CLI_PATH = join(__dirname, 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');

// Spawn with node instead of claude.cmd
spawn('node', [CLAUDE_CLI_PATH, ...args], {...})
```

### Cannot Import as Module:
The Claude Code package is **CLI-only** - it provides no ES module exports. Analysis revealed:
- ❌ No `main` field in package.json
- ❌ No `exports` field in package.json  
- ❌ CLI file (cli.js) is heavily minified/bundled
- ✅ Only provides binary: `"claude": "cli.js"`

This means the spawn-per-request architecture remains the best approach. Direct module import is not possible.

## Current Implementation Status

### ✅ Completed

| Component | File | Status |
|-----------|------|--------|
| Package configuration | `package.json` | ✅ Complete + dotenv added |
| Format translator | `translator.js` | ✅ Complete |
| Worker class | `worker.js` | ✅ Complete + local Claude path |
| Hybrid pool manager | `pool.js` | ✅ Complete + Debug logging |
| Express API server | `server.js` | ✅ Complete + dotenv support |
| Dockerfile | `Dockerfile` | ✅ Complete |
| Docker Compose | `docker-compose.yml` | ✅ Complete |
| Environment template | `.env.example` | ✅ Complete |
| Environment config | `.env` | ✅ Created with API key |
| README | `README.md` | ✅ Complete |
| Git ignore | `.gitignore` | ✅ Complete |
| npm dependencies | `node_modules/` | ✅ Installed (73 packages) |
| Local Claude Code | `@anthropic-ai/claude-code` | ✅ Installed as dependency |

### ✅ Windows Compatibility Fixes Applied
- Changed from `claude.cmd` to `node <cli-path>` (no shell needed)
- Added `windowsHide: true` for cleaner process spawning
- Uses `--output-format json` (not stream-json)
- Pass prompt as command-line argument
- Fixed double-spawn issue in pool.js
- Set WORKSPACE_DIR to `C:\Users\benam\claude-code-api\workspace`
- Changed PORT to 3001 (port 3000 occupied by WSL)
- Added dotenv support for .env file loading

### ✅ Architecture Changes from Testing
**Original Plan:** Persistent workers with stream-json I/O  
**Actual Implementation:** Spawn new process per request with JSON output

**Why:** Claude CLI's stream-json mode expects continuous streaming input, but we need request-response pattern. Using `--output-format json` with prompt as CLI argument is simpler and more reliable.

**Impact:** Each request spawns a fresh Claude process, but session continuity is maintained via `--session-id` flag, which Claude persists to disk automatically.

### ✅ Successfully Tested (January 27, 2026)

**Core Features Working:**
- ✅ Health check endpoint (`GET /health`)
- ✅ Models endpoint (`GET /v1/models`) 
- ✅ Non-streaming chat completions (`POST /v1/chat/completions`)
- ✅ OpenAI-compatible response format (validated)
- ✅ Proper token usage reporting
- ✅ Claude CLI integration via JSON output format (now using local install)
- ✅ Custom conversation IDs via X-Conversation-ID header (must be valid UUIDs)
- ✅ Auto-generation of conversation UUIDs when none provided

**Validation Test Results:**
```powershell
.\test-validation.ps1
Test 1: Health Check...               ✅ PASS
Test 2: Models Endpoint...            ✅ PASS
Test 3: Simple Chat Completion...     ✅ PASS
Test 4: OpenAI Format Compatibility.. ✅ PASS
Test 5: Custom Conversation ID...     ✅ PASS
```
**Example Response:**
```json
{
  "id": "chatcmpl-e9f42593",
  "object": "chat.completion",
  "created": 1769571827,
  "model": "claude-code",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! I'm Claude Code, an AI assistant..."
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 3,
    "completion_tokens": 83,
    "total_tokens": 86
  }
}
```

### ⏳ Not Yet Tested / Not Implemented

**Not Tested:**
- Docker container build and run
- Integration with opencode client
- File editing capabilities via Claude
- Bash command execution via Claude
- Worker pool cleanup/eviction after idle timeout

**Not Implemented (requires architecture changes):**
- ✗ Streaming responses (SSE format) - Current JSON output mode doesn't support streaming. Would require reverting to stream-json input/output or implementing chunked reading of JSON output.
- ✗ Conversation continuity with rapid requests - Claude CLI `-p` mode locks sessions, preventing immediate successive requests. Workarounds: add delays, implement request queue, or use long-running interactive mode.

**Implementation Notes for Streaming:**
To add streaming support, would need to:
1. Revert worker.js to use `--output-format stream-json` 
2. Fix stdin/stdout communication (requires sending complete message then possibly closing stdin)
3. Parse streaming events line-by-line
4. Handle session locking issues
Alternatively: Keep one long-running Claude process per conversation and pipe messages through it (closer to original persistent worker design)

## Project Location

```
C:\Users\benam\claude-code-api\
├── package.json           # Dependencies: express, uuid, cors
├── translator.js          # OpenAI <-> Claude format conversion
├── worker.js              # ClaudeWorker class (spawn, send, kill)
├── pool.js                # HybridPool manager (LRU eviction, session affinity)
├── server.js              # Express server with OpenAI-compatible endpoints
├── Dockerfile             # Based on node:20-bookworm + Claude Code
├── docker-compose.yml     # Service definition with volume mounts
├── .env.example           # Environment variable template
├── README.md              # Usage documentation
├── .gitignore
├── workspace/             # Mount point for project files
└── node_modules/          # Installed dependencies
```

## Key Design Decisions

1. **Authentication**: Open access (no API key) - container runs on private/trusted network
2. **Workspace**: Mounted volume at `/workspace` - Claude can edit actual project files
3. **Permissions**: `--dangerously-skip-permissions` - container provides sandboxing
4. **Conversation ID**: Via `X-Conversation-ID` header or auto-generated UUID

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/chat/completions` | POST | OpenAI-compatible chat (streaming or non-streaming) |
| `/v1/models` | GET | List available models |
| `/health` | GET | Health check |
| `/conversations` | GET | List active conversations (admin) |
| `/conversations/:id` | DELETE | Evict conversation from pool (admin) |

## Configuration (Environment Variables)

```bash
ANTHROPIC_API_KEY=sk-ant-...   # Required: Claude API key
POOL_SIZE=5                     # Max concurrent workers (default: 5)
IDLE_TIMEOUT_MS=300000         # Idle timeout before eviction (default: 5 min)
PORT=3000                       # Server port (default: 3000)
```

## Next Steps to Complete

### 1. Test Chat Completions Locally
```bash
cd ~/claude-code-api
export ANTHROPIC_API_KEY=sk-ant-...
node server.js &

# Test non-streaming
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-code","messages":[{"role":"user","content":"Hello, what can you do?"}]}'

# Test streaming
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-code","messages":[{"role":"user","content":"Count to 5"}],"stream":true}'
```

### 2. Test Conversation Continuity
```bash
# First message
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-Conversation-ID: test-conv" \
  -d '{"model":"claude-code","messages":[{"role":"user","content":"My name is Alice"}]}'

# Follow-up (should remember name)
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-Conversation-ID: test-conv" \
  -d '{"model":"claude-code","messages":[{"role":"user","content":"What is my name?"}]}'
```

### 3. Build and Test Docker Container
```bash
cd ~/claude-code-api
cp .env.example .env
# Edit .env to add ANTHROPIC_API_KEY

docker-compose build
docker-compose up -d
docker logs -f claude-code-api
```

### 4. Test with OpenCode Client
Configure `opencode.json`:
```json
{
  "provider": {
    "claude-code": {
      "npm": "@ai-sdk/openai-compatible",
      "options": {
        "baseURL": "http://localhost:3000/v1"
      },
      "models": {
        "claude-code": {
          "limit": {
            "context": 200000,
            "output": 64000
          }
        }
      }
    }
  }
}
```

## Known Issues / Considerations

1. **Claude Code CLI is minified** - Debugging stream-json format may be challenging
2. **Windows environment** - Current development is on Windows (MSYS_NT), Docker testing needed
3. **Session locking with -p mode** - Claude CLI locks sessions when using `-p --session-id`, causing "Session already in use" errors on rapid successive requests. This affects conversation continuity.
   - **Workaround options:**
     - Wait 5-10 seconds between requests to same session
     - Use `--no-session-persistence` flag (loses conversation history)
     - Implement queue/retry logic in the pool
     - Consider using interactive mode without `-p` for long-running workers
4. **Error handling** - Basic error handling implemented; may need enhancement for production
5. **UUID validation** - Server now validates conversation IDs must be valid UUIDs (Claude CLI requirement)

## Reference Materials

- Plan file: `.claude/plans/moonlit-wishing-music.md`
- Claude Code devcontainer: https://github.com/anthropics/claude-code/blob/main/.devcontainer/Dockerfile
- OpenCode repo: https://github.com/sst/opencode
- OpenCode docs: https://opencode.ai/docs/providers

## Original Requirements Summary

The user wanted:
1. A way to **resume conversations** by name (preserving context)
2. **Hybrid approach** with hot workers for active conversations and cold resume for inactive
3. **Dockerized** deployment based on Claude Code's devcontainer
4. **OpenAI-compatible API** callable by opencode client
5. Open access (no API key auth) since container runs on trusted network
