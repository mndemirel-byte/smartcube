# smartcube

Rubik küpünü tarayıp (şimdilik elle girip) katman katman yöntemle adım adım çözen,
3D animasyonlu, yeni başlayanlara yönelik eğitim içerikli web uygulaması. Arayüz dili Türkçe.

## Komutlar

- `npm run dev` — geliştirme sunucusu (Vite)
- `npm run build` — üretim derlemesi
- `npm test` — motor + çözücü testleri (node:test, ek bağımlılık yok)

## Mimari

```
src/
├── core/engine.js        # Küp modeli + hamleler + LBL çözücü + doğrulama (saf JS, React'sız)
├── data/content.js       # Renkler, aşama metinleri, algoritmalar, eğitim içeriği
├── components/
│   ├── CubeViewer.jsx    # Three.js 3D küp (imperatif API: setCube / animateMove / getState)
│   └── MoveChip.jsx      # Renkli hamle notasyon çipi
├── App.jsx               # Sekmeler ve tüm uygulama durumu (Tara / Çözüm / Öğren / Egzersiz)
└── styles.css            # Tasarım sistemi (koyu stüdyo + 6 küp rengi + sarı vurgu)
tests/solver.test.js      # 200 rastgele karıştırma + parite/doğrulama testleri
```

## Kritik kabuller — bunları bozma

1. **Facelet düzeni:** Küp 54 elemanlı dizi; `U=0-8, R=9-17, F=18-26, D=27-35, L=36-44, B=45-53`,
   her yüz satır-öncelikli (row-major). Bu dizi hem çözücünün hem 3D render'ın tek doğruluk kaynağı.
2. **Yön kabulü:** Beyaz ALT (`D`), sarı üst (`U`), yeşil ön (`F`), mavi arka, turuncu sağ, kırmızı sol.
   Kullanıcıya verilen "beyaz altta, yeşil önde tut" talimatı ve tüm aşama metinleri buna bağlı.
3. **Hamle tabloları elle yazılmaz.** `engine.js` içindeki `PERM` tabloları her sticker'ın 3D
   koordinat + normal vektöründen program başında geometrik olarak türetilir (`faceletGeom` + `rotCW`).
   Yeni hamle türü (örn. M, E, S dilimleri veya küp rotasyonları x/y/z) eklerken aynı türetme
   yaklaşımını kullan, sabit dizi yazma.
4. **Çözücü kasıtlı olarak başlangıç (katman katman) yöntemidir**, optimal değildir (~170 hamle).
   Çözüm aşamaları Öğren sekmesindeki 7 adımla birebir aynı olmalı — bu eğitim tutarlılığı üründür,
   Kociemba ile değiştirme. Hız/optimallik istenirse ayrı bir "uzman modu" olarak ekle.
5. **`engine.js`'e dokunan her değişiklikten sonra `npm test` çalıştır.** Çözücüdeki hatalar
   sinsi olur; testler 200 rastgele karıştırma + parite tuzakları içerir.
6. **CubeViewer sözleşmesi:** `animateMove` bittiğinde mantıksal durumu `applyMove` ile günceller ve
   sahneyi durumdan yeniden kurar (rebuild). Görsel dönüş ile mantıksal sonucun eşleşmesi bu
   yeniden kurmaya dayanır; animasyonu "transform biriktirme" modeline çevirme.
7. Three.js `^0.128` sabitlendi (`sRGBEncoding`, `Geometry` API'leri). Sürüm yükseltirken
   `outputEncoding → outputColorSpace` değişimine dikkat; kodda guard var ama test et.

## Kod kuralları

- Arayüz metinleri Türkçe; kod tanımlayıcıları İngilizce.
- Hamle gösteriminde `'` yerine `\u2032` (′) karakteri render edilir (`MoveChip` yapar).
- `engine.js` React'tan bağımsız kalmalı (Node'da test edilebilirlik şart).
- Stil: styles.css'teki mevcut token'ları kullan (bg `#101216`, panel `#191c22`,
  vurgu `#FFD500`, küp renkleri `content.js`teki resmi değerler).

## Yol haritası (öncelik sırasıyla)

1. **Kamera tarama modülü** — `getUserMedia` + 3×3 grid overlay + HSV renk sınıflandırma.
   Çıktısı Tara sekmesindeki `paint` dizisini doldurur; doğrulama/çözücü olduğu gibi kullanılır.
   Beyaz/sarı ayrımı için parlaklık (V) kanalına, ışık toleransı için merkez kareyi referans
   almaya dikkat. Elle düzeltme akışı korunmalı (kamera her zaman yanılabilir).
2. TypeScript'e geçiş (önce `engine.js` → `engine.ts`).
3. PWA (offline çalışma — backend zaten yok).
4. Çözüm süresi / hamle istatistikleri, egzersiz ilerleme kaydı (localStorage).
5. Erişilebilirlik turu: klavye ile hamle kontrolü, `prefers-reduced-motion`'da animasyonsuz mod.

## Agent skills

### Issue tracker

Issues live as GitHub issues (repo not yet git-initialized / no remote set). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context layout: `CONTEXT.md` + `docs/adr/` at repo root. See `docs/agents/domain.md`.
