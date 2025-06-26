// routes/messageRoutes.js
const express = require("express");
const router = express.Router();
const { getMessage, updateMessage } = require("../controllers/message.controller");
const { protect, authorize } = require('../middlewares/auth'); // Admin authentication middleware

// Get the current message
router.get("/", getMessage);

// Update or create a new message (admin only)
router.post("/",updateMessage);

module.exports = router;
