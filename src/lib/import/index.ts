/** Import — yagona kirish nuqtasi.
 *
 *  Fayl matni beriladi, jadval qaytadi. Qaysi ko'rinishda ekani
 *  (CSV yoki MT hisoboti) o'zi aniqlanadi — foydalanuvchi tanlamaydi.
 */

import { parseCsv } from './csv';
import { looksLikeHtml, parseMtHtml, type Grid } from './mt';
import { suggestMapping, type Mapping } from './fields';

export type Parsed = {
  kind: 'csv' | 'mt';
  headers: string[];
  rows: string[][];
  mapping: Mapping;
};

export class ImportError extends Error {
  /** Tarjima kaliti — xabar foydalanuvchi tilida ko'rsatiladi. */
  constructor(public code: 'empty' | 'noTable' | 'noRows' | 'tooBig' | 'badFile') {
    super(code);
    this.name = 'ImportError';
  }
}

/** Bir martada olinadigan eng ko'p savdo.
 *
 *  Chegara bor: brauzerda oldindan ko'rsatish ham, bitta tranzaksiya
 *  ham cheksiz emas. Ikki yillik tarix ham bu songa sig'adi.
 */
export const MAX_ROWS = 2000;

export function parseFile(text: string): Parsed {
  if (!text.trim()) throw new ImportError('empty');

  if (looksLikeHtml(text)) {
    const grid = parseMtHtml(text);
    if (!grid) throw new ImportError('noTable');
    return finish('mt', grid);
  }

  const rows = parseCsv(text);
  if (rows.length === 0) throw new ImportError('empty');
  if (rows.length < 2) throw new ImportError('noRows');

  return finish('csv', { headers: rows[0], rows: rows.slice(1) });
}

function finish(kind: 'csv' | 'mt', grid: Grid): Parsed {
  if (grid.rows.length === 0) throw new ImportError('noRows');
  if (grid.rows.length > MAX_ROWS) throw new ImportError('tooBig');

  // Sarlavhasiz ustun ham tanlanishi mumkin bo'lishi uchun nomlanadi.
  const headers = grid.headers.map((h, i) => (h.trim() ? h.trim() : `#${i + 1}`));

  return { kind, headers, rows: grid.rows, mapping: suggestMapping(headers) };
}
