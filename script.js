// Başlık yazma/silme animasyonu (tarayıcı başlığını kullan)
(async function () {
  const titleElement = document.getElementById("animatedTitle");
  if (!titleElement) return;

  const fullText = document.title || "BTF | Turkish Armed Forces";

  // Yardımcı bekleme fonksiyonu
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function typeText(speedMs) {
    titleElement.textContent = "";
    for (let i = 1; i <= fullText.length; i++) {
      titleElement.textContent = fullText.slice(0, i);
      await wait(speedMs);
    }
  }

  async function deleteText(speedMs) {
    for (let i = fullText.length; i >= 0; i--) {
      titleElement.textContent = fullText.slice(0, i);
      await wait(speedMs);
    }
  }

  // Sürekli döngü: yaz → 10 sn bekle → 1 ms'de sil → 0.5 sn'de tekrar yaz
  // İlk girişte de baştan başlayarak yazma animasyonu karşılar
  while (true) {
    await typeText(500); // 0.5 saniye/harf
    await wait(10000); // 10 saniye bekle
    await deleteText(1); // 1 ms/harf sil
    await typeText(500); // 0.5 saniye/harf tekrar yaz
  }
})();

// Kapak animasyonu bittikten sonra sayfayı göster
window.addEventListener("load", () => {
  const pageRoot = document.querySelector(".page-root");
  if (pageRoot) {
    // Kapak animasyonu yaklaşık 2.2s + 1.8s => 4s sürüyor, biraz pay bırakalım
    setTimeout(() => {
      pageRoot.classList.add("page-visible");
    }, 2600);
  }
}, { once: true });

// Performance: Reduce animations on slow devices
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Kopyalama, seçme, sağ tık vb. engellemeler
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
}, { passive: false });

document.addEventListener("copy", (e) => {
  e.preventDefault();
}, { passive: false });

document.addEventListener("cut", (e) => {
  e.preventDefault();
}, { passive: false });

document.addEventListener("selectstart", (e) => {
  e.preventDefault();
}, { passive: false });

document.addEventListener("dragstart", (e) => {
  e.preventDefault();
}, { passive: false });

// Smooth scroll for navigation links - Only if device doesn't prefer reduced motion
if (!prefersReducedMotion) {
  document.querySelectorAll('.main-nav a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// ===== KOD DOĞRULAMA MODAL LOGIC =====
(function () {
  const codeModalOverlay = document.getElementById('codeModalOverlay');
  const codeForm = document.getElementById('codeForm');
  const codeInput = document.getElementById('codeInput');
  const toggleVisibility = document.getElementById('toggleVisibility');
  const codeError = document.getElementById('codeError');
  const pageRoot = document.querySelector('.page-root');

  // Modalın açılması sırasında scroll'u engelle
  function enableModal() {
    document.body.classList.add('modal-open');
    pageRoot.classList.add('modal-active');
  }

  // Modalın kapanması sırasında scroll'u engellemeyi kaldır
  function disableModal() {
    document.body.classList.remove('modal-open');
    pageRoot.classList.remove('modal-active');
  }

  // Şifre göstergesi toggle etme
  toggleVisibility.addEventListener('click', () => {
    const isPassword = codeInput.type === 'password';
    codeInput.type = isPassword ? 'text' : 'password';
    toggleVisibility.textContent = isPassword ? '🙈' : '👁️';
  });

  // Hata mesajını gizle
  codeInput.addEventListener('input', () => {
    codeError.style.display = 'none';
  });

  // Kod doğrulama fonksiyonu - SADECE API'YE BAĞLI
  async function validateCode(code) {
    try {
      // Discord bot'undan gelen kodları doğrula
      // UYARI: localhost yerine bot'un çalıştığı sunucunun IP/domain adını yazınız
      // Örn: 'http://192.168.1.100:3000/verify-code' veya 'http://yourserver.com:3000/verify-code'
      const API_URL = window.location.protocol + '//' + window.location.hostname + ':3000/verify-code';
      
      // API call timeout'u (5 saniye)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      
      const result = await response.json();
      
      // API hata mesajını gönderdi ise, onu göster
      if (result.message) {
        codeError.querySelector('p').textContent = result.message;
      }
      
      if (result.valid) {
        return result; // user bilgilerini de dön
      }
      
      return false;
    } catch (error) {
      // API bağlantısı hatasında, kullanıcıya hata göster
      console.error('Kod doğrulama hatası:', error);
      
      // API'ye ulaşılamazsa, hata mesajı göster
      codeError.style.display = 'block';
      
      if (error.name === 'AbortError') {
        codeError.querySelector('p').textContent = '⏱️ İstek zaman aşımına uğradı. Lütfen daha sonra tekrar deneyin.';
      } else {
        codeError.querySelector('p').textContent = '🌐 Sunucuya bağlanılamadı. Lütfen daha sonra tekrar deneyin.';
      }
      
      return false;
    }
  }

  // Form submit
  codeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = codeInput.value.trim();

    if (!code) {
      codeError.style.display = 'block';
      codeError.querySelector('p').textContent = 'Lütfen bir kod girin.';
      return;
    }

    // Submit butonunu devre dışı bırak
    const submitBtn = codeForm.querySelector('.code-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Kontrol Ediliyor...';

    // Kodu doğrula
    if (await validateCode(code)) {
      // Başarılı - Modalı kapat ve gizle
      codeModalOverlay.classList.add('hidden');
      disableModal();
      
      setTimeout(() => {
        codeModalOverlay.style.display = 'none';
      }, 400);
    } else {
      // Başarısız - Hata göster
      codeError.style.display = 'block';
      
      if (!codeError.querySelector('p').textContent) {
        codeError.querySelector('p').textContent = '❌ Geçersiz kod! Lütfen Discord botundan yeni kod alın.';
      }
      
      codeInput.value = '';
      codeInput.focus();
      
      // Buton tekrar aktif et
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });

  // Sayfa kapatılırken oturumu temizle (tarayıcı sekmesi kapanırsa, otomatik temizlenir)
  // Sayfadan çıkılırken oturumu kaldır (tab kapatılması, pencere kapatılması, vb.)
  window.addEventListener('beforeunload', () => {
    // sessionStorage tab kapatılırsa otomatik temizlenir, ama eğer manuel temizleme istersen:
    // sessionStorage.removeItem('codeVerified');
  });

  // Başlangıçta modal'ı gösterme - intro animasyonun bitişini bekle
  // Intro animasyonu 2600ms'de bittiğine göre, hemen sonra açılır
  codeModalOverlay.classList.add('hidden');
  codeModalOverlay.style.display = 'none';
  document.body.classList.remove('modal-open');
  pageRoot.classList.remove('modal-active');

  // Intro animasyonu bittikten sonra Modal'ı göster
  setTimeout(() => {
    // Her giriş için kod istenmesi - Oturum sistemi devre dışı
    enableModal();
    codeModalOverlay.style.display = 'flex';
    codeModalOverlay.classList.remove('hidden');
    codeInput.focus();
  }, 2700);

  // Enter tuşu ile de form gönder
  codeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      codeForm.dispatchEvent(new Event('submit'));
    }
  });
})();

// ===== SADECE API-BASED VALIDATION =====
// Kod doğrulama sadece Discord bot'undan gelen API'yle yapılır
// localStorage test kodları KULLANILMIYOR - Sadece gerçek Discord botundan gelen kodlar geçerlidir
