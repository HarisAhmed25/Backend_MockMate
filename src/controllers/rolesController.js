/**
 * Roles Controller
 * Handles job role-related endpoints with intelligent role recognition
 */

const { safeChatCompletion } = require("../utils/openaiClient");
const { getRoleSuggestions: getAISuggestions } = require("../services/roleSuggestionService");

/**
 * Cache for standardized roles and job descriptions
 * Key: normalized input role (lowercase)
 * Value: { 
 *   standardizedRole: string, 
 *   jobDescription: [...], 
 *   timestamp: Date 
 * }
 */
const roleCache = new Map();

/**
 * Cache expiration time: 24 hours
 */
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Normalize and validate role using GPT
 * Returns standardized role name or "INVALID"
 */
async function normalizeAndValidateRole(role) {
  const normalizationPrompt = `
User entered job role: "${role}".

Determine if this refers to a real professional job role.

If yes, return the standardized role title (e.g., "Frontend Developer", "API Developer", "Software QA Engineer", "API Tester").
If no, return "INVALID".

Examples:
- "frontend" → "Frontend Developer"
- "api" → "API Developer"
- "api tester" → "API Tester"
- "qa" or "sqa" → "Software QA Engineer"
- "backend" → "Backend Developer"
- "sales" → "Sales Executive" or "Sales Representative"
- "marketing" → "Marketing Manager" or "Marketing Specialist"
- "xyz123" → "INVALID"
- "asdfgh" → "INVALID"

Return ONLY the standardized role title or "INVALID". Do not include any explanation or additional text.
`;

  try {
    const result = await safeChatCompletion([
      { role: "user", content: normalizationPrompt }
    ]);

    if (result.error) {
      console.error("❌ GPT normalization error:", result.message);
      return "INVALID";
    }

    const response = result.content.trim();

    // Check if response is INVALID
    if (response.toUpperCase().includes('INVALID') || response.length < 3) {
      return "INVALID";
    }

    // Return standardized role (clean up any extra text)
    const standardized = response.split('\n')[0].trim();
    return standardized.length > 2 ? standardized : "INVALID";

  } catch (error) {
    console.error("❌ Error normalizing role with GPT:", error);
    return "INVALID";
  }
}

/**
 * Generate job descriptions for a standardized role using GPT
 * Returns exactly 4-5 bullet points
 */
async function generateJobDescriptionsWithGPT(standardizedRole, experienceLevel, educationLevel, industry) {
  const generationPrompt = `
Generate EXACTLY 4-5 professional job description bullet points for a "${standardizedRole}" position.

Context:
- Role: ${standardizedRole}
- Experience Level: ${experienceLevel || 'Not specified'}
- Education Level: ${educationLevel || 'Not specified'}
- Industry: ${industry || 'Not specified'}

Requirements:
- Generate EXACTLY 4-5 bullet points (no more, no less)
- Each bullet point should be a specific responsibility or task
- Keep each point concise (one sentence, 15-25 words)
- Make it role-specific, experience-aware, and industry-aware
- Focus on day-to-day responsibilities and key skills
- Do NOT include generic filler text
- Do NOT include salary, location, or company-specific details
- Tailor the description to the ${experienceLevel || 'general'} experience level
- Consider the ${industry || 'general'} industry context

Return ONLY a JSON array of EXACTLY 4-5 strings:

[
  "Responsibility or task 1",
  "Responsibility or task 2",
  "Responsibility or task 3",
  "Responsibility or task 4",
  "Responsibility or task 5"
]

Important:
- MUST return exactly 4-5 bullet points
- Do NOT return more than 5 or less than 4
- Each point should be specific and relevant to the role, experience, and industry
`;

  try {
    const result = await safeChatCompletion([
      { role: "user", content: generationPrompt }
    ]);

    if (result.error) {
      console.error("❌ GPT generation error:", result.message);
      return null;
    }

    let parsed = result.content.trim();

    // Remove markdown code blocks if present
    if (parsed.startsWith('```json')) {
      parsed = parsed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (parsed.startsWith('```')) {
      parsed = parsed.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const jobDescriptions = JSON.parse(parsed);

    if (!Array.isArray(jobDescriptions) || jobDescriptions.length < 4 || jobDescriptions.length > 5) {
      throw new Error("Invalid format - must be 4-5 items");
    }

    return jobDescriptions.slice(0, 5); // Ensure max 5

  } catch (error) {
    console.error("❌ Failed to parse GPT response:", error.message);
    return null;
  }
}

/**
 * GET /api/roles/:role/jd
 * Get job descriptions for a specific role
 * 
 * Flow:
 * 1. Normalize and validate role using GPT
 * 2. If INVALID, return error
 * 3. If valid, generate JD using standardized role name
 * 4. Cache result for performance
 */
exports.getJobDescriptions = async (req, res, next) => {
  try {
    const { role } = req.params;
    const { experienceLevel, educationLevel, industry } = req.query; // Optional context

    console.log(`📋 Job Description Request for role: "${role}"`);

    if (!role) {
      return res.status(400).json({
        success: false,
        validRole: false,
        message: "Role parameter is required",
        jobDescription: []
      });
    }

    const inputRole = role.trim();
    const normalizedKey = inputRole.toLowerCase();

    // Check cache first
    const cached = roleCache.get(normalizedKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY_MS) {
      console.log(`✅ Cached result found for: "${inputRole}"`);
      return res.json({
        success: true,
        validRole: true,
        standardizedRole: cached.standardizedRole,
        jobDescription: cached.jobDescription
      });
    }

    // Normalize and validate role using GPT
    console.log(`🔍 Normalizing and validating role: "${inputRole}"`);
    const standardizedRole = await normalizeAndValidateRole(inputRole);

    if (standardizedRole === "INVALID") {
      console.log(`❌ Invalid role: "${inputRole}"`);
      return res.json({
        success: true,
        validRole: false,
        message: "This role does not exist or is not recognized.",
        jobDescription: []
      });
    }

    console.log(`✅ Role standardized: "${inputRole}" → "${standardizedRole}"`);

    // Generate job description using standardized role
    console.log(`📝 Generating job description for: "${standardizedRole}"`);
    const jobDescription = await generateJobDescriptionsWithGPT(
      standardizedRole,
      experienceLevel,
      educationLevel,
      industry
    );

    if (!jobDescription || jobDescription.length === 0) {
      console.error(`❌ Failed to generate JD for: "${standardizedRole}"`);
      return res.json({
        success: true,
        validRole: false,
        message: "Failed to generate job descriptions for this role.",
        jobDescription: []
      });
    }

    // Cache the result
    roleCache.set(normalizedKey, {
      standardizedRole,
      jobDescription,
      timestamp: Date.now()
    });
    console.log(`💾 Cached result for: "${inputRole}" → "${standardizedRole}"`);

    // Return standardized role and job description
    return res.json({
      success: true,
      validRole: true,
      standardizedRole: standardizedRole,
      jobDescription: jobDescription
    });

  } catch (error) {
    console.error("Get job descriptions error:", error);
    next(error);
  }
};

/**
 * GET /api/roles/suggestions
 * Provide role suggestions based on partial input
 */
exports.getRoleSuggestions = async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
      return res.json({
        success: true,
        suggestions: []
      });
    }

    console.log(`🔍 Seeking role suggestions for query: "${query}"`);
    const suggestions = await getAISuggestions(query);

    return res.json({
      success: true,
      query: query,
      suggestions: suggestions
    });

  } catch (error) {
    console.error("Get role suggestions error:", error);
    next(error);
  }
};
