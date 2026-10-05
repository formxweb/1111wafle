# CUPISTAN — Bir bardağa sığan ülke

CUPISTAN'ın dijital marka deneyimi. Bir "kafe sitesi" değil; markanın kendi ülkesi.

**Konsept.** *-istan* "ülke" demek. Cupistan, bardakların ülkesi: sınırı bardağın kenarı, nüfusu tatlıya hayır diyemeyenler, başkenti Gebze. Bütün site bu fikirden türedi:

| Fikir | Sitede karşılığı |
| --- | --- |
| Ülkenin doğuşu | Hero: tek planlık sahne — waffle, çikolata, bardak. Scroll kamerayı hareket ettirir, ışığı imleç (mobilde parmak) taşır. |
| Sınır = bardağın kenarı | Görseller "kenar" maskesiyle (daire) açılır; hikâye bölümünde dönen sınır mührü. |
| Dört bölge | Menü kategorileri ekranın dört kenarında yaşar (K/D/G/B). Pusula halkası aktif bölgeye döner. |
| Ürünün formu = tipografi | Ekler uzun → geniş yazı (wdth 125). Milkshake uzun → dar yazı (wdth 62). Dondurma esner → hızlı kaydırınca yazı uzar. |
| Son reklam karesi | Footer: altın zemin, dev CUPISTAN, bardak, "Menüyü keşfet". |

## Klasör yapısı

```
index.html            Ana sayfa
menu.html             Menü (tools/build-menu.mjs ile üretilen bölümler içerir)
404.html              "Sınır dışı kaldın."
assets/
  css/base.css        Tasarım sistemi: renkler, tipografi, nav, imleç, grain, perde, final
  css/home.css        Ana sayfa sahneleri (masaüstü + ayrı mobil art direction)
  css/menu.css        Menü: pusula navigasyonu, panel koreografisi
  js/main.js          Giriş noktası; modüller sadece ilgili HTML varsa yüklenir
  js/core/            Tek rAF döngüsü, scroll/hız durumu, yardımcılar
  js/modules/         hero, menu, fit, reveal, cursor, magnetic, velocity, parallax, follow, variants, melt, transition, nav
  js/gl/              Ürün shader'ı (SDF) + WebGL2 renderer
  fonts/              Archivo (değişken: wght + wdth), Bodoni Moda Italic — Türkçe karakterlere göre alt kümelenmiş, kendi sunucunuzda
  img/products/       Ürün görselleri (şeffaf WebP, çoklu genişlik)
  img/social/         Instagram duvarı içerikleri
  img/og/             Paylaşım görseli (1200×630)
data/menu.json        Menü ve fiyatlar için TEK kaynak
tools/                Geliştirme araçları (yayına yüklenmez)
```

Derleme adımı yoktur. Dosyalar olduğu gibi yayınlanır.

## Yerelde çalıştırma

```bash
npm run serve            # http://localhost:5173
```

(Node 18+. ES modülleri `file://` ile çalışmaz; bir sunucu gerekir.)

## Yayına alma (Hostinger / cPanel / herhangi bir statik barındırma)

