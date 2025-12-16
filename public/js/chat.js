// ======================
//   API VE KULLANICI
// ======================
const API_BASE = "/api";

const token = localStorage.getItem("token");
const aktif = JSON.parse(localStorage.getItem("kullanici"));
if (!token) location = "index.html";

// SOCKET.IO
const socket = io();
socket.on("connect", () => {
  if (aktif && aktif.id) socket.emit("user-connected", aktif.id);
});

socket.on("receive-group-message", (data) => {
  // if currently viewing this group, show message
  if (data.groupId === seciliGrupId) {
    const benmi = data.from === aktif.id;
    // avoid duplicate if last message already matches (simple dedupe)
    const alan = document.getElementById("mesaj-alani");
    const last = alan.querySelector('.mesaj:last-child');
    if (last) {
      const lastText = last.textContent || last.innerText || "";
      const lastIsBen = last.classList.contains('mesaj-ben');
        // if message has image, check by image URL in innerHTML; otherwise check text match
        const mediaCheck = data.resim || null;
        if (mediaCheck) {
          if (last.innerHTML && last.innerHTML.includes(mediaCheck) && lastIsBen === benmi) return;
        } else if (data.icerik) {
          if (lastText.includes(data.icerik) && lastIsBen === benmi) return;
        }
    }

    const media = data.resim || null;
    mesajEkle(data.icerik || "", benmi, benmi ? null : data.fromName, media, data.messageId || null, data.createdAt || null);
  } else {
    // TODO: increment unread badge for group (future)
  }
});

socket.on("receive-message", (data) => {
  // direct message received from another user
  // data: { to, from, fromName, icerik, createdAt }
  if (String(data.to) !== String(aktif.id)) return; // not for me

  // if currently chatting with sender, show message
    if (seciliKullaniciId && String(seciliKullaniciId) === String(data.from)) {
    // append incoming direct message
    const media = data.resim || null;
    // For one-to-one chats we do not show sender name above each message
    mesajEkle(data.icerik || "", false, null, media, data.messageId || null, data.createdAt || null);
    // update lastFetched tracking so polling won't re-render same data
    const key = `u_${data.from}`;
    if (!window._lastFetched) window._lastFetched = {};
    window._lastFetched[key] = window._lastFetched[key] || { count: 0, lastId: null };
    window._lastFetched[key].count = (window._lastFetched[key].count || 0) + 1;
    // lastId unknown until next poll; set to null
    window._lastFetched[key].lastId = null;
    // send delivered ack back with messageId if provided
      if (data.messageId) {
      socket.emit("message-delivered", { messageId: data.messageId, to: data.from });
      // also notify server via REST for persistence
      fetch(API_BASE + "/messages/" + data.messageId + "/delivered", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
      }).catch(() => {});
    }
  } else {
    // TODO: increment unread badge for sender
  }
});

let seciliKullaniciId = null;
let seciliKullaniciAd = "";
let seciliGrupId = null;
let seciliGrupName = "";

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
  // clear selected group when opening a direct chat
  seciliGrupId = null;
  seciliGrupName = "";

  document.getElementById("aktif-kullanici-adi").textContent = ad;

  document.querySelectorAll(".user-item").forEach((el) => {
    el.classList.toggle("aktif", el.dataset.id === id);
  });

  await mesajlariYukle(true);
  await loadUsers(); // okunmamis sayi sifirlansin
}


// ======================
//   GRUPLARI YÜKLE
// ======================
async function loadGroups() {
  try {
    const r = await fetch(API_BASE + "/groups", {
      headers: { Authorization: "Bearer " + token },
    });

    const liste = await r.json();

    const container = document.getElementById("grup-listesi");
    container.innerHTML = "";

    liste.forEach((g) => {
      const item = document.createElement("div");
      item.className = "group-item";
      item.dataset.id = g._id;
      item.textContent = g.isim + " (" + g.uyeSayisi + ")";

      item.onclick = () => grupAc(g._id, g.isim);

      if (g._id === seciliGrupId) {
        item.classList.add("aktif");
      }

      container.appendChild(item);
    });
  } catch (e) {
    console.error("Gruplar yüklenirken hata:", e);
  }
}

