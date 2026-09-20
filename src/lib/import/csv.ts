/** CSV o'qish.
 *
 *  Tashqi kutubxonasiz: brokerlar beradigan fayllar oddiy, lekin
 *  ajratgichi har xil (`,`, `;`, tab) va qo'shtirnoq ichida vergul
 *  bo'lishi mumkin. Shu ikkisi hisobga olinadi — qolgani ortiqcha.
 */

/** Ajratgichni birinchi bir necha qatordan topadi.
 *
 *  Tanlov sodda: qaysi belgi qatorlarda eng barqaror sonda uchrasa —
 *  o'sha. "Eng ko'p" emas, aynan "barqaror": vergul matn ichida ham
 *  uchraydi, ajratgich esa har qatorda bir xil sonda bo'ladi.
 */
export function detectDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 10);
  if (lines.length === 0) return ',';

  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestScore = -1;

  for (const sep of candidates) {
    const counts = lines.map((line) => countOutsideQuotes(line, sep));
    const first = counts[0];
    if (first === 0) continue;

    const stable = counts.every((c) => c === first);
    // Barqaror bo'lsa — ustunlar soni bo'yicha baholaymiz.
    const score = stable ? first * 10 : first;
    if (score > bestScore) {
      bestScore = score;
      best = sep;
    }
  }

  return best;
}

function countOutsideQuotes(line: string, sep: string): number {
  let count = 0;
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') i += 1;
      else quoted = !quoted;
    } else if (!quoted && ch === sep) {
      count += 1;
    }
  }

  return count;
}

/** Matnni qator va ustunlarga ajratadi.
 *
 *  Qo'shtirnoq ichidagi ajratgich va qator ko'chirish hisobga olinadi;
 *  ikkilangan qo'shtirnoq (`""`) bitta belgiga aylanadi.
 */
export function parseCsv(text: string, delimiter?: string): string[][] {
  // BOM — Excel qo'shadigan ko'rinmas belgi. Qolsa birinchi ustun nomi
  // buziladi va ustunni tanib bo'lmaydi.
  const clean = text.replace(/^\uFEFF/, '');
  const sep = delimiter ?? detectDelimiter(clean);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];

    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === sep) {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch !== '\r') {
      field += ch;
    }
  }

  // Oxirgi maydon: fayl qator ko'chirishsiz tugagan bo'lishi mumkin.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Butunlay bo'sh qatorlar tashlab yuboriladi.
  return rows
    .map((r) => r.map((cell) => cell.trim()))
    .filter((r) => r.some((cell) => cell.length > 0));
}
