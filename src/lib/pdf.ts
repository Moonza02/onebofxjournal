import 'server-only';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { money, num, pct, signedMoney } from './format';
import { reportHighlights, type ReportGroup, type WeeklyReport } from './report';
import { fill, type Dict } from './i18n';
import { sessionLabel } from './i18n/labels';

/** Haftalik hisobotning PDF ko'rinishi.
 *
 *  Brauzersiz tuziladi — pdfkit to'g'ridan-to'g'ri PDF yozadi, shuning uchun
 *  serverda headless Chrome saqlash shart emas.
 *
 *  Rang sxemasi ilovanikidan farq qiladi: hisobot bosiladi va pochtada
 *  ochiladi, shuning uchun oq fon. Brend ko'k rangi urg'u sifatida qoladi.
 */

const BLUE = '#3B81FC';
const INK = '#111826';
const MUTED = '#6B7687';
const LINE = '#E3E7EE';
const WIN = '#1A9E5F';
const LOSS = '#D94141';

const PAGE = { width: 595.28, margin: 42 };
const CONTENT = PAGE.width - PAGE.margin * 2;

/** Matn shu chiziqdan pastga tushmaydi — pastda izoh qatori turadi. */
const BOTTOM = 775;

type Doc = PDFKit.PDFDocument;

/** pdfkit ning ichki shriftlari WinAnsi kodlashida — ularda kirill harflari
 *  yo'q, shuning uchun ruscha hisobot o'qib bo'lmas holga kelardi. Shu sababli
 *  DejaVu Sans (Bitstream Vera litsenziyasi) PDF ichiga joylanadi: uchala til
 *  ham bitta shriftda chiqadi. pdfkit shriftni faqat ishlatilgan harflar
 *  bo'yicha qisqartirib qo'yadi, fayl og'irlashmaydi.
 */
const FONT = 'Sans';
const FONT_BOLD = 'SansBold';

function fontPath(file: string): string {
  return path.join(process.cwd(), 'public', 'fonts', file);
}

function registerFonts(doc: Doc): void {
  doc.registerFont(FONT, fontPath('DejaVuSans.ttf'));
  doc.registerFont(FONT_BOLD, fontPath('DejaVuSans-Bold.ttf'));
}

function tone(value: number): string {
  return value > 0 ? WIN : value < 0 ? LOSS : INK;
}

/** Zaxira yo'l: pdfkit ning ichki (WinAnsi) shriftlari bilan ishlaganda
 *  kerak bo'ladi. Hisobot DejaVu bilan chiziladi, shuning uchun bu yerda
 *  chaqirilmaydi — lekin funksiya eksport bo'lib qoladi.
 *
 *  PDF ning standart shriftlari WinAnsi kodlashida ishlaydi — unda
 *  matematik minus, o'ng strelka va cheksizlik belgisi yo'q. Ular
 *  almashtirilmasa o'rnida tasodifiy harf chiqadi.
 *
 *  O'zbek apostrofi (' va ') WinAnsi da bor, shuning uchun tegilmaydi.
 */
const KEEP = new Set(['‘', '’', '“', '”', '–', '—', '…', '•']);

const REPLACE: Record<string, string> = {
  '−': '-', // minus
  '→': '->',
  '∞': 'cheksiz',
  '≥': '>=',
  '≤': '<=',
};

export function safe(value: string): string {
  return value.replace(/[\u2000-\u2BFF]/g, (ch) => REPLACE[ch] ?? (KEEP.has(ch) ? ch : '-'));
}