// ======================
//   GRUP AÇ
// ======================
function grupAc(id, isim) {
  seciliGrupId = id;
  seciliGrupName = isim;

  document.getElementById("aktif-kullanici-adi").textContent = isim;

  document.querySelectorAll(".user-item").forEach((el) => {
    el.classList.remove("aktif");
  });
  document.querySelectorAll(".group-item").forEach((el) => {
    el.classList.toggle("aktif", el.dataset.id === id);
  });

  // join socket.io room for this group
  try {
    if (window._joinedGroupId && window._joinedGroupId !== id) {
      socket.emit("leave-group", window._joinedGroupId);
    }
    socket.emit("join-group", id);
    window._joinedGroupId = id;
  } catch (e) {
    console.warn("Socket join failed:", e);
  }

  // For now we don't have group messages UI/backend; clear messages area
  const alan = document.getElementById("mesaj-alani");
  alan.innerHTML = "<div class=\"info\">Grup sohbeti: " + isim + "</div>";

  // load persisted group messages
  mesajlariYukle(true);
}

// ======================
//   GRUP OLUŞTURMA MODALI
// ======================
document.getElementById("create-group-btn").onclick = openCreateGroupModal;
document.getElementById("create-group-cancel").onclick = closeCreateGroupModal;
document.getElementById("create-group-submit").onclick = createGroup;

function closeCreateGroupModal() {
  document.getElementById("create-group-modal").classList.add("gizli");
}

async function openCreateGroupModal() {
  try {
    // get users to show as checkboxes (reuse API)
    const r = await fetch(API_BASE + "/users", {
      headers: { Authorization: "Bearer " + token },
    });
    const users = await r.json();

    const container = document.getElementById("group-users-container");
    container.innerHTML = "";

    users.forEach((u) => {
      const label = document.createElement("label");
      label.className = "group-user-label";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = u._id;

      const span = document.createElement("span");
      span.textContent = u.kullaniciAdi;

      label.appendChild(cb);
      label.appendChild(span);

      container.appendChild(label);
    });

    document.getElementById("create-group-modal").classList.remove("gizli");
  } catch (e) {
    console.error("Grup modal yüklenirken hata:", e);
  }
}

// IMAGE PREVIEW + ROTATE + DELETE + DRAG&DROP
const fileInput = document.getElementById('image-input');
const previewContainer = document.getElementById('preview-container');
let _previewFile = null;
let _previewRotate = 0;
// voice recording removed

function clearPreview() {
  previewContainer.innerHTML = '';
  _previewFile = null; _previewRotate = 0;
}

function showPreviewFile(file) {
  clearPreview();
  _previewFile = file;
  const url = URL.createObjectURL(file);
  const img = document.createElement('img');
  img.src = url; img.className = 'preview-thumb'; img.style.transform = `rotate(${_previewRotate}deg)`;
  const actions = document.createElement('div'); actions.className = 'preview-actions';
  const del = document.createElement('button'); del.textContent = 'Sil'; del.onclick = () => { clearPreview(); fileInput.value = ''; };
  const rot = document.createElement('button'); rot.textContent = 'Döndür'; rot.onclick = () => { _previewRotate = (_previewRotate + 90) % 360; img.style.transform = `rotate(${_previewRotate}deg)`; };
  actions.appendChild(rot); actions.appendChild(del);
  previewContainer.appendChild(img); previewContainer.appendChild(actions);
}

fileInput.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) showPreviewFile(f);
});

// voice recording removed

// drag & drop onto main chat area
const chatMain = document.querySelector('.chat-main');
chatMain.addEventListener('dragover', (e) => { e.preventDefault(); });
chatMain.addEventListener('drop', (e) => {
  e.preventDefault();
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) {
    fileInput.files = e.dataTransfer.files; // set input
    showPreviewFile(f);
  }
});

async function createGroup() {
  const isim = document.getElementById("group-name-input").value.trim();
  if (!isim) return alert("Grup ismi girin");

  const checked = Array.from(
    document.querySelectorAll("#group-users-container input[type=checkbox]:checked")
  ).map((i) => i.value);

  if (checked.length === 0) return alert("En az bir üye seçin");

  try {
    await fetch(API_BASE + "/groups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ isim, uyeIds: checked }),
    });

    closeCreateGroupModal();
    document.getElementById("group-name-input").value = "";
    await loadGroups();
  } catch (e) {
    console.error("Grup oluşturulurken hata:", e);
    alert("Grup oluşturulamadı");
  }
}

