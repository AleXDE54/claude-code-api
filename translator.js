import { v4 as uuidv4 } from 'uuid';

/**
 * Convert OpenAI chat messages to Claude Code stream-json input format
 */
export function openaiToClaudeInput(messages, sessionId) {
  // Extract system prompt if present
  const systemMessages = messages.filter(m => m.role === 'system');
  const otherMessages = messages.filter(m => m.role !== 'system');

  // Combine all messages into a single prompt
  // Claude Code manages its own conversation history via session
  let prompt = '';

  if (systemMessages.length > 0) {
    prompt += systemMessages.map(m => m.content).join('\n') + '\n\n';
  }

  // Get the latest user message (Claude Code maintains history internally)
  const lastUserMessage = otherMessages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    prompt += lastUserMessage.content;
  }

  return {
    type: 'user',
    uuid: uuidv4(),
    session_id: sessionId,
    message: {
      role: 'user',
      content: [{ type: 'text', text: prompt }]
    },
    parent_tool_use_id: null
  };
}

/**
 * Convert Claude Code stream event to OpenAI SSE chunk format
 */
export function claudeToOpenaiChunk(claudeEvent, completionId, model) {
  const chunk = {
    id: completionId,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: null
    }]
  };

  // Handle different Claude event types
  if (claudeEvent.type === 'stream_event') {
    const event = claudeEvent.event;

    if (event?.type === 'content_block_delta') {
      if (event.delta?.type === 'text_delta' && event.delta?.text) {
        chunk.choices[0].delta.content = event.delta.text;
      }
    } else if (event?.type === 'message_start') {
      chunk.choices[0].delta.role = 'assistant';
    }
  } else if (claudeEvent.type === 'assistant') {
    // Full assistant message - extract text content
    const content = claudeEvent.message?.content;
    if (Array.isArray(content)) {
      const textContent = content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('');
      if (textContent) {
        chunk.choices[0].delta.content = textContent;
      }
    }
  } else if (claudeEvent.type === 'message_stop' || claudeEvent.type === 'result') {
    chunk.choices[0].delta = {};
    chunk.choices[0].finish_reason = 'stop';
  }

  return chunk;
}

/**
 * Convert Claude Code result to OpenAI non-streaming response
 */
export function claudeResultToOpenai(resultEvent, assistantMessages, completionId, model) {
  // Collect all text from assistant messages
  let fullContent = '';

  for (const msg of assistantMessages) {
    if (msg.type === 'assistant' && msg.message?.content) {
      const textParts = msg.message.content
        .filter(c => c.type === 'text')
        .map(c => c.text);
      fullContent += textParts.join('');
    }
  }

  // If we have a result event with result text, use that
  if (resultEvent?.result) {
    fullContent = resultEvent.result;
  }

  const response = {
    id: completionId,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: fullContent
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: resultEvent?.usage?.input_tokens || 0,
      completion_tokens: resultEvent?.usage?.output_tokens || 0,
      total_tokens: (resultEvent?.usage?.input_tokens || 0) + (resultEvent?.usage?.output_tokens || 0)
    }
  };

  return response;
}

/**
 * Format an OpenAI SSE chunk for transmission
 */
export function formatSSE(chunk) {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * Format the final SSE done message
 */
export function formatSSEDone() {
  return 'data: [DONE]\n\n';
}

/**
 * Parse a line of NDJSON from Claude Code output
 */
export function parseClaudeLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // Not valid JSON, might be partial or debug output
    return null;
  }
}
