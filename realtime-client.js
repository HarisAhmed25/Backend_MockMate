// realtime-client.js
// Simple OpenAI Realtime WebSocket client for manual testing.
// Usage:
// 1) install dependencies: npm install ws dotenv
// 2) set OPENAI_API_KEY in .env or in the environment
// 3) run: node realtime-client.js

const WebSocket = require('ws');
require('dotenv').config();

const OPENAI_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_KEY) {
  console.error('Missing OPENAI_API_KEY in environment. Add it to your .env or shell.');
  process.exit(1);
}

// Replace with the correct realtime-capable model name if different
const MODEL = 'gpt-realtime';
const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(MODEL)}`;

function connect() {
  const ws = new WebSocket(url, {
    headers: {
      Authorization: 'Bearer ' + OPENAI_KEY,
      // If your OpenAI account/preview requires it, you may need an extra header such as:
      // 'OpenAI-Beta': 'realtime=v1'
    },
  });

  let assembled = '';
  let keepAliveInterval = null;

  ws.on('open', () => {
    console.log('[open] connected to OpenAI Realtime');

    // Optional: set session-level instructions that persist for this WS session
    ws.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          type: 'realtime',
          instructions: 'Be extra helpful and concise.',
        },
      })
    );

    // Send a text input. Event name may vary by API version (input_text / input)
    ws.send(
      JSON.stringify({
        type: 'input_text',
        input: {
          text: 'Give me 3 quick interview questions about JavaScript promises.',
        },
      })
    );

    // keepalive: send pings using ws ping or application-level ping
    keepAliveInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 15000);
  });

  ws.on('message', (raw) => {
    let event;
    try {
      event = JSON.parse(raw.toString());
    } catch (err) {
      console.warn('[message] non-JSON message:', raw.toString());
      return;
    }

    // Handle common realtime event types. Event names may differ; check OpenAI realtime docs.
    const t = event.type;
    if (t === 'response.delta') {
      // incremental content
      const chunk = (event.delta && (event.delta.content || event.delta.text)) || '';
      if (chunk) {
        assembled += chunk;
        process.stdout.write(chunk); // stream to console
      }
    } else if (t === 'response.completed') {
      console.log('\n\n[completed] full response:');
      console.log(assembled);
      // Optionally close after completion
      // ws.close();
    } else if (t === 'response.error' || event.error) {
      console.error('[error]', event.error || event);
    } else {
      // Debug other events
      console.log('[event]', event);
    }
  });

  ws.on('close', (code, reason) => {
    console.log('[close] code=', code, 'reason=', reason && reason.toString());
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    // simple reconnect backoff
    setTimeout(() => {
      console.log('[reconnect] reconnecting...');
      connect();
    }, 2000);
  });

  ws.on('error', (err) => {
    console.error('[error] ws error:', err && err.message ? err.message : err);
  });

  ws.on('pong', () => {
    // optional: monitor pongs if you need liveness info
  });

  return ws;
}

connect();
