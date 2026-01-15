const PreInterview = require('../models/PreInterview');
const mongoose = require('mongoose');

/**
 * ------------------------------------------------
 *  CREATE PRE-INTERVIEW SETUP
 * ------------------------------------------------
 * Body: { desiredRole, industry, educationLevel, experienceLevel }
 * User ID always comes from JWT → req.user.id
 */
exports.createPreInterviewSetup = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { desiredRole, industry, educationLevel, experienceLevel } = req.body || {};

    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!desiredRole) {
      return res.status(400).json({ message: "desiredRole is required" });
    }

    if (!experienceLevel) {
      return res.status(400).json({ message: "experienceLevel is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId from token" });
    }

    const setup = await PreInterview.create({
      userId,
      desiredRole,
      industry,
      educationLevel,
      experienceLevel
    });

    res.status(201).json({ setup });

  } catch (err) {
    next(err);
  }
};



/**
 * ------------------------------------------------
 *  GET PRE-INTERVIEW SETUPS
 * ------------------------------------------------
 * Query: ?latest=true (optional)
 * User ID always comes from JWT → req.user.id
 */
exports.getUserSetup = async (req, res, next) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Not authorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId from token" });
    }

    const latest = req.query.latest === "true";

    if (latest) {
      const setup = await PreInterview.findOne({ userId })
        .sort({ createdAt: -1 })
        .lean();

      return res.json({ setup });
    }

    const setups = await PreInterview.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ setups });

  } catch (err) {
    next(err);
  }
};



/**
 * ------------------------------------------------
 *  DELETE PRE-INTERVIEW SETUP
 * ------------------------------------------------
 * DELETE /api/interview/setup/:id
 */
exports.deletePreInterviewSetup = async (req, res, next) => {
  try {
    const id = req.params.id;

    if (!id) {
      return res.status(400).json({ message: "Setup ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid setup ID format" });
    }

    const deleted = await PreInterview.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Setup not found" });
    }

    res.json({ message: "Deleted successfully", id });

  } catch (err) {
    next(err);
  }
};
