const express = require("express");
const router = express.Router();
const { getJobDescriptions, getRoleSuggestions } = require("../controllers/rolesController");

// No auth required for job descriptions (public information)
router.get("/suggestions", getRoleSuggestions);
router.get("/:role/jd", getJobDescriptions);

module.exports = router;

