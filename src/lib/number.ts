/** Odam yozgan raqamni o'qish.
 *
 *  `Number('0,25')` — `NaN`. Telefon klaviaturasi esa o'nlik ajratgich
 *  sifatida ko'pincha aynan vergul qo'yadi: o'zbek, rus va boshqa
 *  ko'pgina tartiblarda nuqta umuman yo'q. Natijada odam hammasini
 *  to'g'ri to'ldiradi, ekranda risk ham to'g'ri hisoblanadi, lekin
 *  saqlashda "Expected number, received nan" chiqadi.
 *
 *  Shu nomuvofiqlik bir marta qimmatga tushdi: mijoz tomonida vergulni
 *  tushunadigan o'qigich bor edi, serverda esa yo'q. Endi ikkalasi ham
 *  shu yerdan foydalanadi — qoida bitta joyda yozilgan.
 *
 *  Qoidalar, ataylab sodda va oldindan aytib bo'ladigan:
 *
 *  - Bo'sh joy, uzilmas bo'sh joy va apostrof — minglik ajratgich,
 *    olib tashlanadi: `100 122` → `100122`.
 *  - Nuqta va vergul **ikkalasi** bo'lsa, keyin turgani o'nlik
 *    ajratgich: `1.234,56` → `1234.56`, `1,234.56` → `1234.56`.
 *  - Bittasi **takrorlansa** — minglik ajratgich: `1.234.567` → `1234567`.
 *  - Yolg'iz vergul **har doim** o'nlik ajratgich: `0,25` → `0.25`.
 *    Ataylab shunday: `150,123` ni USDJPY narxi deb o'qish
 *    `150123` deb o'qishdan xavfsizroq — narx jimgina ming marta
 *    kattalashib ketmaydi.
 */

/** Minglik ajratgich sifatida ishlatiladigan belgilar. */
const GROUPING = /[\s\u00A0\u202F\u2009\u2007']/g;

/** Turli chiziqchalar — matndan ko'chirilganda uchraydi. */
const MINUS = /[\u2212\u2013\u2014]/g;

/** O'qib bo'lmasa `NaN`. Chaqiruvchi o'zi hal qiladi. */
export function parseNumber(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;

  let s = String(raw ?? '')
    .trim()
    .replace(GROUPING, '')
    .replace(MINUS, '-');

  if (!s) return NaN;

  const dots = (s.match(/\./g) ?? []).length;
  const commas = (s.match(/,/g) ?? []).length;

  if (dots > 0 && commas > 0) {
    const decimal = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
    const grouping = decimal === '.' ? ',' : '.';
    s = s.split(grouping).join('');
    s = s.replace(decimal, '.');
  } else if (commas > 1) {
    s = s.split(',').join('');
  } else if (dots > 1) {
    s = s.split('.').join('');
  } else if (commas === 1) {
    s = s.replace(',', '.');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/** O'qib bo'lmasa tayinlangan qiymat. Jonli hisob-kitob uchun: u yerda
 *  yarim yozilgan maydon xato emas, shunchaki hali nol.
 */
export function toNumber(raw: string | number | null | undefined, fallback = 0): number {
  const n = parseNumber(raw);
  return Number.isFinite(n) ? n : fallback;
}
