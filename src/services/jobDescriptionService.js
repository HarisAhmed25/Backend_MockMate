/**
 * Shared Job Description Generation Service
 * Used by both manual setup and resume upload flows
 */

const { safeChatCompletion } = require("../utils/openaiClient");

/**
 * Static fallback job descriptions for common roles
 * Used when GPT fails or as immediate fallback
 */
const STATIC_JOB_DESCRIPTIONS = {
  'backend': (exp) => [
    exp === 'entry level' 
      ? "Learn and implement basic server-side logic and database operations"
      : exp === 'senior level'
      ? "Design and architect scalable microservices and distributed systems"
      : "Design and develop scalable server-side applications and RESTful APIs",
    "Implement database schemas, queries, and optimize database performance",
    "Build secure authentication and authorization systems",
    "Handle server-side logic, business rules, and data processing",
    "Integrate third-party services and external APIs"
  ],
  'frontend': (exp) => [
    exp === 'entry level'
      ? "Learn and implement responsive user interfaces using HTML, CSS, and JavaScript"
      : exp === 'senior level'
      ? "Architect and lead frontend development for complex applications"
      : "Build responsive and interactive user interfaces using modern frameworks",
    "Implement pixel-perfect designs with HTML, CSS, and JavaScript",
    "Optimize application performance and ensure cross-browser compatibility",
    "Collaborate with designers and backend developers to integrate APIs",
    "Write clean, maintainable code following best practices and design patterns"
  ],
  'sqa': (exp) => [
    exp === 'entry level'
      ? "Learn and execute basic test cases and report bugs"
      : exp === 'senior level'
      ? "Lead QA strategy and mentor junior testers"
      : "Design and execute comprehensive test plans and test cases",
    "Perform manual and automated testing across different platforms",
    "Identify, document, and track software defects and issues",
    "Collaborate with developers to ensure quality standards",
    "Create and maintain test documentation and reports"
  ]
};

/**
 * Normalize and validate role using GPT
 * Returns standardized role name or original role if validation fails
 */
async function normalizeAndValidateRole(role) {
  if (!role || role.trim().length < 2) {
    return role; // Return as-is if too short
  }

  const normalizationPrompt = `
User entered job role: "${role}".

Determine if this refers to a real professional job role.

If yes, return the standardized role title (e.g., "Frontend Developer", "API Developer", "Software QA Engineer").
If no, return the original role as-is.

Examples:
- "frontend" → "Frontend Developer"
- "api" → "API Developer"
- "qa" or "sqa" → "Software QA Engineer"
- "backend" → "Backend Developer"
- "sales" → "Sales Executive"
- "marketing" → "Marketing Manager"

Return ONLY the standardized role title or the original role. Do not include any explanation or additional text.
`;

  try {
    const result = await safeChatCompletion([
      { role: "user", content: normalizationPrompt }
    ]);

    if (result.error) {
      console.error("❌ GPT normalization error:", result.message);
      return role; // Return original on error
    }

    const response = result.content.trim();
    
    // Return standardized role (clean up any extra text)
    const standardized = response.split('\n')[0].trim();
    return standardized.length > 2 ? standardized : role;

  } catch (error) {
    console.error("❌ Error normalizing role with GPT:", error);
    return role; // Return original on error
  }
}

/**
 * Generate job description based on role, experience, education, and industry
 * Returns array of 4-5 bullet points
 * Uses static fallback for common roles, GPT for others
 */
