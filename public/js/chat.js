// ======================
//   API VE KULLANICI
// ======================
const API_BASE = "/api";

const token = localStorage.getItem("token");
const aktif = JSON.parse(localStorage.getItem("kullanici"));
if (!token) location = "index.html";

let seciliKullaniciId = null;
let seciliKullaniciAd = "";

// ======================
//   KULLANICILARI YÜKLE
//   (online + unreadCount)
// ======================
async function loadUsers() {
  try {
    const r = await fetch(API_BASE + "/users", {
      headers: { Authorization: "Bearer " + token },
    });

    const liste = await r.json();

    const container = document.getElementById("kullanici-listesi");
    container.innerHTML = "";

    liste
      .filter((u) => u.kullaniciAdi) // ismi bos olanlari gosterme
      .forEach((u) => {
        const item = document.createElement("div");
        item.className = "user-item";
        item.dataset.id = u._id;

        // Sol taraf: status + isim
        const left = document.createElement("div");
        left.className = "user-left";

        const statusDot = document.createElement("span");
        statusDot.className =
          "status-dot " + (u.online ? "status-online" : "status-offline");

        const nameSpan = document.createElement("span");
        nameSpan.className = "user-name";
        nameSpan.textContent = u.kullaniciAdi;

        left.appendChild(statusDot);
        left.appendChild(nameSpan);

        item.appendChild(left);

        // Sağ taraf: okunmamış sayı
        if (u.unreadCount && u.unreadCount > 0) {
          const badge = document.createElement("span");
          badge.className = "unread-badge";
          badge.textContent = u.unreadCount;
          item.appendChild(badge);
        }

        item.onclick = () => sohbetAc(u._id, u.kullaniciAdi);

        if (u._id === seciliKullaniciId) {
          item.classList.add("aktif");
        }

        container.appendChild(item);
      });
  } catch (e) {
    console.error("Kullanıcılar yüklenirken hata:", e);
  }
}

// ======================
//   SOHBETİ AÇ
// ======================
async function sohbetAc(id, ad) {
  seciliKullaniciId = id;
  seciliKullaniciAd = ad;

  document.getElementById("aktif-kullanici-adi").textContent = ad;

  document.querySelectorAll(".user-item").forEach((el) => {
    el.classList.toggle("aktif", el.dataset.id === id);
  });

  await mesajlariYukle(true);
  await loadUsers(); // okunmamis sayi sifirlansin
}

// ======================
//   MESAJLARI YÜKLE
// ======================
async function mesajlariYukle(scrollToBottom) {
  if (!seciliKullaniciId) return;

  try {
    const r = await fetch(API_BASE + "/messages/" + seciliKullaniciId, {
      headers: { Authorization: "Bearer " + token },
    });
    const ms = await r.json();

    const alan = document.getElementById("mesaj-alani");
    const eskiScroll = alan.scrollTop;
    const maxScroll = alan.scrollHeight - alan.clientHeight;

    alan.innerHTML = "";

    ms.forEach((m) => {
      mesajEkle(m.icerik, m.gonderen === aktif.id);
    });

    if (scrollToBottom || alan.scrollTop >= maxScroll - 5) {
      alan.scrollTop = alan.scrollHeight;
    } else {
      alan.scrollTop = eskiScroll;
    }
  } catch (e) {
    console.error("Mesajlar yüklenirken hata:", e);
  }
}

// ======================
//   MESAJ GÖNDER
// ======================
document.getElementById("gonder-btn").onclick = async () => {
  const input = document.getElementById("mesaj-input");
  const icerik = input.value.trim();
  if (!icerik || !seciliKullaniciId) return;

  try {
    await fetch(API_BASE + "/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ aliciId: seciliKullaniciId, icerik }),
    });

    // Kendimizde direkt göster
    mesajEkle(icerik, true);
    input.value = "";

    // Diğer tarafta da görünsün diye yenile
    await mesajlariYukle(true);
    await loadUsers();
  } catch (e) {
    console.error("Mesaj gönderilirken hata:", e);
  }
};

// Enter ile gönder
document.getElementById("mesaj-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("gonder-btn").click();
  }
});

// ======================
//   EKRANA MESAJ EKLE
// ======================
function mesajEkle(text, benmi) {
  const alan = document.getElementById("mesaj-alani");

  const d = document.createElement("div");
  d.className = "mesaj " + (benmi ? "mesaj-ben" : "mesaj-diger");
  d.textContent = text;

  alan.appendChild(d);
}

// ======================
//   ÇIKIŞ
// ======================
document.getElementById("cikis-btn").onclick = () => {
  localStorage.clear();
  location = "index.html";
};

// ======================
//   OTOMATİK YENİLEME
// ======================
// Mesajları 1 saniyede bir kontrol et
setInterval(() => {
  mesajlariYukle(false);
}, 1000);

// Kullanıcı listesi (online/offline + unread)
// 3 saniyede bir güncelleniyor
setInterval(() => {
  loadUsers();
}, 3000);

// İlk yükleme
loadUsers();
