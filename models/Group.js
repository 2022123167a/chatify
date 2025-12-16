// models/Group.js
const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    isim: {
      type: String,
      required: true,
    },
    uyeler: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    olusturan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Group", groupSchema);