async function generateJobDescription(role, experienceLevel, educationLevel, industry) {
  // Normalize role first
  const normalizedRole = role.toLowerCase().trim();
  
  // Quick check: use static fallback for common roles (faster, more reliable)
  if (STATIC_JOB_DESCRIPTIONS[normalizedRole]) {
    console.log(`✅ Using static JD for common role: "${normalizedRole}"`);
    return STATIC_JOB_DESCRIPTIONS[normalizedRole](experienceLevel?.toLowerCase() || 'mid level');
  }

  // For other roles, use GPT with normalized/validated role
  const standardizedRole = await normalizeAndValidateRole(role);
  
  const jobDescriptionPrompt = `
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
    const jdResult = await safeChatCompletion([
      { role: "user", content: jobDescriptionPrompt }
    ]);

    if (jdResult.error) {
      console.error("❌ GPT JD generation error:", jdResult.message);
      // Fallback to generic JD
      return [
        `Work on ${standardizedRole} projects and collaborate with team members`,
        `Apply ${experienceLevel || 'professional'} level skills to solve technical challenges`,
        `Participate in code reviews and contribute to team discussions`,
        `Stay updated with industry trends and best practices`
      ];
    }

    let parsed = jdResult.content.trim();
    
    // Remove markdown code blocks if present
    if (parsed.startsWith('```json')) {
      parsed = parsed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (parsed.startsWith('```')) {
      parsed = parsed.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const generatedJD = JSON.parse(parsed);
    
    if (Array.isArray(generatedJD) && generatedJD.length >= 4 && generatedJD.length <= 5) {
      console.log(`✅ Generated ${generatedJD.length} job description points`);
      const cleaned = generatedJD.slice(0, 5).filter(item => item && typeof item === 'string' && item.trim().length > 0);
      
      // Ensure we have at least 4 valid items
      if (cleaned.length >= 4) {
        return cleaned;
      } else {
        console.warn(`⚠️ Only ${cleaned.length} valid items, using fallback`);
        return [
          `Work on ${standardizedRole} projects and collaborate with team members`,
          `Apply ${experienceLevel || 'professional'} level skills to solve technical challenges`,
          `Participate in code reviews and contribute to team discussions`,
          `Stay updated with industry trends and best practices`
        ];
      }
    } else {
      console.warn(`⚠️ Invalid JD format (length: ${generatedJD?.length || 0}), using fallback`);
      return [
        `Work on ${standardizedRole} projects and collaborate with team members`,
        `Apply ${experienceLevel || 'professional'} level skills to solve technical challenges`,
        `Participate in code reviews and contribute to team discussions`,
        `Stay updated with industry trends and best practices`
      ];
    }
  } catch (error) {
    console.error("❌ Error generating job description:", error);
    console.error("   Error stack:", error.stack);
    // Fallback - always return at least 4 items
    return [
      `Work on ${role} projects and collaborate with team members`,
      `Apply ${experienceLevel || 'professional'} level skills to solve technical challenges`,
      `Participate in code reviews and contribute to team discussions`,
      `Stay updated with industry trends and best practices`
    ];
  }
}

/**
 * Main function: Generate job description with role normalization and validation
 * Returns: { standardizedRole, jobDescription }
 */
async function generateJobDescriptionWithValidation(role, experienceLevel, educationLevel, industry) {
  try {
    // Normalize and validate role
    const standardizedRole = await normalizeAndValidateRole(role);
    console.log(`📋 Role normalized: "${role}" → "${standardizedRole}"`);

    // Generate job description
    const jobDescription = await generateJobDescription(
      standardizedRole,
      experienceLevel,
      educationLevel,
      industry
    );

    // Ensure jobDescription is always valid
    if (!Array.isArray(jobDescription) || jobDescription.length < 4) {
      console.warn(`⚠️ Invalid jobDescription, using fallback`);
      return {
        standardizedRole: standardizedRole,
        jobDescription: [
          `Work on ${standardizedRole} projects and collaborate with team members`,
          `Apply ${experienceLevel || 'professional'} level skills to solve technical challenges`,
          `Participate in code reviews and contribute to team discussions`,
          `Stay updated with industry trends and best practices`
        ]
      };
    }

    return {
      standardizedRole: standardizedRole,
      jobDescription: jobDescription
    };

  } catch (error) {
    console.error("❌ Error in generateJobDescriptionWithValidation:", error);
    // Fallback
    return {
      standardizedRole: role,
      jobDescription: [
        `Work on ${role} projects and collaborate with team members`,
        `Apply ${experienceLevel || 'professional'} level skills to solve technical challenges`,
        `Participate in code reviews and contribute to team discussions`,
        `Stay updated with industry trends and best practices`
      ]
    };
  }
}

module.exports = {
  generateJobDescriptionWithValidation,
  normalizeAndValidateRole,
  generateJobDescription
};

