const InterviewSession = require("../models/InterviewSession");
const PreInterview = require("../models/PreInterview");
const InterviewReport = require("../models/InterviewReport");
const { getQuestionsByExperience } = require("../utils/questionGenerator");
const { safeChatCompletion, safeTextToSpeech } = require("../utils/openaiClient");
const { generateJobDescriptionWithValidation } = require("../services/jobDescriptionService");

// Job description generation is now handled by shared service
// See: src/services/jobDescriptionService.js

// ------------------------------------------------------
// 1️⃣ START INTERVIEW (Generate questions ONCE)
// ------------------------------------------------------
exports.startInterview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { setupId } = req.body;

    if (!setupId)
      return res.status(400).json({ message: "setupId is required" });

    const setup = await PreInterview.findById(setupId);
    if (!setup)
      return res.status(404).json({ message: "Setup not found" });

    // Normalize role from desiredRole
    // Tries to match known roles, otherwise uses normalized desiredRole
    const normalizeRole = (desiredRole) => {
      if (!desiredRole) return null;
      const lower = desiredRole.toLowerCase().trim();

      // Try to match known roles
      if (lower.includes('frontend') || lower.includes('front-end')) return 'frontend';
      if (lower.includes('backend') || lower.includes('back-end') || lower.includes('back end')) return 'backend';
      if (lower.includes('sqa') || lower.includes('qa') || lower.includes('quality assurance')) return 'sqa';

      // If no match, use normalized desiredRole (remove extra spaces, lowercase)
      // This allows new roles to be automatically added
      return lower.replace(/\s+/g, '-'); // Replace spaces with hyphens for consistency
    };

    const role = normalizeRole(setup.desiredRole);

    // Validate role exists
    if (!role) {
      return res.status(400).json({
        message: `desiredRole is required`
      });
    }

    // -------------------------------------------------------------------------
    // GENERATE JOB DESCRIPTION AND QUESTIONS IN PARALLEL
    // This significantly reduces the initial wait time (latency)
    // -------------------------------------------------------------------------
    console.log(`🚀 Starting parallel AI generation for role: "${setup.desiredRole}"`);

    let jobDescriptionResult;
    let allQuestions = [];

    try {
      const [jdRes, qsRes] = await Promise.all([
        generateJobDescriptionWithValidation(
          setup.desiredRole,
          setup.experienceLevel,
          setup.educationLevel,
          setup.industry
        ).catch(err => {
          console.error("❌ JD Generation failed, using fallback:", err.message);
          return {
            standardizedRole: setup.desiredRole,
            jobDescription: [
              `Work on ${setup.desiredRole || role} projects and collaborate with team members`,
              `Apply ${setup.experienceLevel || 'professional'} level skills to solve technical challenges`,
              `Participate in code reviews and contribute to team discussions`,
              `Stay updated with industry trends and best practices`
            ]
          };
        }),
        getQuestionsByExperience(
          setup.desiredRole,
          setup.experienceLevel
        ).catch(err => {
          console.error("❌ Question Generation failed:", err.message);
          return null;
        })
      ]);

      jobDescriptionResult = jdRes;
      allQuestions = qsRes;

      console.log(`✅ Parallel generation complete: ${allQuestions?.length || 0} questions, ${jobDescriptionResult.jobDescription.length} JD points`);

    } catch (globalError) {
      console.error("❌ Critical error in parallel generation:", globalError);
      return res.status(500).json({
        success: false,
        message: "Failed to initialize interview components. Please try again."
      });
    }

    if (!allQuestions || !Array.isArray(allQuestions) || allQuestions.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate questions. Please try again."
      });
    }

    // Create a fresh interview session
    // Store both question and idealAnswer (idealAnswer is hidden from frontend by default)
    let session;
    try {
      session = await InterviewSession.create({
        userId,
        setupId,
        role, // Save role directly in session
        jobDescription: jobDescriptionResult.jobDescription || [], // Save generated job description
        totalQuestions: allQuestions.length,
        currentIndex: 0,
        questions: allQuestions.map(q => ({
          question: q.question,
          idealAnswer: q.idealAnswer, // Store ideal answer (hidden from frontend)
          answer: "",
          score: 0,
          feedback: ""
        })),
        isCompleted: false
      });
      console.log(`✅ Interview session created: ${session._id}`);
    } catch (error) {
      console.error("❌ Error creating interview session:", error);
      console.error("   Error stack:", error.stack);
      return res.status(500).json({
        success: false,
        message: "Failed to create interview session. Please try again."
      });
    }

    // FINAL VALIDATION - ensure jobDescription is always valid
    if (!Array.isArray(jobDescriptionResult.jobDescription) || jobDescriptionResult.jobDescription.length < 4) {
      console.error(`❌ FINAL CHECK FAILED: jobDescription invalid!`);
      console.error(`   Value:`, jobDescription);
      console.error(`   Type:`, typeof jobDescription);
      console.error(`   Is Array:`, Array.isArray(jobDescription));
      console.error(`   Length:`, jobDescription?.length);

      // Force fallback - this should NEVER happen but safety first
      jobDescriptionResult.jobDescription = [
        `Work on ${setup.desiredRole || role} projects and collaborate with team members`,
        `Apply ${setup.experienceLevel || 'professional'} level skills to solve technical challenges`,
        `Participate in code reviews and contribute to team discussions`,
        `Stay updated with industry trends and best practices`
      ];
      console.log(`✅ Applied final fallback (${jobDescriptionResult.jobDescription.length} points)`);
    }

    // Return question and job description to frontend
    const response = {
      success: true,
      sessionId: session._id.toString(),
      role: jobDescriptionResult.standardizedRole || setup.desiredRole || role || 'Developer',
      jobDescription: jobDescriptionResult.jobDescription,
      question: allQuestions[0].question,
      totalQuestions: allQuestions.length
    };

    // Log final response for debugging
    console.log(`📤 FINAL RESPONSE:`);
    console.log(`   - sessionId: ${response.sessionId}`);
    console.log(`   - role: "${response.role}"`);
    console.log(`   - jobDescription: ${response.jobDescription.length} points`);
    console.log(`   - jobDescription[0]: "${response.jobDescription[0]?.substring(0, 60)}..."`);
    console.log(`   - question: "${response.question?.substring(0, 50)}..."`);
    console.log(`   - totalQuestions: ${response.totalQuestions}`);

    // Double-check before sending
    if (!response.jobDescription || response.jobDescription.length === 0) {
      console.error(`❌❌❌ CRITICAL ERROR: jobDescription is STILL empty in final response!`);
      console.error(`   This should NEVER happen!`);
      response.jobDescription = [
        `Work on ${response.role} projects and collaborate with team members`,
        `Apply professional level skills to solve technical challenges`,
        `Participate in code reviews and contribute to team discussions`,
        `Stay updated with industry trends and best practices`
      ];
    }

    return res.json(response);

  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------