function header(doc: Doc, report: WeeklyReport, d: Dict) {
  doc.rect(0, 0, PAGE.width, 74).fill(BLUE);

  doc
    .fillColor('#FFFFFF')
    .font(FONT_BOLD)
    .fontSize(17)
    .text('ONEBO FX', PAGE.margin, 22);

  doc
    .font(FONT)
    .fontSize(9.5)
    .fillColor('#DCE8FF')
    .text(d.pdf.title, PAGE.margin, 45);

  doc
    .font(FONT_BOLD)
    .fontSize(10.5)
    .fillColor('#FFFFFF')
    .text(report.label, PAGE.margin, 22, { width: CONTENT, align: 'right' });

  doc
    .font(FONT)
    .fontSize(9)
    .fillColor('#DCE8FF')
    .text(`${report.userName} · ${report.accountName}`, PAGE.margin, 46, {
      width: CONTENT,
      align: 'right',
    });

  doc.y = 96;
}

function sectionTitle(doc: Doc, text: string) {
  ensureSpace(doc, 40);
  doc
    .font(FONT_BOLD)
    .fontSize(11.5)
    .fillColor(INK)
    .text(text, PAGE.margin, doc.y);
  doc.moveDown(0.35);
  const y = doc.y;
  doc.moveTo(PAGE.margin, y).lineTo(PAGE.margin + CONTENT, y).lineWidth(0.8).strokeColor(LINE).stroke();
  doc.y = y + 10;
}

/** Sahifada joy qolmasa yangisini ochadi. */
function ensureSpace(doc: Doc, needed: number) {
  if (doc.y + needed > BOTTOM) {
    doc.addPage();
    doc.y = PAGE.margin;
  }
}

function kpiRow(doc: Doc, cells: { label: string; value: string; color?: string }[]) {
  const gap = 10;
  const width = (CONTENT - gap * (cells.length - 1)) / cells.length;
  const top = doc.y;

  cells.forEach((cell, i) => {
    const x = PAGE.margin + i * (width + gap);
    doc.roundedRect(x, top, width, 56, 8).lineWidth(0.8).strokeColor(LINE).stroke();
    // Sarlavha tarjimada uzayishi mumkin — ikkinchi qatorga tushib
    // qiymat ustiga chiqmasligi uchun shrift kerakli darajada kichiklashadi.
    const label = cell.label.toUpperCase();
    let size = 7.5;
    doc.font(FONT_BOLD).fontSize(size);
    while (size > 5.5 && doc.widthOfString(label, { characterSpacing: 0.6 }) > width - 24) {
      size -= 0.25;
      doc.fontSize(size);
    }

    doc
      .fillColor(MUTED)
      .text(label, x + 12, top + 12, {
        width: width - 24,
        characterSpacing: 0.6,
        lineBreak: false,
      });
    doc
      .font(FONT_BOLD)
      .fontSize(15)
      .fillColor(cell.color ?? INK)
      .text(cell.value, x + 12, top + 27, { width: width - 24 });
  });

  doc.y = top + 56 + 16;
}

function bullets(doc: Doc, items: string[]) {
  doc.font(FONT).fontSize(9.5).fillColor(INK);
  for (const item of items) {
    const line = item;
    const height = doc.heightOfString(line, { width: CONTENT - 16 });
    ensureSpace(doc, height + 10);
    const y = doc.y;
    doc.circle(PAGE.margin + 3, y + 5, 2).fill(BLUE);
    doc.fillColor(INK).text(line, PAGE.margin + 14, y, { width: CONTENT - 16 });
    doc.y += 5;
  }
  doc.y += 8;
}

