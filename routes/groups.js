// routes/groups.js
const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const Group = require("../models/Group");
const User = require("../models/User");

// POST /api/groups  -> create a group
router.post("/", authMiddleware, async (req, res) => {
  try {
    const olusturan = req.kullaniciId;
    const { isim, uyeIds } = req.body;

    if (!isim || !Array.isArray(uyeIds) || uyeIds.length === 0) {
      return res.status(400).json({ mesaj: "Eksik bilgi" });
    }

    // ensure creator is part of the group
    const uniqueUyeler = Array.from(new Set([...uyeIds, olusturan]));

    const group = await Group.create({
      isim,
      uyeler: uniqueUyeler,
      olusturan,
    });

    res.json(group);
  } catch (err) {
    console.error("Grup oluşturma hatası:", err);
    res.status(500).json({ mesaj: "Grup oluşturulamadı" });
  }
});

// GET /api/groups -> get groups current user is member of
router.get("/", authMiddleware, async (req, res) => {
  try {
    const benimId = req.kullaniciId;

    const gruplar = await Group.find({ uyeler: benimId })
      .populate("uyeler", "kullaniciAdi")
      .sort({ createdAt: -1 });

    const sonuc = gruplar.map((g) => ({
      _id: g._id,
      isim: g.isim,
      uyeSayisi: g.uyeler.length,
      uyeler: g.uyeler,
    }));

    res.json(sonuc);
  } catch (err) {
    console.error("Gruplar getirilemedi:", err);
    res.status(500).json({ mesaj: "Gruplar getirilemedi" });
  }
});

module.exports = router;
