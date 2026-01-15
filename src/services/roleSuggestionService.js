/**
 * Role Suggestion Service
 * Uses OpenAI to provide job role suggestions based on partial input
 */

const { safeChatCompletion } = require("../utils/openaiClient");

/**
 * Get role suggestions based on query
 * @param {string} query - Partial role name (e.g., "fro", "pyt")
 * @returns {Promise<string[]>} - Array of suggested role titles
 */
async function getRoleSuggestions(query) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const prompt = `
The user is typing a job role and needs suggestions for its completion. 
Partial input: "${query}"

Provide exactly 5 highly relevant, professional, and authentic job role titles that start with or are closely related to this partial input.
Focus on common industry standard roles.

Return ONLY a JSON array of 5 strings. No explanation.

Example Input: "fro"
Example Output: ["Frontend Developer", "Front-end Engineer", "Front end Web Developer", "Frontend Architect", "Frontend Lead"]

Example Input: "pyt"
Example Output: ["Python Developer", "Python Engineer", "Backend Python Developer", "Data Scientist (Python)", "Python Automation Engineer"]
`;

  try {
    const result = await safeChatCompletion([
      { role: "user", content: prompt }
    ]);

    if (result.error) {
      console.error("❌ Role suggestion GPT error:", result.message);
      return [];
    }

    let parsed = result.content.trim();

    // Remove markdown code blocks if present
    if (parsed.startsWith('```json')) {
      parsed = parsed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (parsed.startsWith('```')) {
      parsed = parsed.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const suggestions = JSON.parse(parsed);

    if (Array.isArray(suggestions)) {
      return suggestions.slice(0, 5);
    }
    
    return [];

  } catch (error) {
    console.error("❌ Error getting role suggestions:", error);
    return [];
  }
}

module.exports = {
  getRoleSuggestions
};
