# Install opencode CLI
npm install -g @opencode/cli

# Configure it to use your API
opencode config set apiBaseUrl http://localhost:3001/v1
opencode config set apiKey dummy-key
opencode config set model claude-code

# Start your API server in one terminal
npm start

# Use opencode in another terminal
opencode chat
# or
opencode edit myfile.js "add error handling"
