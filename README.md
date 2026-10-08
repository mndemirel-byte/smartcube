# smartcube

Rubik küpü adım adım çözen ve öğreten 3D web uygulaması.

- **Tara:** Küp açılımını girin (kamera modülü yol haritasında), geçersiz dizilimler anında yakalanır
- **Çözüm:** Katman katman yöntemle 7 aşamalı, animasyonlu adım adım oynatıcı
- **Öğren:** Hamle notasyonu + yöntemin 7 adımı, küp üzerinde izlenebilir algoritma demolarıyla
- **Egzersiz:** Notasyon testi ve algoritma antrenmanı

## Kurulum

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # çözücü testleri
npm run build    # üretim derlemesi (dist/)
```

## Teknoloji

React 18 + Three.js (r128) + Vite. Backend yok — çözücü dahil her şey tarayıcıda çalışır.
Mimari ayrıntıları ve katkı kuralları için `CLAUDE.md` dosyasına bakın.