Şunları yükleyin: `index.html`, `menu.html`, `404.html`, `assets/`, `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `site.webmanifest`, `robots.txt`, `sitemap.xml`, `.htaccess`.
`tools/`, `data/`, `node_modules/`, `package*.json` yüklenmez (`.htaccess` yine de bunları engeller).

`.htaccess`: HTTPS'e ve www'suz alana yönlendirme, 404 sayfası, sıkıştırma, uzun önbellek, güvenlik başlıkları.

## Fiyat veya ürün değiştirme

1. `data/menu.json` dosyasını düzenleyin.
2. `node tools/build-menu.mjs` çalıştırın.

Bu komut `menu.html` içindeki kategori panellerini ve Menu şemasını (JSON-LD) yeniden yazar, ana sayfadaki `data-item="…"` taşıyan fiyatları da günceller. Görseli olmayan bir ürün eklenirse komut hata verir; kırık bağlantı oluşamaz.

## Görsel slotları — gerçek fotoğrafla birebir değiştirme

Şu anki ürün görselleri, sitenin kendi shader'ıyla üretilmiş stüdyo render'larıdır (`tools/render`). Hepsi aynı ışık ve aynı sanat yönetimiyle çekilmiş bir ürün ailesi gibi davranır. Gerçek çekim geldiğinde **aynı dosya adı, aynı oran ve aynı genişliklerde** WebP verin; HTML'e dokunmanız gerekmez.

| Slot | Oran (en büyük boy) | Genişlikler |
| --- | --- | --- |
| `hero-poster` | 1400×1400 | 700, 1000, 1400 |
| `waffle-fistik` | 1600×1600 | 400, 800, 1200, 1600 |
| `cup-imza` | 1200×1500 | 400, 600, 900, 1200 |
| `dondurma-uclu` | 1200×1500 | 400, 600, 900, 1200 |
| `ekler-cikolata` · `ekler-fistik` · `ekler-karamel` | 1600×900 | 800, 1200, 1600 |
| `shake-cikolata` · `shake-karamel` · `shake-cilek` | 1100×1650 | 500, 800, 1100 |
| `kahve-turk` | 800×800 | 400, 500, 800 |
| `waffle-klasik` · `waffle-karamel` · `brownie` · `profiterol` · `sicak-cikolata` | 800×800 | 400, 800 |
| `cubuk-waffle` · `dondurma-sade` · `-fistik` · `-bitter` · `-cilek` · `-limon` · `-cift` | 800×1000 | 400, 800 |

Çekim notları:

- **Arka planı temizlenmiş (şeffaf) PNG → WebP** önerilir. Tasarım, tipografinin ürünün arkasından/önünden geçmesine dayanır; ürünün zeminden ayrılmış olması bunu korur.
- Işık: sol üstten sıcak tepe ışığı, arkadan ince kontur ışığı, koyu ve sakin gölgeler.
- Ürün kadrajın ~%70–80'ini doldursun, yatayda ortalı olsun.
- Sosyal kareler (`img/social/`) `tools/render/compose.html` içindeki şablonlardan üretilir; gerçek Instagram fotoğraflarıyla da değiştirilebilir (4:5, 1:1, 9:16).

**Hero.** Açılışta `hero-poster` görünür (LCP), WebGL sahnesi derlenince piksel piksel aynı kareden devralır. Gerçek fotoğrafa geçmek isterseniz `hero-poster` dosyalarını değiştirin ve `<section class="hero" …>` etiketine `data-hero-static` ekleyin; sahne fotoğrafla, CSS hareketleriyle çalışır.

Render'ları yeniden üretmek için:

```bash
npm install
npm run render                      # tüm ürünler  (tools/render/stills.mjs)
node tools/render/render.mjs cup-imza
node tools/render/compose.mjs       # Instagram kareleri + OG görseli
node tools/icons.mjs                # favicon ve uygulama ikonları
```

## Yayından önce teyit edilmesi gerekenler

Aşağıdakiler kamuya açık kaynaklarda doğrulanamadı; tek yerden değiştirilebilir durumdadır:

- **Instagram kullanıcı adı**: `@cupistan` varsayıldı (`index.html`, `menu.html`, JSON-LD `sameAs`).
- **Alan adı**: `https://cupistan.com` varsayıldı (canonical, Open Graph, JSON-LD, `sitemap.xml`, `robots.txt`).
- **Fiyatlar ve ürün açıklamaları**: `data/menu.json` içinde örnek değerlerdir.
- **Logo ve kurumsal renkler**: resmi logo bulunamadığı için sistem ürünün kendisinden türetildi (kızarmış hamur altını, bitter çikolata, krema, fıstık). Renkler `assets/css/base.css` başındaki değişkenlerdedir.
- **Telefon ve çalışma saatleri**: bilinmediği için sitede ve şemada yer almıyor; uydurulmadı. Eklenmek istenirse JSON-LD'ye `telephone` ve `openingHoursSpecification` eklenmelidir.
- Adres: İlyas Uzuner Cd. No:15/A, Gebze / Kocaeli. "Yol tarifi" bağlantısı Google Haritalar aramasıdır.

## Teknik notlar

- **Performans.** İlk boyamada sadece poster görseli, 2 font ve 2 CSS dosyası yüklenir. WebGL sahnesi tarayıcı boşta kalınca derlenir; görünmezken çizim durur; kare süresine göre çözünürlüğü kendini ayarlar. Bütün diğer görseller `loading="lazy"`, `srcset` ve sabit en-boy oranıyla (CLS yok).
- **Erişilebilirlik.** Semantik başlık hiyerarşisi, "İçeriğe geç" bağlantısı, görünür odak halkaları, menüde ARIA sekme kalıbı (ok tuşları / Home / End), `prefers-reduced-motion` desteği (sabit hero, maskesiz açılış, ışık/imleç efektleri kapalı). axe-core denetimi: 0 ihlal.
- **JavaScript kapalıyken** bütün içerik okunur: menü kategorileri alt alta listelenir, bölge bağlantıları sayfa içi çapa olarak çalışır.
- **Tarayıcılar.** Güncel Chrome, Edge, Safari (iOS 15+), Firefox. WebGL2 yoksa hero poster ile çalışır.
- **SEO.** Her sayfada başlık/açıklama, canonical, Open Graph + Twitter kartı; ana sayfada `FoodEstablishment`/`IceCreamShop` (LocalBusiness) şeması, menüde `Menu` şeması (bölümler, ürünler, fiyatlar), `sitemap.xml`, `robots.txt`.
- **QA.** `npm run serve` açıkken `node tools/qa.mjs` masaüstü ve mobil ekran görüntüleri alır, konsol hatalarını ve 4xx/5xx yanıtları (kırık bağlantıları) raporlar.

Fontlar SIL Open Font License ile lisanslıdır (Archivo, Bodoni Moda).
