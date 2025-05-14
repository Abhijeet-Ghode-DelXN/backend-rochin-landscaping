// models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
});

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
