const express = require('express');
const router = express.Router();

const { chat } = require('../controllers/helpController');
const authMiddleware = require('../middlewares/authMiddleware');

// ---------------------------------------------
// Help/Chat routes
// ---------------------------------------------
router.post('/chat', authMiddleware, chat);

module.exports = router;

