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
      required: true,
    },
    icerik: {
      type: String,
      required: true,
    },
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