/** Hafta kunlari bo'yicha ustunlar — noldan yuqori va past tomonga. */
function dayChart(doc: Doc, report: WeeklyReport) {
  const height = 110;
  ensureSpace(doc, height + 34);

  const top = doc.y;
  const zero = top + height / 2;
  const max = Math.max(1, ...report.byDay.map((d) => Math.abs(d.netPnl)));
  const slot = CONTENT / 7;
  const barWidth = Math.min(46, slot - 16);

  doc.moveTo(PAGE.margin, zero).lineTo(PAGE.margin + CONTENT, zero).lineWidth(0.8).strokeColor(LINE).stroke();

  report.byDay.forEach((day, i) => {
    const cx = PAGE.margin + slot * i + slot / 2;
    const h = (Math.abs(day.netPnl) / max) * (height / 2 - 12);

    if (day.count > 0 && h > 0.5) {
      const y = day.netPnl >= 0 ? zero - h : zero;
      doc.rect(cx - barWidth / 2, y, barWidth, h).fill(day.netPnl >= 0 ? WIN : LOSS);

      doc
        .font(FONT_BOLD)
        .fontSize(7.5)
        .fillColor(tone(day.netPnl))
        .text(
          signedMoney(day.netPnl, 0),
          cx - slot / 2,
          day.netPnl >= 0 ? y - 11 : y + h + 3,
          { width: slot, align: 'center' },
        );
    }

    doc
      .font(FONT)
      .fontSize(8)
      .fillColor(MUTED)
      .text(day.label.slice(0, 3), cx - slot / 2, top + height + 4, { width: slot, align: 'center' });
  });

  doc.y = top + height + 26;
}

type Column = { label: string; width: number; align?: 'left' | 'right' };

type Cell = { text: string; color?: string; align?: 'left' | 'right' };

function table(doc: Doc, columns: Column[], rows: Cell[][]) {
  const drawHead = () => {
    const y = doc.y;
    doc.rect(PAGE.margin, y, CONTENT, 20).fill('#F4F6FA');
    let x = PAGE.margin;
    columns.forEach((col) => {
      doc
        .font(FONT_BOLD)
        .fontSize(7.5)
        .fillColor(MUTED)
        .text(col.label.toUpperCase(), x + 8, y + 6.5, {
          width: col.width - 16,
          align: col.align ?? 'left',
          characterSpacing: 0.5,
        });
      x += col.width;
    });
    doc.y = y + 20;
  };

  ensureSpace(doc, 60);
  drawHead();

  rows.forEach((row) => {
    if (doc.y + 19 > BOTTOM) {
      doc.addPage();
      doc.y = PAGE.margin;
      drawHead();
    }

    const y = doc.y;
    let x = PAGE.margin;

    row.forEach((cell, i) => {
      const col = columns[i];
      doc
        .font(FONT)
        .fontSize(8.5)
        .fillColor(cell.color ?? INK)
        .text(cell.text, x + 8, y + 5.5, { width: col.width - 16, align: cell.align ?? col.align ?? 'left' });
      x += col.width;
    });

    doc.y = y + 19;
    doc
      .moveTo(PAGE.margin, doc.y)
      .lineTo(PAGE.margin + CONTENT, doc.y)
      .lineWidth(0.5)
      .strokeColor(LINE)
      .stroke();
  });

  doc.y += 16;
}

function groupTable(doc: Doc, groups: ReportGroup[], d: Dict) {
  const columns: Column[] = [
    { label: d.pdf.colName, width: CONTENT * 0.34 },
    { label: d.pdf.trades, width: CONTENT * 0.13, align: 'right' },
    { label: 'Win rate', width: CONTENT * 0.17, align: 'right' },
    { label: d.pdf.avgR, width: CONTENT * 0.16, align: 'right' },
    { label: d.kpi.netPnl, width: CONTENT * 0.2, align: 'right' },
  ];

  table(
    doc,
    columns,
    groups.map((g) => [
      { text: g.key },
      { text: String(g.count), align: 'right' },
      { text: `${num(g.winRate, 0)}%`, align: 'right' },
      { text: `${g.avgR >= 0 ? '+' : '−'}${num(Math.abs(g.avgR), 2)}R`, align: 'right' },
      { text: signedMoney(g.netPnl), color: tone(g.netPnl), align: 'right' },
    ]),
  );
}

