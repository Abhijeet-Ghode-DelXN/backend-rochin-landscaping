// controllers/messageController.js
const Message = require("../models/message.model");

// Get the current message
const getMessage = async (req, res) => {
  try {
    const message = await Message.findOne();
    if (!message) {
      return res.status(404).json({ message: "No message found" });
    }
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: "Error fetching message", error });
  }
};

// Update or create a new message
const updateMessage = async (req, res) => {
  const { content, active } = req.body;

  if (!content || typeof active !== "boolean") {
    return res.status(400).json({ message: "Invalid data" });
  }

  try {
    let message = await Message.findOne();

    // If a message already exists, update it
    if (message) {
      message.content = content;
      message.active = active;
      await message.save();
    } else {
      // If no message exists, create a new one
      message = new Message({ content, active });
      await message.save();
    }

    res.status(200).json({ message: "Message updated successfully", message });
  } catch (error) {
    res.status(500).json({ message: "Error updating message", error });
  }
};

module.exports = { getMessage, updateMessage };
