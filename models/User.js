// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  kullaniciAdi: {
    type: String,
    required: true,
    unique: true,
  },
  sifre: {
    type: String,
    required: true,
  },
  // Son gorulme (online / offline icin)
  sonGorulme: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
