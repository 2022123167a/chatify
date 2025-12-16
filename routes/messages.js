// routes/messages.js
const router = require("express").Router();
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");
const Group = require("../models/Group");
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

// ensure upload dir exists
const uploadDir = path.join(__dirname, "..", "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || "";
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
  },
});

const upload = multer({ storage });

// ==========================
//  MESAJ GÖNDER (POST /api/messages)
// ==========================
// accept optional image file `resim` (no audio)
router.post(
  "/",
  authMiddleware,
  upload.single("resim"),
  async (req, res) => {
    const gonderenId = req.kullaniciId;
    const { aliciId, grupId, icerik } = req.body;
    const file = req.file;

    console.log("[messages.POST] body keys:", Object.keys(req.body || {}));
    console.log("[messages.POST] file:", file ? file.originalname : null);

    const resimPath = file ? "/uploads/" + file.filename : null;

    if ((!icerik || icerik.trim() === "") && !resimPath) {
      return res.status(400).json({ mesaj: "Eksik bilgi" });
    }

  // if grupId is provided, ensure group exists and user is member (basic check)
  if (grupId) {
    const grp = await Group.findById(grupId);
    if (!grp) return res.status(404).json({ mesaj: "Grup bulunamadı" });
    if (!grp.uyeler.map(String).includes(String(gonderenId))) {
      return res.status(403).json({ mesaj: "Gruba üye değilsiniz" });
    }
  }
  try {
    const msg = await Message.create({
      gonderen: gonderenId,
      alici: aliciId || null,
      grup: grupId || null,
      icerik: icerik || null,
      resim: resimPath,
    });

      console.log("[messages.POST] created message:", { id: msg._id, resim: msg.resim });

    res.json(msg);
  } catch (err) {
    console.error("Mesaj gönderme hatası:", err);
    res.status(500).json({ mesaj: "Mesaj gönderilemedi" });
  }
});

// ==========================
//  SOHBETİ GETİR + OKUNMUŞ YAP
//  GET /api/messages/:karsiId
// ==========================
router.get("/:karsiId", authMiddleware, async (req, res) => {
  const benimId = req.kullaniciId;
  const karsiId = req.params.karsiId;

  try {
    // 1) karşı kullanıcının bana gönderdiği okunmamışları "okundu" yap
    await Message.updateMany(
      {
        gonderen: karsiId,
        alici: benimId,
        okunma: false,
      },
      { $set: { okunma: true } }
    );

    // 2) iki taraf arasındaki tüm mesajları getir (tarih sırasıyla)
    const raw = await Message.find({
      $or: [
        { gonderen: benimId, alici: karsiId },
        { gonderen: karsiId, alici: benimId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("gonderen", "kullaniciAdi");

    const mesajlar = raw.map((m) => ({
      _id: m._id,
      icerik: m.icerik,
      resim: m.resim || null,
      gonderen: m.gonderen ? m.gonderen._id : null,
      gonderenName: m.gonderen ? m.gonderen.kullaniciAdi : null,
      createdAt: m.createdAt,
    }));

    res.json(mesajlar);
  } catch (err) {
    console.error("Mesajları getirirken hata:", err);
    res.status(500).json({ mesaj: "Mesajlar getirilemedi" });
  }
});

// GET messages for a group
// GET /api/messages/group/:groupId
router.get("/group/:groupId", authMiddleware, async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const grup = await Group.findById(groupId);
    if (!grup) return res.status(404).json({ mesaj: "Grup bulunamadı" });

    // optional: check membership
    if (!grup.uyeler.map(String).includes(String(req.kullaniciId))) {
      return res.status(403).json({ mesaj: "Gruba üye değilsiniz" });
    }

    const raw = await Message.find({ grup: groupId })
      .sort({ createdAt: 1 })
      .populate("gonderen", "kullaniciAdi");

    // normalize: send gonderen as id and include gonderenName for client convenience
    const mesajlar = raw.map((m) => ({
      _id: m._id,
      icerik: m.icerik,
      resim: m.resim || null,
      gonderen: m.gonderen ? m.gonderen._id : null,
      gonderenName: m.gonderen ? m.gonderen.kullaniciAdi : null,
      createdAt: m.createdAt,
    }));

    res.json(mesajlar);
  } catch (err) {
    console.error("Grup mesajları getirme hatası:", err);
    res.status(500).json({ mesaj: "Grup mesajları getirilemedi" });
  }
});

module.exports = router;

// POST /api/messages/:id/react -> add a reaction
router.post( 
  "/:id/react",
  authMiddleware,
  async (req, res) => {
    try {
      const msgId = req.params.id;
      const { emoji } = req.body;
      if (!emoji) return res.status(400).json({ mesaj: "Emoji eksik" });

      const msg = await Message.findById(msgId);
      if (!msg) return res.status(404).json({ mesaj: "Mesaj bulunamadı" });

      msg.reactions = msg.reactions || [];
      msg.reactions.push({ emoji, user: req.kullaniciId });
      await msg.save();

      res.json({ success: true, reactions: msg.reactions });
    } catch (err) {
      console.error("React hata:", err);
      res.status(500).json({ mesaj: "React eklenemedi" });
    }
  }
);

// POST /api/messages/:id/delivered -> mark delivered
router.post("/:id/delivered", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const msg = await Message.findByIdAndUpdate(
      id,
      { delivered: true, deliveredAt: Date.now() },
      { new: true }
    );
    if (!msg) return res.status(404).json({ mesaj: "Mesaj bulunamadı" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delivered update hata:", err);
    res.status(500).json({ mesaj: "Güncellenemedi" });
  }
});

// POST /api/messages/:id/read -> mark read
router.post("/:id/read", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const msg = await Message.findByIdAndUpdate(
      id,
      { okunma: true, readAt: Date.now() },
      { new: true }
    );
    if (!msg) return res.status(404).json({ mesaj: "Mesaj bulunamadı" });
    res.json({ success: true });
  } catch (err) {
    console.error("Read update hata:", err);
    res.status(500).json({ mesaj: "Güncellenemedi" });
  }
});

