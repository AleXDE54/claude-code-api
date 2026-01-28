# Testing with opencode VS Code Extension

## What is opencode?
opencode is an open-source VS Code extension (from https://github.com/sst/opencode) that provides AI coding assistance using any OpenAI-compatible API.

## Setup Instructions

### 1. Install opencode Extension
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "opencode" or "sst.opencode"
4. Click Install

OR install from command line:
```bash
code --install-extension sst.opencode
```

### 2. Configure opencode to Use Your API

Press `Ctrl+,` to open Settings, then search for "opencode" and configure:

#### Option A: Via VS Code Settings UI
- **Opencode: API Base URL**: `http://localhost:3001/v1`
- **Opencode: API Key**: `dummy-key` (can be anything, we don't validate it)
- **Opencode: Model**: `claude-code` (or `claude-sonnet-4`)

#### Option B: Via settings.json
Press `Ctrl+Shift+P`, type "Preferences: Open User Settings (JSON)", and add:

```json
{
  "opencode.apiBaseUrl": "http://localhost:3001/v1",
  "opencode.apiKey": "dummy-key",
  "opencode.model": "claude-code"
}
```

### 3. Start Your API Server
```bash
npm start
```

Make sure you see:
```
Claude Code API server listening on port 3001
Chat endpoint: http://localhost:3001/v1/chat/completions
```

### 4. Use opencode in VS Code

#### Method 1: Inline Chat
1. Open any code file
2. Press `Ctrl+I` (or Cmd+I on Mac)
3. Type your request, e.g., "Write a function to calculate fibonacci"
4. opencode will send the request to your API → Claude Code!

#### Method 2: Chat Panel
1. Click the chat icon in the sidebar (or press `Ctrl+Shift+P` and search "Open Chat")
2. Ask questions about your code
3. All requests go through your API to Claude Code

#### Method 3: Quick Actions
- Select code and press `Ctrl+K` for quick AI actions
- Right-click code and choose "Ask opencode"

## Testing Both Modes

### Test OAuth Mode
```bash
# In .env, set:
AUTH_MODE=oauth
# (comment out ANTHROPIC_API_KEY)
```
Restart server, then use opencode - it will use your Claude OAuth session!

### Test API Key Mode
```bash
# In .env, set:
AUTH_MODE=apikey
ANTHROPIC_API_KEY=sk-ant-...
```
Restart server, then use opencode - it will use the API key.

## Verification

When you use opencode, you should see logs in your server terminal:
```
[Pool] Creating worker for conversation 12345678-1234-...
[Worker abc123] OAuth mode: claude.cmd -p "..."
```

This confirms opencode → Your API → Claude Code is working!

## Troubleshooting

### "Connection Failed" in opencode
- Verify server is running on port 3001
- Check the API base URL is exactly: `http://localhost:3001/v1`
- Make sure there's no trailing slash

### "Model not found"
- Set the model to `claude-code` or `claude-sonnet-4`
- These match the models returned by `/v1/models` endpoint

### No response from Claude
- Check server logs for errors
- Verify AUTH_MODE is set correctly
- For OAuth mode, ensure `claude` command works without API key

## Example Workflow

1. Start server: `npm start`
2. Open VS Code with opencode installed
3. Open a Python file
4. Press `Ctrl+I` and type: "Add error handling to this function"
5. Watch the magic! Your request flows through:
   - opencode → localhost:3001 → Claude Code → AI response → back to opencode
