// test-chat.js - Test the chat completions endpoint
const http = require('http')

const requestData = JSON.stringify({
  model: 'claude-code',
  messages: [{ role: 'user', content: 'Hello, what can you do?' }]
})

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(requestData)
  }
}

console.log('Sending request to chat completions endpoint...\n')

const req = http.request(options, res => {
  console.log(`Status: ${res.statusCode}\n`)

  let data = ''
  res.on('data', chunk => {
    data += chunk
  })

  res.on('end', () => {
    try {
      const response = JSON.parse(data)
      console.log('Response:')
      console.log(JSON.stringify(response, null, 2))
    } catch (e) {
      console.log('Raw response:')
      console.log(data)
    }
  })
})

req.on('error', error => {
  console.error('Error:', error.message)
})

req.write(requestData)
req.end()