// 2️⃣ SAVE ANSWER → RETURN NEXT QUESTION
// ------------------------------------------------------
exports.sendAnswer = async (req, res, next) => {
  try {
    const { sessionId, answer, behavior } = req.body;
    const userId = req.user.id;

    if (!sessionId || !answer)
      return res.status(400).json({ message: "sessionId and answer required" });

    // Load session with idealAnswer (needed for evaluation)
    const session = await InterviewSession.findOne({ _id: sessionId, userId })
      .select('+questions.idealAnswer');
    if (!session)
      return res.status(404).json({ message: "Session not found" });

    // Ensure currentIndex exists
    if (session.currentIndex === undefined || session.currentIndex === null) {
      session.currentIndex = 0;
    }

    const index = session.currentIndex;

    // SAFETY: prevent invalid index
    if (!session.questions[index]) {
      return res.status(400).json({
        message: `Invalid question index ${index}. Something went wrong.`
      });
    }

    const currentQuestion = session.questions[index];
    const idealAnswer = currentQuestion.idealAnswer;

    if (!idealAnswer) {
      return res.status(500).json({
        message: "Ideal answer not found for this question. Please restart the interview."
      });
    }

    // Save answer first
    session.questions[index].answer = answer;

    // -----------------------------
    // AI-BASED ANSWER EVALUATION
    // Compare user answer with ideal answer using GPT
    // -----------------------------
    const evaluationPrompt = `
You are a fair and strict technical interviewer evaluating a candidate's answer.

Question: ${currentQuestion.question}

Ideal Answer (reference - this is what a complete answer might look like):
${idealAnswer}

Candidate's Answer:
${answer}

CRITICAL EVALUATION RULES:

1. IRRELEVANT/RANDOM/GIBBERISH ANSWERS → Score: 0
   - If the answer contains random characters, gibberish, or completely unrelated text
   - If the answer has no connection to the question topic
   - Examples: "JRHJRHWEBEWHRKJEBRKJEWRBEWJKRBEWJKRJKWEBRBJKEWRKJEWRKJWEHRJEWR", random letters, keyboard mashing
   - These should ALWAYS get 0/10

2. "DON'T KNOW" OR NO ATTEMPT → Score: 0
   - If answer explicitly says "don't know", "I don't know", "no idea", "not sure", or similar
   - If answer is empty or just whitespace
   - These should ALWAYS get 0/10

3. RELEVANT BUT INCORRECT → Score: 3-6
   - If answer shows understanding of the question topic but contains incorrect information
   - If answer is related to the question but demonstrates misunderstanding
   - If answer attempts to address the question but is mostly wrong
   - Give partial credit: 3-4 for minimal relevant attempt, 5-6 for better attempt with some correct points

4. RELEVANT AND CORRECT → Score: 7-10
   - If answer is relevant to the question AND contains correct information
   - 7-8: Good understanding, covers main points (even if not complete)
   - 9-10: Excellent answer, comprehensive and accurate

Evaluate the candidate's answer considering:
- Relevance to the question topic (MUST be relevant to get any score above 0)
- Technical accuracy of what was mentioned
- Completeness and thoroughness
- Clarity and communication

Scoring Guidelines:
- 0: Completely irrelevant, random/gibberish, "don't know", or no attempt
- 3-4: Relevant to question but mostly incorrect, shows minimal understanding
- 5-6: Relevant to question, partially correct, some understanding shown
- 7-8: Relevant and mostly correct, good understanding, covers main points
- 9-10: Relevant and comprehensive, excellent understanding, accurate and complete

IMPORTANT:
- Be STRICT with irrelevant/random answers → MUST be 0
- Be STRICT with "don't know" answers → MUST be 0
- Be FAIR with relevant answers → give appropriate partial credit (3-6) if incorrect but relevant
- Reward correct and relevant answers with higher scores (7-10)
- Consider different ways of expressing the same concept

Return ONLY valid JSON in this exact format:
{
  "score": 7,
  "feedback": "Good understanding of the concept. You mentioned key points. Consider adding more details about [specific area]."
}

Rules:
- score: integer between 0-10 (be strict with irrelevant/don't know = 0, fair with relevant answers)
- feedback: 1-2 lines of constructive, encouraging feedback
- Return ONLY the JSON, no additional text
`;

    console.log("🔍 Evaluating answer with GPT...");

    // Evaluate answer using GPT
    const evaluationResult = await safeChatCompletion([
      { role: "user", content: evaluationPrompt }
    ]);

    let score = 0;
    let feedback = "";

    if (evaluationResult.error) {
      console.error("❌ GPT evaluation error:", evaluationResult.message);
      // Fallback: assign default score if GPT fails
      score = 5;
      feedback = "Evaluation temporarily unavailable. Answer saved.";
    } else {
      try {
        // Parse GPT response
        let parsed = evaluationResult.content.trim();

        // Remove markdown code blocks if present
        if (parsed.startsWith('```json')) {
          parsed = parsed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (parsed.startsWith('```')) {
          parsed = parsed.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const evaluation = JSON.parse(parsed);

        score = Math.max(0, Math.min(10, parseInt(evaluation.score) || 0));
        feedback = evaluation.feedback || "No feedback provided.";

        // Validate score is appropriate (no minimum override - let GPT decide based on relevance)
        const answerLength = (answer || '').trim().length;
        console.log(`✅ Answer evaluated: Score=${score}, Feedback="${feedback}"`);
        console.log(`   Answer length: ${answerLength} characters`);

      } catch (err) {
        console.error("❌ Failed to parse GPT evaluation:", err.message);
        console.error("Raw response:", evaluationResult.content);
        // Fallback
        score = 5;
        feedback = "Evaluation parsing error. Answer saved.";
      }
    }

    // Save evaluation to database
    session.questions[index].score = score;
    session.questions[index].feedback = feedback;

    // Save behavior data if provided
    if (behavior) {
      session.questions[index].behavior = {
        confident: parseFloat(behavior.confident) || 0,
        nervous: parseFloat(behavior.nervous) || 0,
        distracted: parseFloat(behavior.distracted) || 0
      };
    }

    // Move to next
    session.currentIndex++;

    // Check if interview is finished
    if (session.currentIndex >= session.totalQuestions) {
      session.isCompleted = true;
      await session.save();

      return res.json({
        done: true,
        message: "All questions answered",
        // Return evaluation for the last question
        lastQuestionScore: score,
        lastQuestionFeedback: feedback
      });
    }

    const nextQuestion = session.questions[session.currentIndex].question;

    await session.save();

    return res.json({
      done: false,
      nextQuestion,
      current: session.currentIndex + 1,
      total: session.totalQuestions,
      // Return evaluation for current question
      score: score,
      feedback: feedback
    });

  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------
// 3️⃣ FINISH INTERVIEW — PER-ANSWER SCORING + GLOBAL SCORES + Generate AI Tips ONCE
// ------------------------------------------------------
exports.finishInterview = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "sessionId required" });

    // Load session with idealAnswer (needed for potential re-evaluation, but we'll use existing scores)
    // Also validate ownership: user can only finish their own session
    const userId = req.user.id;
    const session = await InterviewSession.findOne({ _id: sessionId, userId }).select('+questions.idealAnswer');
    if (!session) return res.status(404).json({ message: "Session not found" });

    // -----------------------------
    // CALCULATE TOTAL SCORE FROM PER-QUESTION EVALUATIONS
    // Apply cheating penalty if any
    // -----------------------------
    let totalScore = session.questions.reduce((sum, q) => sum + (q.score || 0), 0);
    const penaltyPoints = session.cheating?.penaltyPoints || 0;

    // Final score = Questions sum - Cheating penalty
    totalScore = Math.max(0, totalScore - penaltyPoints);

    const maxScore = session.questions.length * 10;
    const overallPercentage = Math.round((totalScore / maxScore) * 100);

    // -----------------------------
    // BUILD TRANSCRIPT FOR GLOBAL EVALUATION
    // Include per-question scores and feedback for context
    // -----------------------------
    const transcript = session.questions
      .map(
        (q, index) =>
          `Q${index + 1}: ${q.question}\nA${index + 1}: ${q.answer || "No answer"}\nScore: ${q.score}/10\nFeedback: ${q.feedback}\n`
      )
      .join("\n");

    // -----------------------------
    // GPT REQUEST FOR GLOBAL SCORES AND SUMMARY ONLY
    // Per-question evaluations are already done, now generate global metrics
    // -----------------------------
    const prompt = `
Based on the interview transcript below, generate GLOBAL interview scores and a final summary.

The per-question scores are already calculated. Now evaluate the overall performance.

Generate:
- technicalAccuracy (0-100): How technically accurate were the answers overall?
- completeness (0-100): How complete and thorough were the answers?
- conciseness (0-100): How concise and clear were the answers?
- problemSolving (0-100): How well did the candidate demonstrate problem-solving skills?
- finalSummary: A comprehensive 2-3 paragraph summary of the candidate's overall performance

Return ONLY this JSON:

{
  "technicalAccuracy": number,
  "completeness": number,
  "conciseness": number,
  "problemSolving": number,
  "finalSummary": "string"
}

Interview Transcript:
${transcript}
`;

    const result = await safeChatCompletion([{ role: "user", content: prompt }]);

    let globalScores = {
      technicalAccuracy: 0,
      completeness: 0,
      conciseness: 0,
      problemSolving: 0,
      finalSummary: "Evaluation completed. Review your answers for detailed feedback."
    };

    if (!result.error) {
      try {
        let parsed = result.content.trim();

        // Remove markdown code blocks if present
        if (parsed.startsWith('```json')) {
          parsed = parsed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (parsed.startsWith('```')) {
          parsed = parsed.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const output = JSON.parse(parsed);

        globalScores.technicalAccuracy = Math.max(0, Math.min(100, parseInt(output.technicalAccuracy) || 0));
        globalScores.completeness = Math.max(0, Math.min(100, parseInt(output.completeness) || 0));
        globalScores.conciseness = Math.max(0, Math.min(100, parseInt(output.conciseness) || 0));
        globalScores.problemSolving = Math.max(0, Math.min(100, parseInt(output.problemSolving) || 0));
        globalScores.finalSummary = output.finalSummary || globalScores.finalSummary;

      } catch (err) {
        console.log("GPT PARSE ERROR for global scores:", result.content);
        // Use default values if parsing fails
      }
    } else {
      console.error("GPT error for global scores:", result.message);
    }

    // -----------------------------
    // SAVE GLOBAL SCORES TO DATABASE
    // Per-question scores and feedback are already saved during sendAnswer
    // -----------------------------
    session.technicalAccuracy = globalScores.technicalAccuracy;
    session.completeness = globalScores.completeness;
    session.conciseness = globalScores.conciseness;
    session.problemSolving = globalScores.problemSolving;

    session.totalScore = totalScore;
    session.overallPercentage = overallPercentage;
    session.aiSummary = globalScores.finalSummary;
    session.isCompleted = true;

    // -----------------------------
    // 🌟 AGGREGATE BEHAVIOR DATA
    // Calculate averages from all questions that have behavior data
    // -----------------------------
    const behaviorQuestions = session.questions.filter(q => q.behavior && (q.behavior.confident > 0 || q.behavior.nervous > 0 || q.behavior.distracted > 0));

    if (behaviorQuestions.length > 0) {
      const totalBehavior = behaviorQuestions.reduce((acc, q) => ({
        confident: acc.confident + (q.behavior.confident || 0),
        nervous: acc.nervous + (q.behavior.nervous || 0),
        distracted: acc.distracted + (q.behavior.distracted || 0)
      }), { confident: 0, nervous: 0, distracted: 0 });

      const avgConfident = totalBehavior.confident / behaviorQuestions.length;
      const avgNervous = totalBehavior.nervous / behaviorQuestions.length;
      const avgDistracted = totalBehavior.distracted / behaviorQuestions.length;

      // Update session body language stats
      // Note: mapping behavior to existing fields roughly
      // confident -> stability? (or we just use dominantBehavior)
      // nervous -> 100 - stability?
      // distracted -> 100 - attention?

      // We will store the raw averages in the bodyLanguage object if we extend it, 
      // but for now let's map to the existing fields for backward compatibility visually
      // AND set the dominant behavior.

      session.bodyLanguage.sampleCount = behaviorQuestions.length;

      // Determine dominant behavior
      let dominant = 'confident';
      let maxScore = avgConfident;

      if (avgNervous > maxScore) {
        dominant = 'nervous';
        maxScore = avgNervous;
      }
      if (avgDistracted > maxScore) {
        dominant = 'distracted';
        maxScore = avgDistracted;
      }
      session.bodyLanguage.dominantBehavior = dominant;

      // Optional: Update numeric metrics based on behavior if needed
      // For now, we trust the 'dominantBehavior' is the key metric
    }

    // -----------------------------
    // 🌟 GENERATE SINGLE COMPREHENSIVE AI TIP WITH ALL RESOURCES
    // One unified tip covering entire interview with all learning resources together
    // -----------------------------
    const interviewRole = session.role || "developer"; // Get role from session

    const tipsPrompt = `
You are an expert career coach providing personalized improvement guidance for a ${interviewRole} developer.

Based on this COMPLETE interview performance:

${transcript}

Overall Performance Summary:
${globalScores.finalSummary}

Interview Role: ${interviewRole}
Technical Accuracy: ${globalScores.technicalAccuracy}/100
Completeness: ${globalScores.completeness}/100
Conciseness: ${globalScores.conciseness}/100
Problem Solving: ${globalScores.problemSolving}/100

Generate ONE COMPREHENSIVE improvement tip that covers the ENTIRE interview performance. This should be a unified learning path.

The tip MUST include:
1. tip: A comprehensive summary of what areas need improvement based on the overall interview (2-3 sentences covering all weak areas)
2. example: A concrete, actionable example of how to apply the learning (2-3 sentences)
3. resources: Array of EXACTLY 2-3 specific learning resources (choose the BEST ones):
   - Mix of: YouTube videos/channels, Online courses, Books, or Websites
   - Only include the MOST VALUABLE and RELEVANT resources

CRITICAL RULES:
- Generate ONLY ONE comprehensive tip covering the entire interview, NOT multiple separate tips
- The tip should address all weak areas identified in the interview
- Resources MUST be REAL, AUTHENTIC, WORKING, and VERIFIED:
  * YouTube: Only use well-known, verified channels with actual working YouTube URLs (e.g., https://www.youtube.com/@ChannelName or https://www.youtube.com/watch?v=VIDEO_ID)
  * Courses: Only use verified courses from Udemy, Coursera with actual working course links
  * Books: Only use real, published books with working Amazon links (e.g., https://www.amazon.com/dp/ISBN)
  * Websites: Only use well-known, verified websites with working URLs
- DO NOT include fake, broken, or non-existent links
- DO NOT include search result URLs or placeholder links
- Only suggest resources you KNOW exist and are accessible
- Format the tip as: "You need to learn [areas]. Watch [YouTube], take [course], read [book] - choose the most relevant resource"
- Make it role-specific for ${interviewRole} developers
- All resources should be relevant to the interview performance gaps

Return ONLY valid JSON in this exact format:

{
  "tips": [
    {
      "tip": "Based on your interview performance, you need to strengthen your understanding of [specific areas]. Focus on [key concepts] and practice [specific skills]. This will help you improve your technical accuracy and problem-solving abilities.",
      "example": "Start with the recommended resource to build a strong foundation, then practice regularly to reinforce your learning.",
      "resources": [
        {
          "type": "youtube",
          "name": "freeCodeCamp.org - Full Courses",
          "link": "https://www.youtube.com/@freecodecamp"
        },
        {
          "type": "book",
          "name": "Cracking the Coding Interview",
          "link": "https://www.amazon.com/dp/0984782850"
        },
        {
          "type": "website",
          "name": "LeetCode",
          "link": "https://leetcode.com"
        }
      ]
    }
  ]
}

Important:
- Generate exactly 1 comprehensive tip (not multiple tips)
- Include EXACTLY 2-3 resources total (choose the BEST ones)
- Only include REAL, AUTHENTIC, WORKING links that you have verified
- The tip should cover all improvement areas from the interview
- Make it specific to ${interviewRole} role
- Return ONLY the JSON, no additional text
`;

    const tipsResult = await safeChatCompletion([
      { role: "user", content: tipsPrompt }
    ]);

    let parsedTips = [];
    try {
      let parsed = tipsResult.content.trim();

      // Remove markdown code blocks if present
      if (parsed.startsWith('```json')) {
        parsed = parsed.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (parsed.startsWith('```')) {
        parsed = parsed.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const tipsData = JSON.parse(parsed);

      if (tipsData.tips && Array.isArray(tipsData.tips)) {
        // Validate and clean tips - now expecting only 1 comprehensive tip
        parsedTips = tipsData.tips
          .filter(t => t.tip && t.example && Array.isArray(t.resources))
          .map(t => ({
            tip: t.tip.trim(),
            example: t.example.trim(),
            resources: (t.resources || [])
              .filter(r => r.type && r.name && r.link)
              .map(r => ({
                type: r.type.trim(),
                name: r.name.trim(),
                link: r.link.trim()
              }))
              .slice(0, 3) // Limit to maximum 3 resources
          }))
          .slice(0, 1); // Only take the first (comprehensive) tip
      }

      // Fallback if parsing fails or structure is invalid
      if (parsedTips.length === 0) {
        throw new Error("Invalid tips format");
      }

    } catch (err) {
      console.error("❌ Failed to parse tips:", err.message);
      console.error("Raw response:", tipsResult.content);

      // Fallback: Single comprehensive tip with 2-3 verified, working resources
      parsedTips = [
        {
          tip: "Based on your interview performance, you need to strengthen your problem-solving skills, technical knowledge, and communication abilities. Focus on practicing coding challenges, understanding core concepts deeply, and building real-world projects. This learning path will help you improve your technical accuracy, completeness, and problem-solving capabilities.",
          example: "Start by watching the freeCodeCamp YouTube channel for comprehensive tutorials, then practice coding problems on LeetCode. For deeper understanding, read 'Cracking the Coding Interview' to master interview techniques.",
          resources: [
            {
              type: "youtube",
              name: "freeCodeCamp.org - Full Courses",
              link: "https://www.youtube.com/@freecodecamp"
            },
            {
              type: "book",
              name: "Cracking the Coding Interview",
              link: "https://www.amazon.com/dp/0984782850"
            },
            {
              type: "website",
              name: "LeetCode",
              link: "https://leetcode.com"
            }
          ]
        }
      ];
    }

    // SAVE TIPS TO SESSION (so dashboard does NOT regenerate)
    session.aiTips = parsedTips;

    await session.save();

    // -----------------------------
    // ✅ CREATE / UPDATE INTERVIEW REPORT (snapshot for reports screen)
    // Use data already generated above; do NOT break existing flow if report saving fails.
    // -----------------------------
    try {
      const questionsSnapshot = session.questions.map(q => ({
        question: q.question,
        answer: q.answer,
        score: q.score || 0,
        feedback: q.feedback || ""
      }));

      const reportPayload = {
        userId,
        interviewId: session._id,
        role: session.role || "developer",
        overallPercentage: session.overallPercentage || overallPercentage || 0,
        answerQuality: {
          technicalAccuracy: session.technicalAccuracy || globalScores.technicalAccuracy || 0,
          completeness: session.completeness || globalScores.completeness || 0,
          conciseness: session.conciseness || globalScores.conciseness || 0,
          problemSolving: session.problemSolving || globalScores.problemSolving || 0,
        },
        // Enhanced Body Language & Analytics
        bodyLanguage: {
          dominantBehavior: session.bodyLanguage.dominantBehavior || "confident",
          sampleCount: session.bodyLanguage.sampleCount || 0,
          confidenceTrend: session.analyticsData?.confidenceTrend || [],
          nervousnessReduction: session.analyticsData?.nervousnessReduction || 0,
          distractionPercentage: session.analyticsData?.distractionPercentage || 0,
          behaviorBreakdown: session.analyticsData?.behaviorBreakdown || { confident: 0, nervous: 0, distracted: 0 }
        },
        // 🌟 ADD CHEATING SUMMARY TO REPORT
        cheating: session.cheating ? {
          isDetected: session.cheating.isDetected,
          incidentCount: session.cheating.incidentCount,
          penaltyPoints: session.cheating.penaltyPoints,
          evidenceImages: session.cheating.incidents
            .filter(inc => inc.imageUrl)
            .map(inc => inc.imageUrl)
            .slice(0, 2) // As requested, 1-2 images are enough
        } : undefined,
        questions: questionsSnapshot,
        aiSummary: session.aiSummary || globalScores.finalSummary || "",
      };

      // Upsert prevents duplicate reports if /finish is retried.
      await InterviewReport.findOneAndUpdate(
        { userId, interviewId: session._id },
        reportPayload,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (reportErr) {
      console.warn("⚠️ Failed to save InterviewReport:", reportErr.message);
    }

    // -----------------------------
    // SEND FINAL RESPONSE
    // -----------------------------
    // Prepare questions response (without idealAnswer)
    const questionsResponse = session.questions.map(q => ({
      question: q.question,
      answer: q.answer,
      score: q.score,
      feedback: q.feedback
    }));

    return res.json({
      message: "Interview evaluated successfully",
      questions: questionsResponse, // Per-question evaluations (idealAnswer hidden)
      technicalAccuracy: globalScores.technicalAccuracy,
      completeness: globalScores.completeness,
      conciseness: globalScores.conciseness,
      problemSolving: globalScores.problemSolving,
      totalScore,
      overallPercentage,
      summary: globalScores.finalSummary,
      tips: parsedTips
    });

  } catch (err) {
    console.error("FINISH ERROR:", err);
    next(err);
  }
};

// ------------------------------------------------------
// 4️⃣ GET INTERVIEW SESSION — Load existing session by sessionId
// ------------------------------------------------------
exports.getInterviewSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    // Find session and verify it belongs to the user
    const session = await InterviewSession.findOne({
      _id: sessionId,
      userId
    }).populate('setupId', 'desiredRole experienceLevel industry educationLevel');

    if (!session) {
      return res.status(404).json({
        message: "Interview session not found or access denied"
      });
    }

    // Get current question based on currentIndex
    const currentIndex = session.currentIndex || 0;
    const currentQuestion = session.questions[currentIndex]?.question || null;

    // Return session details
    return res.json({
      sessionId: session._id,
      role: session.role || (session.setupId?.desiredRole),
      jobDescription: session.jobDescription && Array.isArray(session.jobDescription) && session.jobDescription.length > 0
        ? session.jobDescription
        : [],
      question: currentQuestion,
      currentIndex: currentIndex + 1, // 1-based for display
      totalQuestions: session.totalQuestions,
      isCompleted: session.isCompleted,
      setup: session.setupId ? {
        desiredRole: session.setupId.desiredRole,
        experienceLevel: session.setupId.experienceLevel,
        industry: session.setupId.industry,
        educationLevel: session.setupId.educationLevel,
      } : null,
    });

  } catch (err) {
    next(err);
  }
};

// ------------------------------------------------------
// 5️⃣ TEXT-TO-SPEECH — Generate audio from text
// ------------------------------------------------------
exports.textToSpeech = async (req, res, next) => {
  try {
    const { text, voice } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        message: "Text is required and must be a string"
      });
    }

    // Validate voice (default to "alloy" if not provided or invalid)
    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const selectedVoice = validVoices.includes(voice) ? voice : "alloy";

    // Call OpenAI TTS API
    const result = await safeTextToSpeech(text, selectedVoice);

    if (result.error) {
      return res.status(500).json({
        message: result.message || "Failed to generate audio",
        details: result.details
      });
    }

    // Set appropriate headers for MP3 audio
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", result.buffer.length);
    res.setHeader("Content-Disposition", "inline; filename=speech.mp3");

    // Send audio buffer
    return res.send(result.buffer);

  } catch (err) {
    next(err);
  }
};
