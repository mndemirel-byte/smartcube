export const COLORS = {
  U: '#FFD500', D: '#F2F4F8', F: '#009E60', B: '#0051BA', R: '#FF5800', L: '#C41E3A',
};
export const COLOR_NAMES = { U: 'Sarı', D: 'Beyaz', F: 'Yeşil', B: 'Mavi', R: 'Turuncu', L: 'Kırmızı' };
export const FACE_LABELS = { U: 'Üst', D: 'Alt', F: 'Ön', B: 'Arka', R: 'Sağ', L: 'Sol' };
export const EMPTY_COLOR = '#3a3f46';

export const PHASE_META = {
  cross: { t: 'Beyaz Haç', d: 'Beyaz kenarlar alt yüze, yan renkler merkezlerle eşleşiyor.' },
  corners: { t: 'Beyaz Köşeler', d: 'Sexy move (R U R\u2032 U\u2032) ile köşeler yuvalarına giriyor; ilk katman bitiyor.' },
  middle: { t: 'Orta Katman', d: 'Üst kattaki kenarlar hizalanıp sağ/sol yerleştirmeyle orta kata iniyor.' },
  yellowCross: { t: 'Sarı Haç', d: 'F R U R\u2032 U\u2032 F\u2032 ile üst yüzde sarı artı oluşuyor.' },
  yellowEdges: { t: 'Sarı Kenarlar', d: 'Sarı kenarlar doğru yüzlerine taşınıyor (R U R\u2032 U R U2 R\u2032).' },
  yellowCornerPos: { t: 'Sarı Köşeler: Konum', d: 'Köşeler doğru yuvalara geçiyor (U R U\u2032 L\u2032 U R\u2032 U\u2032 L).' },
  yellowCornerOrient: { t: 'Sarı Köşeler: Yön', d: 'R\u2032 D\u2032 R D ile köşeler çevriliyor; küp tamamlanıyor.' },
};
export const PHASE_ORDER = ['cross', 'corners', 'middle', 'yellowCross', 'yellowEdges', 'yellowCornerPos', 'yellowCornerOrient'];

export const NET_GRID = [
  [null, 'U', null, null],
  ['L', 'F', 'R', 'B'],
  [null, 'D', null, null],
];
export const NOTATION_MOVES = ['U', "U'", 'R', "R'", 'F', "F'", 'D', "D'", 'L', "L'", 'B', "B'"];
export const ALGS = [
  { name: 'Sexy Move', alg: "R U R' U'", use: 'Beyaz köşeleri takmanın temel hamlesi. 6 kez üst üste yapılırsa küp başladığı hâle döner.' },
  { name: 'Sune', alg: "R U R' U R U2 R'", use: 'Sarı kenarları doğru yüzlere taşır. Son katmanın en ünlü algoritması.' },
  { name: 'Sağ Yerleştirme', alg: "U R U' R' U' F' U F", use: 'Üstteki kenarı orta katmanın sağ yuvasına indirir.' },
  { name: 'Sol Yerleştirme', alg: "U' L' U L U F U' F'", use: 'Üstteki kenarı orta katmanın sol yuvasına indirir.' },
  { name: 'Sarı Haç', alg: "F R U R' U' F'", use: 'Üst yüzde sarı artı oluşturur. Nokta → L → çizgi → haç sırasıyla ilerler.' },
  { name: 'Köşe Döngüsü', alg: "U R U' L' U R' U' L", use: 'Sarı köşeleri saat yönünde döndürerek doğru yuvalara taşır.' },
];
export const LEARN_STEPS = [
  { key: 'cross', alg: null, tip: 'Bu adım algoritmasız, sezgisel çözülür: beyaz kenarı önce üst kata çıkar, rengiyle aynı merkezin üstüne getir, iki kez çevirip aşağı indir.' },
  { key: 'corners', alg: "R U R' U'", tip: 'Köşeyi gideceği yuvanın tam üstüne getir, yerine oturana kadar sexy move uygula (en fazla 5 tekrar).' },
  { key: 'middle', alg: "U R U' R' U' F' U F", tip: 'Kenarın yan rengini merkeziyle hizala. Üstteki renk sağ merkezle aynıysa sağ, soldakiyle aynıysa sol yerleştirme.' },
  { key: 'yellowCross', alg: "F R U R' U' F'", tip: 'Deseni tut: L şekli sol-arkada, çizgi yatay olacak şekilde küpü çevirip algoritmayı uygula.' },
  { key: 'yellowEdges', alg: "R U R' U R U2 R'", tip: 'Doğru yerde olan kenarları arkaya ve sağa al, algoritmayı tekrarla.' },
  { key: 'yellowCornerPos', alg: "U R U' L' U R' U' L", tip: 'Yeri doğru olan bir köşe bul, onu sağ-ön köşede tut, diğerleri yerine oturana dek tekrarla.' },
  { key: 'yellowCornerOrient', alg: "R' D' R D", tip: 'Köşe sağ-önde: sarı üste bakana kadar tekrarla, sonra sadece üst yüzü çevirip sıradaki köşeyi getir. Küp bir anda çözülür!' },
];
