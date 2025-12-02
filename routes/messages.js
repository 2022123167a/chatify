// routes/messages.js
const router = require("express").Router();
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");

// ==========================
//  MESAJ GÖNDER (POST /api/messages)
// ==========================
router.post("/", authMiddleware, async (req, res) => {
  const gonderenId = req.kullaniciId;
  const { aliciId, icerik } = req.body;

  if (!aliciId || !icerik) {
    return res.status(400).json({ mesaj: "Eksik bilgi" });
  }

  try {
    const msg = await Message.create({
      gonderen: gonderenId,
      alici: aliciId,
      icerik,
      // okunma: false  -> default zaten
    });

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
    const mesajlar = await Message.find({
      $or: [
        { gonderen: benimId, alici: karsiId },
        { gonderen: karsiId, alici: benimId },
      ],
    }).sort({ createdAt: 1 });

    res.json(mesajlar);
  } catch (err) {
    console.error("Mesajları getirirken hata:", err);
    res.status(500).json({ mesaj: "Mesajlar getirilemedi" });
  }
});

module.exports = router;
