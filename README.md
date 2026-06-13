# Claude Code API

OpenAI-compatible API wrapper for Claude Code CLI. Enables any OpenAI-compatible client (like [opencode](https://github.com/sst/opencode)) to use Claude Code's full capabilities including file editing, bash execution, and tool use.

## Features

- **OpenAI-compatible API** - Works with any client that supports OpenAI's chat completions API
- **Hybrid pool architecture** - Hot workers for active conversations, automatic eviction of idle workers
- **Conversation persistence** - Sessions saved to disk, can be resumed later
- **Streaming support** - Real-time SSE streaming responses
- **Docker ready** - Easy deployment with Docker Compose

## Quick Start

1. **Clone and configure:**
   ```bash
   cd claude-code-api
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

2. **Start with Docker Compose:**
   ```bash
   docker compose up -d
   ```

3. **Test the API:**
   ```bash
   curl http://localhost:3000/health

   curl -X POST http://localhost:3000/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"model":"claude-code","messages":[{"role":"user","content":"Hello!"}]}'
   ```

## API Endpoints

### Chat Completions (OpenAI-compatible)
```
POST /v1/chat/completions
```

**Request:**
```json
{
  "model": "claude-code",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": false
}
```

**Conversation ID:** Specify via:
- `X-Conversation-ID` header (recommended)
- Model suffix: `"model": "claude-code:my-conversation"`
- Auto-generated if not provided

### Other Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check and stats |
| `/v1/models` | GET | List available models |
| `/conversations` | GET | List active conversations |
| `/conversations/:id` | DELETE | Evict a conversation |

## Configuration with opencode

Add to your `opencode.json`:

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

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | (required) | Your Anthropic API key |
| `POOL_SIZE` | 5 | Maximum concurrent workers |
| `IDLE_TIMEOUT_MS` | 300000 | Worker idle timeout (5 min) |
| `PORT` | 3000 | Server port |
| `WORKSPACE_DIR` | /workspace | Working directory for Claude |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Container                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │           Express.js API Server (server.js)         │     │
│  │  POST /v1/chat/completions (OpenAI-compatible)     │     │
│  └────────────────────────┬───────────────────────────┘     │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────┐     │
│  │           Hybrid Pool Manager (pool.js)             │     │
│  │  - Session affinity routing                         │     │
│  │  - LRU eviction when at capacity                   │     │
│  │  - Automatic idle cleanup                          │     │
│  └────────────────────────┬───────────────────────────┘     │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────┐     │
│  │           Claude Code Workers (worker.js)           │     │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐            │     │
│  │  │Worker 1 │  │Worker 2 │  │Worker 3 │  ...       │     │
│  │  │conv-abc │  │conv-xyz │  │ (idle)  │            │     │
│  │  └─────────┘  └─────────┘  └─────────┘            │     │
│  │                                                     │     │
│  │  claude -p --input-format stream-json              │     │
│  │           --output-format stream-json              │     │
│  │           --session-id <conversation-id>           │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                              │
│  Session Storage: /root/.claude/                             │
└──────────────────────────────────────────────────────────────┘
```

## Development

**Run locally (without Docker):**
```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npm start
```

**Run with file watching:**
```bash
npm run dev
```

## License

MIT
