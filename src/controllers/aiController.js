// const PreInterview = require("../models/PreInterview");
// const { getQuestionsByExperience } = require("../utils/questionGenerator");

// exports.generateQuestions = async (req, res, next) => {
//   try {
//     const userId = req.user.id;

//     // Fetch latest setup automatically
//     const setup = await PreInterview.findOne({ userId }).sort({ createdAt: -1 });

//     if (!setup) {
//       return res.status(404).json({
//         message: "No pre-interview setup found for this user"
//       });
//     }

//     const questions = await getQuestionsByExperience(
//       setup.desiredRole,
//       setup.experienceLevel,
//       setup.industry,
//       setup.educationLevel
//     );

//     return res.json({
//       message: "Questions generated using saved setup",
//       setupUsed: setup,
//       questions
//     });

//   } catch (err) {
//     next(err);
//   }
// };
