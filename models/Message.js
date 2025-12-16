// models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    gonderen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
      alici: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false,
      },
      // optional group reference for group messages
      grup: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        required: false,
      },
    icerik: {
      type: String,
      required: false,
    },
    // optional image path (relative to /public)
    resim: {
      type: String,
      required: false,
    },
    // audio removed
    // delivered/read tracking
    delivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: { type: Date },
    okunma: {
      type: Boolean,
      default: false,
    },
    readAt: { type: Date },
    // reactions: array of { emoji, user }
    reactions: [
      {
        emoji: String,
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
    // ✅ هل تم قراءة الرسالة؟
    okunma: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

module.exports = mongoose.model("Message", messageSchema);
