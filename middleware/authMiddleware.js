// middleware/authMiddleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async function (req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({ mesaj: "Yetkisiz erişim (token yok)" });
    }

    const token = parts[1];

    // Token doğrulama
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Request içine kullanıcı id'sini koy
    req.kullaniciId = decoded.id;

    // 🔥 Kullanıcı aktif demek -> sonGorulme'yi güncelle
    await User.findByIdAndUpdate(decoded.id, {
      sonGorulme: Date.now(),
    });

    next();
  } catch (err) {
    console.error("authMiddleware hatası:", err);
    return res.status(401).json({ mesaj: "Yetkisiz erişim" });
  }
};