function footer(doc: Doc, d: Dict) {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);

    // Matn pastki chegaradan pastroqqa yoziladi. Chegara olib
    // qo'yilmasa pdfkit har bir izoh uchun yangi sahifa ochib yuboradi.
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;

    doc
      .font(FONT)
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(d.pdf.footer, PAGE.margin, doc.page.height - 30, {
        width: CONTENT,
        lineBreak: false,
      })
      .text(`${i - range.start + 1} / ${range.count}`, PAGE.margin, doc.page.height - 30, {
        width: CONTENT,
        align: 'right',
        lineBreak: false,
      });

    doc.page.margins.bottom = bottom;
  }
}

export async function renderWeeklyPdf(report: WeeklyReport, d: Dict): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margin: PAGE.margin,
    bufferPages: true,
    info: {
      Title: fill(d.pdf.heading, { label: report.label }),
      Author: 'ONEBO FX',
    },
  });

  registerFonts(doc);

  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  header(doc, report, d);

  kpiRow(doc, [
    { label: d.kpi.netPnl, value: signedMoney(report.netPnl, 0), color: tone(report.netPnl) },
    { label: d.pdf.trades, value: String(report.count) },
    { label: 'Win rate', value: `${num(report.winRate, 0)}%` },
    {
      label: d.pdf.totalR,
      value: `${report.totalR >= 0 ? '+' : '−'}${num(Math.abs(report.totalR), 2)}R`,
      color: tone(report.totalR),
    },
  ]);

  kpiRow(doc, [
    {
      label: 'Profit factor',
      value: report.profitFactor === null ? '—' : num(report.profitFactor, 2),
    },
    { label: d.kpi.expectancy, value: signedMoney(report.expectancy), color: tone(report.expectancy) },
    { label: d.kpi.compliance, value: pct(report.ruleCompliance, 0) },
    { label: d.pdf.balance, value: money(report.closeBalance, 0) },
  ]);

  sectionTitle(doc, d.pdf.summary);
  bullets(doc, reportHighlights(report, d));

  if (report.count > 0) {
    sectionTitle(doc, d.pdf.byDay);
    dayChart(doc, report);

    if (report.bySetup.length > 0) {
      sectionTitle(doc, d.pdf.setups);
      groupTable(doc, report.bySetup, d);
    }

    if (report.bySession.length > 1) {
      sectionTitle(doc, d.pdf.sessions);
      groupTable(
        doc,
        report.bySession.map((g) => ({ ...g, key: sessionLabel(g.key, d) })),
        d,
      );
    }

    sectionTitle(doc, d.pdf.trades);
    table(
      doc,
      [
        { label: d.pdf.colDate, width: CONTENT * 0.16 },
        { label: d.pdf.colSymbol, width: CONTENT * 0.17 },
        { label: d.pdf.colDirection, width: CONTENT * 0.13 },
        { label: 'Setup', width: CONTENT * 0.24 },
        { label: 'R', width: CONTENT * 0.13, align: 'right' },
        { label: 'P&L', width: CONTENT * 0.17, align: 'right' },
      ],
      report.trades.map((t) => [
        { text: t.day },
        { text: t.symbol },
        { text: t.direction },
        { text: t.compliant ? t.setup : `${t.setup} *`, color: t.compliant ? INK : LOSS },
        {
          text: `${t.r >= 0 ? '+' : '−'}${num(Math.abs(t.r), 2)}R`,
          color: tone(t.r),
          align: 'right',
        },
        { text: signedMoney(t.pnl), color: tone(t.pnl), align: 'right' },
      ]),
    );

    if (report.broken.length > 0) {
      doc
        .font(FONT)
        .fontSize(8)
        .fillColor(MUTED)
        .text(d.pdf.starNote, PAGE.margin, doc.y, {
          width: CONTENT,
        });
      doc.y += 16;
    }
  }

  if (report.lessons.length > 0) {
    sectionTitle(doc, d.pdf.journal);
    bullets(doc, report.lessons);
  }

  footer(doc, d);
  doc.end();

  return done;
}
