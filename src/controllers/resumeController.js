const { extractResumeText, cleanupFile } = require("../utils/resumeParser");
const { safeChatCompletion } = require("../utils/openaiClient");
const PreInterview = require("../models/PreInterview");
const InterviewSession = require("../models/InterviewSession");
const { getQuestionsByExperience } = require("../utils/questionGenerator");
const { generateJobDescriptionWithValidation } = require("../services/jobDescriptionService");

/**
 * POST /api/resume/upload
 * Upload resume and extract information, then start interview
 */
exports.uploadResume = async (req, res, next) => {
  let filePath = null;

  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded. Please upload a resume file.",
      });
    }

    filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    console.log(`📄 Processing resume: ${fileName} (${(fileSize / 1024).toFixed(2)} KB)`);

    // Extract text from resume
    let resumeText;
    try {
      resumeText = await extractResumeText(filePath);

      if (!resumeText || resumeText.trim().length === 0) {
        cleanupFile(filePath);
        return res.status(400).json({
          message: "Could not extract text from the resume. Please ensure the file is readable.",
        });
      }

      console.log(`✅ Extracted ${resumeText.length} characters from resume`);

      // -----------------------------
      // RESUME VALIDATION STEP
      // -----------------------------
      const validationPrompt = `
You are a resume validation system.

Analyze the following document text and determine whether it is a professional resume or not.

Rules:
- A valid resume must include at least 3 of the following:
  Name, Email, Phone Number, Skills, Education, Work Experience, Projects.
- If the document is an assignment, notes, study material, or class activity, mark it as NOT a resume.

Respond ONLY in valid JSON format like this:
{
  "is_resume": true/false,
  "confidence": 0-100,
  "reason": "short explanation"
}

Document Text:
${resumeText.substring(0, 3000)}
`;

      console.log("🔍 Validating document type...");
      const validationResult = await safeChatCompletion([
        { role: "user", content: validationPrompt }
      ]);

      if (!validationResult.error) {
        try {
          let jsonString = validationResult.content.trim();
          if (jsonString.startsWith("```")) {
            jsonString = jsonString.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
          }
          const validationData = JSON.parse(jsonString);

          console.log("📄 Validation Result:", validationData);

          if (validationData.is_resume === false) {
            cleanupFile(filePath);
            return res.status(400).json({
              message: "Uploaded file is not a valid resume. Please upload a professional CV.",
              details: validationData.reason,
              error: "INVALID_DOCUMENT_TYPE"
            });
          }
        } catch (e) {
          console.warn("⚠️ Validation parsing failed, proceeding with caution:", e.message);
        }
      }

    } catch (parseError) {
      cleanupFile(filePath);
      return res.status(400).json({
        message: `Failed to parse resume: ${parseError.message}`,
      });
    }

    // Use OpenAI to extract structured information from resume
    const extractionPrompt = `
Extract the following information from this resume in JSON format:

{
  "name": "Full name",
  "desiredRole": "Job title or desired role (e.g., Software Engineer, Data Scientist, Frontend Developer)",
  "experienceLevel": "Experience level - MUST be one of: Entry Level, Mid Level, Senior Level (based on years of experience and job titles)",
  "industry": "Industry or domain (e.g., Technology, Finance, Healthcare, E-commerce)",
  "education": "Education level or degree (e.g., Bachelor's Degree, Master's Degree, High School)",
  "skills": ["skill1", "skill2", "skill3"],
  "yearsOfExperience": number,
  "summary": "Brief professional summary"
}

IMPORTANT:
- desiredRole: Extract the job title or role the person is applying for or currently has
- experienceLevel: Determine based on years of experience and job titles (Entry Level = 0-2 years, Mid Level = 2-5 years, Senior Level = 5+ years)
- industry: Extract the industry/domain from company names, projects, or job descriptions
- education: Extract the highest education level mentioned

Resume Text:
${resumeText.substring(0, 4000)}${resumeText.length > 4000 ? "..." : ""}

Return ONLY valid JSON, no additional text.
`;

    const extractionResult = await safeChatCompletion([
      {
        role: "system",
        content: "You are a resume parser. Extract structured information from resumes and return only valid JSON.",
      },
      {
        role: "user",
        content: extractionPrompt,
      },
    ]);

    if (extractionResult.error) {
      cleanupFile(filePath);
      return res.status(500).json({
        message: "Failed to analyze resume",
        details: extractionResult.message,
      });
    }

    // Parse extracted JSON
    let extractedData;
    try {
      // Clean the response to extract JSON
      let jsonString = extractionResult.content.trim();

      // Remove markdown code blocks if present
      if (jsonString.startsWith("```")) {
        jsonString = jsonString.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      extractedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse extracted data:", extractionResult.content);
      cleanupFile(filePath);
      return res.status(500).json({
        message: "Failed to parse resume data",
        details: "Could not extract structured information from resume",
      });
    }

    // Validate required fields
    const missingFields = [];

    if (!extractedData.desiredRole || extractedData.desiredRole.trim() === "") {
      missingFields.push("Desired Role");
    }

    if (!extractedData.experienceLevel || extractedData.experienceLevel.trim() === "") {
      missingFields.push("Experience Level");
    }

    if (!extractedData.industry || extractedData.industry.trim() === "") {
      missingFields.push("Industry");
    }

    if (!extractedData.education || extractedData.education.trim() === "") {
      missingFields.push("Education");
    }

    // If any required fields are missing, return error
    if (missingFields.length > 0) {
      cleanupFile(filePath);
      return res.status(400).json({
        message: "Required information missing from resume",
        error: "MISSING_FIELDS",
        missingFields: missingFields,
        details: `The following information is missing from your resume: ${missingFields.join(", ")}. Please provide this information manually to proceed with the interview.`,
        extractedData: {
          name: extractedData.name || null,
          desiredRole: extractedData.desiredRole || null,
          experienceLevel: extractedData.experienceLevel || null,
          industry: extractedData.industry || null,
          education: extractedData.education || null,
          skills: extractedData.skills || [],
          yearsOfExperience: extractedData.yearsOfExperience || null,
        }
      });
    }

    // Normalize experience level to match expected format
    let experienceLevel = extractedData.experienceLevel.trim();
    const experienceLevelLower = experienceLevel.toLowerCase();

    if (experienceLevelLower.includes("entry") || experienceLevelLower.includes("junior") || experienceLevelLower.includes("beginner")) {
      experienceLevel = "Entry Level";
    } else if (experienceLevelLower.includes("mid") || experienceLevelLower.includes("intermediate") || experienceLevelLower.includes("middle")) {
      experienceLevel = "Mid Level";
    } else if (experienceLevelLower.includes("senior") || experienceLevelLower.includes("expert") || experienceLevelLower.includes("advanced")) {
      experienceLevel = "Senior Level";
    } else {
      // Default to Mid Level if unclear
      experienceLevel = "Mid Level";
    }

    const desiredRole = extractedData.desiredRole.trim();
    const industry = extractedData.industry.trim();
    const educationLevel = extractedData.education.trim();
    const userId = req.user.id;

    // Create or update PreInterview setup with extracted data
    let setup = await PreInterview.findOne({ userId }).sort({ createdAt: -1 });

    if (setup) {
      // Update existing setup
      setup.desiredRole = desiredRole;
      setup.experienceLevel = experienceLevel;
      setup.industry = industry;
      setup.educationLevel = educationLevel;
      if (extractedData.skills) setup.skills = extractedData.skills;
      await setup.save();
    } else {
      // Create new setup
      setup = await PreInterview.create({
        userId,
        desiredRole,
        experienceLevel,
        industry,
        educationLevel,
        skills: extractedData.skills || [],
      });
    }

    // Generate questions based on extracted information
    const allQuestions = await getQuestionsByExperience(desiredRole, experienceLevel);

    if (!allQuestions.length) {
      cleanupFile(filePath);
      return res.status(500).json({
        message: "Failed to generate interview questions",
      });
    }

    // -----------------------------
    // GENERATE JOB DESCRIPTION WITH ROLE NORMALIZATION & VALIDATION
    // Based on role, experience, education, industry
    // Uses shared service for consistency
    // -----------------------------
    console.log(`📋 Generating job description for role: "${desiredRole}"`);
    console.log(`   Experience: ${experienceLevel || 'Not specified'}`);
    console.log(`   Education: ${educationLevel || 'Not specified'}`);
    console.log(`   Industry: ${industry || 'Not specified'}`);

    let jobDescriptionResult;
    try {
      jobDescriptionResult = await generateJobDescriptionWithValidation(
        desiredRole,
        experienceLevel,
        educationLevel,
        industry
      );

      console.log(`✅ Generated ${jobDescriptionResult.jobDescription.length} job description points`);
      console.log(`   Standardized role: "${jobDescriptionResult.standardizedRole}"`);

    } catch (error) {
      console.error("❌ Error generating job description:", error);
      console.error("   Error details:", error.message);
      // Fallback
      jobDescriptionResult = {
        standardizedRole: desiredRole,
        jobDescription: [
          `Work on ${desiredRole} projects and collaborate with team members`,
          `Apply ${experienceLevel || 'professional'} level skills to solve technical challenges`,
          `Participate in code reviews and contribute to team discussions`,
          `Stay updated with industry trends and best practices`
        ]
      };
      console.log(`⚠️ Using fallback job description (${jobDescriptionResult.jobDescription.length} points)`);
    }

    const standardizedRole = jobDescriptionResult.standardizedRole;
    const jobDescription = jobDescriptionResult.jobDescription;

    // Final validation - ensure jobDescription is always an array with at least 4 items
    if (!Array.isArray(jobDescription) || jobDescription.length < 4) {
      console.warn(`⚠️ jobDescription validation failed, using fallback`);
      jobDescriptionResult.jobDescription = [
        `Work on ${standardizedRole} projects and collaborate with team members`,
        `Apply ${experienceLevel || 'professional'} level skills to solve technical challenges`,
        `Participate in code reviews and contribute to team discussions`,
        `Stay updated with industry trends and best practices`
      ];
    }

    // Normalize role for database storage (lowercase, hyphenated)
    const normalizeRoleForDB = (role) => {
      if (!role) return null;
      const lower = role.toLowerCase().trim();

      // Try to match known roles
      if (lower.includes('frontend') || lower.includes('front-end')) return 'frontend';
      if (lower.includes('backend') || lower.includes('back-end') || lower.includes('back end')) return 'backend';
      if (lower.includes('sqa') || lower.includes('qa') || lower.includes('quality assurance')) return 'sqa';

      // If no match, use normalized role (remove extra spaces, lowercase)
      return lower.replace(/\s+/g, '-');
    };

    const role = normalizeRoleForDB(standardizedRole || desiredRole);

    // Validate role exists
    if (!role) {
      cleanupFile(filePath);
      return res.status(400).json({
        message: `desiredRole is required`,
      });
    }

    // Create interview session
    // Store both question and idealAnswer (idealAnswer is hidden from frontend by default)
    const session = await InterviewSession.create({
      userId,
      setupId: setup._id,
      role, // Save role directly in session
      jobDescription: jobDescription || [], // Save generated job description (ensure it's an array)
      totalQuestions: allQuestions.length,
      currentIndex: 0,
      questions: allQuestions.map((q) => ({
        question: q.question,
        idealAnswer: q.idealAnswer, // Store ideal answer (hidden from frontend)
        answer: "",
        score: 0,
        feedback: ""
      })),
      isCompleted: false,
    });

    // Clean up uploaded file
    cleanupFile(filePath);

    // Return success response with extracted data and interview session
    // Only send question to frontend (idealAnswer is automatically hidden)
    return res.json({
      message: "Resume uploaded and analyzed successfully",
      success: true,
      redirectTo: "/interview/chat", // Frontend ko batata hai ki interview chat page pe redirect kare
      extractedData: {
        name: extractedData.name,
        desiredRole,
        experienceLevel,
        industry,
        education: educationLevel,
        skills: extractedData.skills || [],
        yearsOfExperience: extractedData.yearsOfExperience,
        summary: extractedData.summary,
      },
      interview: {
        sessionId: session._id,
        role: standardizedRole, // Return standardized role name
        jobDescription: jobDescription || [], // Always return job description array (4-5 bullet points)
        question: allQuestions[0].question, // Only send question, not idealAnswer
        totalQuestions: allQuestions.length,
      },
    });

  } catch (err) {
    // Clean up file on error
    if (filePath) {
      cleanupFile(filePath);
    }
    console.error("Resume upload error:", err);
    next(err);
  }
};

