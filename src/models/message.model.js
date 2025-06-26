// models/Message.js
const mongoose = require("mongoose");
const tenantScopePlugin = require('./plugins/tenantScope.plugin');

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

messageSchema.plugin(tenantScopePlugin);

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
