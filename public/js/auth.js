// public/js/auth.js
// Giriş ve kayıt sayfasinin JS kodlari

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const switchText = document.getElementById("switch-text");
const switchLink = document.getElementById("switch-link");
const formBaslik = document.getElementById("form-baslik");
const formAltBaslik = document.getElementById("form-alt-baslik");

const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");

// Form degistirme (Giris <-> Kayıt)
let loginModu = true;

function formDegistir() {
  loginModu = !loginModu;

  if (loginModu) {
    loginForm.classList.remove("gizli");
    registerForm.classList.add("gizli");
    formBaslik.textContent = "Tekrar Hoş Geldin";
    formAltBaslik.textContent = "Hesabına giriş yap";
    switchText.textContent = "Hesabın yok mu?";
    switchLink.textContent = "Kayıt Ol";
  } else {
    loginForm.classList.add("gizli");
    registerForm.classList.remove("gizli");
    formBaslik.textContent = "Aramıza Hoş Geldin";
    formAltBaslik.textContent = "Yeni bir hesap oluştur";
    switchText.textContent = "Zaten hesabın var mı?";
    switchLink.textContent = "Giriş Yap";
  }
}

switchLink.addEventListener("click", formDegistir);

// ✅ SUNUCU ADRESI BURADA AYARLANIYOR
const API_BASE = "http://localhost:1000/api";

// -------------------------
//        Giriş
// -------------------------
loginBtn.addEventListener("click", async () => {
  const kullaniciAdi = document.getElementById("login-kullanici").value.trim();
  const sifre = document.getElementById("login-sifre").value.trim();

  if (!kullaniciAdi || !sifre) {
    alert("Lütfen kullanici adi ve sifreyi doldur");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kullaniciAdi, sifre })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.mesaj || "Giriş sırasında hata olustu");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("kullanici", JSON.stringify(data.kullanici));

    window.location.href = "chat.html";
  } catch (err) {
    console.error("Login fetch hatasi:", err);
    alert("Sunucuya baglanilamadi");
  }
});

// -------------------------
//        Kayıt
// -------------------------
registerBtn.addEventListener("click", async () => {
  const kullaniciAdi = document.getElementById("reg-kullanici").value.trim();
  const sifre = document.getElementById("reg-sifre").value.trim();

  if (!kullaniciAdi || !sifre) {
    alert("Lütfen kullanici adi ve sifreyi doldur");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kullaniciAdi, sifre })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.mesaj || "Kayıt sırasında hata olustu");
      return;
    }

    alert("Kayıt basarili! Şimdi giriş yapabilirsiniz.");
    if (!loginModu) formDegistir();
  } catch (err) {
    console.error("Register fetch hatasi:", err);
    alert("Sunucuya baglanilamadi");
  }
});
