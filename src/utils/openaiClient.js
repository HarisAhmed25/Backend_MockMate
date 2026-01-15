/**
 * Safe OpenAI Client Wrapper
 * - Stable error handling
 * - Supports fallback models
 * - Works perfectly with questionGenerator.js
 */

const OpenAI = require("openai");

// Load API key
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Initialize client
let client = null;

if (OPENAI_KEY) {
  try {
    client = new OpenAI({ apiKey: OPENAI_KEY });
    console.log("✅ OpenAI client initialized");
  } catch (err) {
    console.error("❌ Failed to initialize OpenAI client:", err.message);
  }
} else {
  console.warn("⚠️ OPENAI_API_KEY missing → AI features disabled");
}

/**
 * Preferred model list (fallback mechanism)
 */
const MODEL_PRIORITY = [
  "gpt-4o-mini",
  "gpt-4o-mini-chat",
  "gpt-4o",
  "gpt-3.5-turbo"
];

/**
 * Safe wrapper for Chat Completions
 */
async function safeChatCompletion(messages, model = MODEL_PRIORITY[0]) {
  if (!client) {
    return {
      error: true,
      message: "OpenAI API key is missing."
    };
  }

  let lastError = null;

  for (const currentModel of MODEL_PRIORITY) {
    try {
      console.log(`🔵 Trying model: ${currentModel}`);

      const response = await client.chat.completions.create({
        model: currentModel,
        messages,
        temperature: 0.8
      });

      // Defensive check for unexpected OpenAI response format
      const content =
        response?.choices?.[0]?.message?.content || null;

      if (!content) {
        throw new Error("OpenAI response missing content field.");
      }

      console.log(`🟢 Model succeeded: ${currentModel}`);
      return { error: false, content };

    } catch (err) {
      console.error(`❌ Model failed (${currentModel}):`, err.message);
      lastError = err;
    }
  }

  // All models failed
  return {
    error: true,
    message: "All OpenAI models failed.",
    details: lastError?.message || "Unknown error"
  };
}

/**
 * Safe wrapper for Text-to-Speech
 */
async function safeTextToSpeech(text, voice = "alloy") {
  if (!client) {
    return {
      error: true,
      message: "OpenAI API key is missing."
    };
  }

  try {
    console.log(`🔵 Generating TTS for text (length: ${text.length}), voice: ${voice}`);

    const mp3 = await client.audio.speech.create({
      model: "tts-1",
      voice: voice,
      input: text,
    });

    // Convert response to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    console.log(`🟢 TTS generated successfully (${buffer.length} bytes)`);
    return { error: false, buffer };

  } catch (err) {
    console.error(`❌ TTS generation failed:`, err.message);
    return {
      error: true,
      message: "TTS generation failed.",
      details: err.message
    };
  }
}

module.exports = {
  openaiClient: client,
  safeChatCompletion,
  safeTextToSpeech
};
