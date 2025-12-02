// routes/users.js
const router = require("express").Router();
const User = require("../models/User");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");

// Tum kullanicilari getir (kendisi hariç),
// her kullanici icin: online mi, kac okunmamis mesaj var?
router.get("/", authMiddleware, async (req, res) => {
  try {
    const benimId = req.kullaniciId;

    // Kendisi disindaki kullanicilar
    const users = await User.find({ _id: { $ne: benimId } }).sort({
      kullaniciAdi: 1,
    });

    const simdi = Date.now();
    const SON_GORULME_LIMIT_MS = 30 * 1000; // 30 saniye: "online" kabul

    const sonuc = [];

    for (const u of users) {
      // ✅ bu kullanicidan bana gelen okunmamis mesaj sayisi
      const unreadCount = await Message.countDocuments({
        gonderen: u._id,
        alici: benimId,
        okunma: false,
      });

      const online =
        u.sonGorulme && simdi - u.sonGorulme.getTime() < SON_GORULME_LIMIT_MS;

      sonuc.push({
        _id: u._id,
        kullaniciAdi: u.kullaniciAdi,
        unreadCount,
        online,
      });
    }

    res.json(sonuc);
  } catch (err) {
    console.error("Kullanıcı listesi hatası:", err);
    res.status(500).json({ mesaj: "Kullanıcılar getirilemedi" });
  }
});

module.exports = router;
