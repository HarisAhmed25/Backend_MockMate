const { safeChatCompletion } = require("./openaiClient");

/**
 * Extract questions reliably even if OpenAI returns:
 * - numbered lists
 * - bullet lists
 * - blank lines
 * - multiple lines in a single string
 */
function extractQuestions(raw) {
  return raw
    .split(/\r?\n+/)                             // split on linebreaks or multiple linebreaks
    .map(line => line.trim())
    .map(line => line.replace(/^\d+[\.\)\-]\s*/, "")) // remove "1.", "1)", "1-", etc
    .map(line => line.replace(/^[-*]\s*/, ""))        // remove bullet points
    .filter(line => line.length > 5);                 // remove empty or useless lines
}

/**
 * Generate multiple questions with ideal answers in one OpenAI call
 * Returns array of { question, idealAnswer } objects
 */
async function generateMultipleQuestions(role, count, difficulty) {
  const prompt = `
Generate ${count} unique technical interview questions with their ideal answers.

Role: ${role}
Difficulty: ${difficulty}

For EACH question, provide:
1. The interview question
2. An ideal answer (comprehensive, technical, accurate)

Return ONLY valid JSON in this exact format:
{
  "questions": [
    {
      "question": "What is React and how does it work?",
      "idealAnswer": "React is a JavaScript library for building user interfaces..."
    },
    {
      "question": "Explain the concept of virtual DOM.",
      "idealAnswer": "Virtual DOM is a programming concept where..."
    }
  ]
}

Important:
- Generate exactly ${count} questions
- Each idealAnswer should be comprehensive (2-4 sentences)
- Ideal answers should demonstrate deep technical understanding
- Return ONLY the JSON, no additional text
`;

  console.log("🔥 Sending prompt to OpenAI for questions + ideal answers:", prompt);

  const result = await safeChatCompletion([{ role: "user", content: prompt }]);

  if (result.error) {
    console.error("❌ OpenAI error:", result.details || result.message);
    return [];
  }

  const raw = result.content || "";
  console.log("📥 RAW JSON RETURNED BY OPENAI:\n", raw);

  try {
    // Try to parse JSON directly
    let parsed = raw.trim();

    // Remove markdown code blocks if present
    if (parsed.startsWith('```json')) {
      parsed = parsed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (parsed.startsWith('```')) {
      parsed = parsed.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const data = JSON.parse(parsed);

    if (!data.questions || !Array.isArray(data.questions)) {
      console.error("❌ Invalid JSON structure - missing 'questions' array");
      return [];
    }

    const questionsWithAnswers = data.questions
      .filter(q => q.question && q.idealAnswer)
      .map(q => ({
        question: q.question.trim(),
        idealAnswer: q.idealAnswer.trim()
      }));

    console.log(`🧪 Extracted ${questionsWithAnswers.length} questions with ideal answers`);

    // If fewer questions returned than requested, return what we have
    if (questionsWithAnswers.length < count) {
      console.warn(`⚠ Only ${questionsWithAnswers.length} questions generated, requested ${count}`);
    }

    return questionsWithAnswers.slice(0, count);

  } catch (err) {
    console.error("❌ Failed to parse JSON from OpenAI:", err.message);
    console.error("Raw response:", raw);
    return [];
  }
}

/**
 * Generate all questions based on experience level
 */
async function getQuestionsByExperience(role, experienceLevel) {
  experienceLevel = experienceLevel.trim().toLowerCase();
  console.log("LEVEL:", experienceLevel);

  let difficultyMix = [];

  if (experienceLevel === "entry level" || experienceLevel === "fresher" || experienceLevel === "junior") {
    difficultyMix = [
      { level: "easy", amount: 3 },
      { level: "medium", amount: 2 },
      { level: "hard", amount: 2 }
    ];
  } else if (experienceLevel === "mid level" || experienceLevel === "intermediate") {
    difficultyMix = [
      { level: "medium", amount: 6 },
      { level: "hard", amount: 4 }
    ];
  } else if (experienceLevel === "senior level" || experienceLevel === "senior") {
    difficultyMix = [
      { level: "hard", amount: 6 },
      { level: "very hard", amount: 6 }
    ];
  } else {
    // Default to mid level if unknown
    console.warn("⚠️ Unknown experience level:", experienceLevel, "Defaulting to mid level");
    difficultyMix = [
      { level: "medium", amount: 6 },
      { level: "hard", amount: 4 }
    ];
  }

  console.log("🎯 Generating questions for levels:", difficultyMix.map(m => m.level).join(", "));

  let finalQuestions = [];
  try {
    const results = await Promise.all(
      difficultyMix.map(mix => generateMultipleQuestions(role, mix.amount, mix.level))
    );

    for (let i = 0; i < results.length; i++) {
      if (!results[i].length) {
        console.error("❌ FAILED TO GENERATE QUESTIONS FOR LEVEL:", difficultyMix[i].level);
        // Continue but log error
      }
      finalQuestions.push(...results[i]);
    }

    if (finalQuestions.length === 0) {
      console.error("❌ NO QUESTIONS GENERATED AT ALL");
      return [];
    }

    console.log(`🎯 FINAL QUESTIONS: ${finalQuestions.length} questions generated`);
    return finalQuestions;
  } catch (error) {
    console.error("❌ Exception during parallel question generation:", error);
    return [];
  }
}

module.exports = { getQuestionsByExperience };