// ======================
//   MESAJLARI YÜKLE
// ======================
async function mesajlariYukle(scrollToBottom) {
  try {
    const alan = document.getElementById("mesaj-alani");
    const eskiScroll = alan.scrollTop;
    const maxScroll = alan.scrollHeight - alan.clientHeight;
    if (seciliGrupId) {
      // load group messages
      const r = await fetch(API_BASE + "/messages/group/" + seciliGrupId, {
        headers: { Authorization: "Bearer " + token },
      });
      const ms = await r.json();

      // dedupe: if nothing changed since last fetch for this group, skip
      const key = `g_${seciliGrupId}`;
      window._lastFetched = window._lastFetched || {};
      const last = window._lastFetched[key] || { count: 0, lastId: null };
      const count = ms.length;
      const lastId = count ? ms[count - 1]._id : null;
      if (last.count === count && last.lastId === lastId) {
        // nothing changed
      } else {
        alan.innerHTML = "";
        ms.forEach((m) => {
          const benmi = m.gonderen && String(m.gonderen) === String(aktif.id);
          const media = m.resim || null;
          mesajEkle(m.icerik || "", benmi, benmi ? null : m.gonderenName, media, m._id, m.createdAt || null);
        });
        window._lastFetched[key] = { count, lastId };
      }
    } else if (seciliKullaniciId) {
      const r = await fetch(API_BASE + "/messages/" + seciliKullaniciId, {
        headers: { Authorization: "Bearer " + token },
      });
      const ms = await r.json();

      // dedupe: if nothing changed since last fetch for this one-to-one chat, skip
      const key = `u_${seciliKullaniciId}`;
      window._lastFetched = window._lastFetched || {};
      const last = window._lastFetched[key] || { count: 0, lastId: null };
      const count = ms.length;
      const lastId = count ? ms[count - 1]._id : null;
      if (last.count === count && last.lastId === lastId) {
        // nothing changed
      } else {
        alan.innerHTML = "";
        ms.forEach((m) => {
          const media = m.resim || null;
          const benmi = m.gonderen && String(m.gonderen) === String(aktif.id);
          // In one-to-one chats we do not show sender name above each message
          const senderName = null;
          mesajEkle(m.icerik || "", benmi, senderName, media, m._id, m.createdAt || null);
        });
        window._lastFetched[key] = { count, lastId };
      }
    }

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
  const fileInput = document.getElementById("image-input");
  const icerik = input.value.trim();
  if (!icerik && !(fileInput && fileInput.files && fileInput.files.length > 0)) return;

  try {
    let created = null;

    // if image attached, send as FormData
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      const fd = new FormData();
      if (seciliGrupId) fd.append("grupId", seciliGrupId);
      else if (seciliKullaniciId) fd.append("aliciId", seciliKullaniciId);
      if (icerik) fd.append("icerik", icerik);
      fd.append("resim", fileInput.files[0]);

      const resp = await fetch(API_BASE + "/messages", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
        },
        body: fd,
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        alert(json.mesaj || json.message || 'Mesaj gönderilemedi');
        return;
      }
      created = json;
    } else {
      const payload = seciliGrupId
        ? { grupId: seciliGrupId, icerik }
        : { aliciId: seciliKullaniciId, icerik };

      const resp = await fetch(API_BASE + "/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify(payload),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        alert(json.mesaj || json.message || 'Mesaj gönderilemedi');
        return;
      }
      created = json;
    }

    // Emit socket event so other clients see message in real-time
    if (seciliGrupId) {
      socket.emit("send-group-message", {
        groupId: seciliGrupId,
        icerik: created.icerik || icerik || null,
        resim: created.resim || null,
        from: aktif.id,
        fromName: aktif.kullaniciAdi,
        messageId: created._id,
        createdAt: created.createdAt || new Date().toISOString(),
      });
    } else if (seciliKullaniciId) {
      socket.emit("send-message", {
        to: seciliKullaniciId,
        from: aktif.id,
        fromName: aktif.kullaniciAdi,
        icerik: created.icerik || icerik || null,
        resim: created.resim || null,
        messageId: created._id,
        createdAt: created.createdAt || new Date().toISOString(),
      });
    }

    // Kendimizde direkt göster (text and/or image)
    if (created && created.resim) {
      mesajEkle(created.icerik || "", true, null, created.resim, created._id, created.createdAt || null);
    } else {
      mesajEkle(created.icerik || icerik || "", true, null, null, created._id, created.createdAt || null);
    }
    input.value = "";
    if (fileInput) fileInput.value = "";
    // clear preview
    clearPreview();
    // update lastFetched so next poll won't clear/re-render unnecessarily
    if (!window._lastFetched) window._lastFetched = {};
    if (seciliKullaniciId) {
      const key = `u_${seciliKullaniciId}`;
      window._lastFetched[key] = window._lastFetched[key] || { count: 0, lastId: null };
      window._lastFetched[key].count = (window._lastFetched[key].count || 0) + 1;
      window._lastFetched[key].lastId = created._id || null;
    }

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

// Typing indicator: emit when user types
let _typingTimeout = null;
const typingEmit = () => {
  if (seciliGrupId) {
    socket.emit("typing", { groupId: seciliGrupId, fromName: aktif.kullaniciAdi });
  } else if (seciliKullaniciId) {
    socket.emit("typing", { to: seciliKullaniciId, fromName: aktif.kullaniciAdi });
  }
  if (_typingTimeout) clearTimeout(_typingTimeout);
  _typingTimeout = setTimeout(() => {
    // stop typing - by emitting empty? we'll just let indicator timeout client-side
  }, 2000);
};

document.getElementById("mesaj-input").addEventListener("input", () => {
  typingEmit();
});

// show typing indicator when socket receives typing
socket.on("typing", (data) => {
  const el = document.getElementById("aktif-okunmamis");
  if (!el) return;
  el.classList.remove("gizli");
  el.textContent = (data.fromName || "...") + " yazıyor...";
  // hide after 2s of no updates
  if (window._typingHideTimeout) clearTimeout(window._typingHideTimeout);
  window._typingHideTimeout = setTimeout(() => {
    el.classList.add("gizli");
  }, 2000);
});

// ======================
//   EKRANA MESAJ EKLE
// ======================
function mesajEkle(text, benmi) {
  const alan = document.getElementById("mesaj-alani");

  const d = document.createElement("div");
  d.className = "mesaj " + (benmi ? "mesaj-ben" : "mesaj-diger");
  // allow reactions and store message id if provided as 5th arg
  const msgId = arguments[4] || null;
  if (msgId) d.dataset.msgId = msgId;
  const senderName = arguments[2] || null;
  const imageUrl = arguments[3] || null;
  const createdAt = arguments[5] || null;
  if (senderName) d.innerHTML = `<strong class="msg-sender">` + senderName + ": " + `</strong>`;
  if (text) {
    const t = document.createElement('span');
    t.textContent = text;
    d.appendChild(t);
  }
  if (imageUrl) {
    const mediaWrap = document.createElement('div');
    mediaWrap.className = 'media-wrap';
    const img = document.createElement('img');
    img.src = imageUrl;
    img.className = 'msg-image';
    mediaWrap.appendChild(img);
    d.appendChild(mediaWrap);
    // mark message as media so CSS can size the bubble to the media
    d.classList.add('mesaj-media');
  }

  // reactions container
  const reactionsWrap = document.createElement('div');
  reactionsWrap.className = 'reactions-wrap';
  d.appendChild(reactionsWrap);

  // reaction button
  const reactBtn = document.createElement('button');
  reactBtn.className = 'react-btn';
  reactBtn.textContent = '';
  reactBtn.onclick = (e) => {
    e.stopPropagation();
    const emoji = prompt('Emoji girin (örnek: ❤️, 👍, 😂)');
    if (!emoji) return;
    const messageId = d.dataset.msgId;
    // send to server
    if (messageId) {
      fetch(API_BASE + '/messages/' + messageId + '/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ emoji }),
      })
        .then((r) => r.json())
        .then((json) => {
          // update UI
          updateReactionsUI(reactionsWrap, json.reactions || []);
          // notify via socket
          socket.emit('reaction', { messageId, emoji, to: null, user: aktif.id });
        })
        .catch(console.error);
    }
  };
    d.appendChild(reactBtn);

    // show timestamp under the message (if available)
    if (createdAt) {
      try {
        const dt = new Date(createdAt);
        if (!isNaN(dt.getTime())) {
          const hh = dt.getHours().toString().padStart(2, '0');
          const mm = dt.getMinutes().toString().padStart(2, '0');
          const timeEl = document.createElement('div');
          timeEl.className = 'msg-time';
          timeEl.textContent = hh + ':' + mm;
          d.appendChild(timeEl);
        }
      } catch (e) {
        // ignore formatting errors
      }
    }

    // append to message area and auto-scroll
    alan.appendChild(d);
    alan.scrollTop = alan.scrollHeight;
}

// ======================

function updateReactionsUI(container, reactions) {
  container.innerHTML = '';
  const counts = {};
  reactions.forEach((r) => { counts[r.emoji] = (counts[r.emoji] || 0) + 1; });
  Object.keys(counts).forEach((e) => {
    const b = document.createElement('span');
    b.className = 'react-pill';
    b.textContent = e + ' ' + counts[e];
    container.appendChild(b);
  });
}
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
  // Only poll for direct (one-to-one) chats. For groups we rely on Socket.IO.
  if (!seciliGrupId) mesajlariYukle(false);
}, 1000);

// Kullanıcı listesi (online/offline + unread)
// 3 saniyede bir güncelleniyor
setInterval(() => {
  loadUsers();
}, 3000);

// İlk yükleme
loadUsers();
loadGroups();
