const { safeChatCompletion } = require("../utils/openaiClient");

/**
 * POST /api/help/chat
 * Handle chat completions for help page
 */
exports.chat = async (req, res, next) => {
  try {
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ 
        message: "Message is required and must be a string" 
      });
    }

    // Build messages array from conversation history
    const messages = [];
    
    // Add conversation history if provided
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role,
            content: msg.content
          });
        }
      });
    }

    // Add current user message
    messages.push({
      role: "user",
      content: message
    });

    // Call OpenAI API
    const result = await safeChatCompletion(messages);

    if (result.error) {
      return res.status(500).json({
        message: result.message || "Failed to get response from AI",
        details: result.details
      });
    }

    // Return response (support both 'message' and 'response' field names for compatibility)
    return res.json({
      message: result.content,
      response: result.content
    });

  } catch (err) {
    next(err);
  }
};

