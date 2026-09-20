import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { compareToForecast, type StoredEvent } from './economics';
import { money, num, pct, signedMoney, weekdaysLong } from './format';
import { fill, type Dict, type Locale } from './i18n';
import {
  groupBy,
  isClosed,
  netPnl,
  pnlOnDay,
  summarize,
  tradesOnDay,
  weekdayBreakdown,
  winRateAfterLoss,
  type TradeLike,
} from './stats';
import { dayKeyIn, todayKeyIn } from './tz';

/** Ertalabki brifing. Iqtisodiy qismdan tashqari hammasi
 *  foydalanuvchining o'z ma'lumotidan — tashqi manbasiz.
 */

export type BriefStatus = {
  yesterdayPnl: number;
  yesterdayTrades: number;
  yesterdayCompliant: boolean;
  dailyLimit: number;
  drawdownUsedPct: number;
  targetProgressPct: number;
  openCount: number;
};

export function buildStatus(
  account: { dailyLossPct: number; maxDrawdownPct: number; profitTargetPct: number; startingBalance: number },
  trades: TradeLike[],
  timeZone: string,
): BriefStatus {
  const summary = summarize(trades, account.startingBalance);

  const yesterdayKey = dayKeyIn(new Date(Date.now() - 86400000), timeZone);
  const yesterdayTrades = tradesOnDay(trades, yesterdayKey, timeZone);

  const growth =
    account.startingBalance > 0 ? (summary.netPnl / account.startingBalance) * 100 : 0;

  return {
    yesterdayPnl: yesterdayTrades.reduce((s, t) => s + netPnl(t), 0),
    yesterdayTrades: yesterdayTrades.length,
    yesterdayCompliant: yesterdayTrades.every((t) => t.ruleCompliant),
    dailyLimit: (summary.balance * account.dailyLossPct) / 100,
    drawdownUsedPct:
      account.maxDrawdownPct > 0 ? (summary.maxDrawdownPct / account.maxDrawdownPct) * 100 : 0,
    targetProgressPct: account.profitTargetPct > 0 ? (growth / account.profitTargetPct) * 100 : 0,
    openCount: trades.filter((t) => !isClosed(t)).length,
  };
}

/** Har kuni bitta eslatma — navbat bilan, sana bo'yicha aylanadi.
 *  Faqat yetarli ma'lumot bo'lgan faktlar ro'yxatga tushadi.
 */
export function statReminder(
  trades: TradeLike[],
  timeZone: string,
  d: Dict,
  locale: Locale = 'uz',
): string | null {
  const weekdays = weekdaysLong(locale);
  const summary = summarize(trades, 0);
  if (summary.count < 10) return null;

  const candidates: string[] = [];

  const days = weekdayBreakdown(trades, timeZone).slice(0, 5).filter((d) => d.count >= 3);
  if (days.length >= 3) {
    const best = days.reduce((a, b) => (b.netPnl > a.netPnl ? b : a));
    const worst = days.reduce((a, b) => (b.netPnl < a.netPnl ? b : a));
    if (best.netPnl > 0) {
      candidates.push(
        fill(d.brief.statBestDay, {
          day: weekdays[best.index],
          pnl: signedMoney(best.netPnl / best.count),
        }),
      );
    }
    if (worst.netPnl < 0) {
      candidates.push(
        fill(d.brief.statWorstDay, {
          day: weekdays[worst.index],
          pnl: signedMoney(worst.netPnl),
        }),
      );
    }
  }

  const after = winRateAfterLoss(trades);
  if (after.count >= 10 && after.winRate < summary.winRate - 8) {
    candidates.push(
      fill(d.brief.statAfterLoss, {
        after: num(after.winRate, 0),
        overall: num(summary.winRate, 0),
      }),
    );
  }

  const bySetup = groupBy(trades, (t) => t.setup?.name ?? 'Setupsiz').filter((g) => g.count >= 5);
  if (bySetup.length >= 2) {
    const best = bySetup[0];
    const worst = bySetup[bySetup.length - 1];
    if (best.netPnl > 0) {
      candidates.push(
        fill(d.brief.statBestSetup, {
          key: best.key,
          n: best.count,
          pnl: signedMoney(best.netPnl),
        }),
      );
    }
    if (worst.netPnl < 0) {
      candidates.push(
        fill(d.brief.statWorstSetup, { key: worst.key, pnl: signedMoney(worst.netPnl) }),
      );
    }
  }

  const bySession = groupBy(trades, (t) => t.session).filter((g) => g.count >= 5);
  if (bySession.length >= 2 && bySession[0].netPnl > 0) {
    candidates.push(
      fill(d.brief.statSession, {
        key: bySession[0].key,
        n: bySession[0].count,
        pnl: signedMoney(bySession[0].netPnl),
      }),
    );
  }

  if (summary.ruleCompliance < 85) {
    candidates.push(fill(d.brief.statRule, { pct: pct(summary.ruleCompliance, 0) }));
  }

  if (candidates.length === 0) return null;

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );
  return candidates[dayOfYear % candidates.length];
}

/** Bugungi risk holati bir qatorda. */
export function todayLine(
  account: { dailyLossPct: number },
  trades: TradeLike[],
  startingBalance: number,
  timeZone: string,
  d: Dict,
): string {
  const summary = summarize(trades, startingBalance);
  const todayPnl = pnlOnDay(trades, todayKeyIn(timeZone), timeZone);
  const dayStart = summary.balance - todayPnl;
  const limit = (dayStart * account.dailyLossPct) / 100;

  if (todayPnl === 0) {
    return fill(d.brief.limitOpen, { limit: money(limit), pct: pct(account.dailyLossPct, 1) });
  }
  const used = Math.max(0, -todayPnl);
  return fill(d.brief.limitUsed, {
    pnl: signedMoney(todayPnl),
    used: money(used),
    limit: money(limit),
  });
}

/* ------------------------------------------------------------------ AI tahlil */

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

const RULES = `Sen treyding jurnalining ertalabki brifingi uchun kecha chiqqan iqtisodiy ma'lumotlarni izohlaysan.

Uchta qat'iy qoida:
1. TAXMINIY. Iqtisodiy raqam bilan narx o'rtasidagi bog'liqlik doimiy emas — bir xil raqam turli sharoitda turlicha ishlaydi. Shuning uchun "odatda", "ehtimol", "bosim bo'lishi mumkin" kabi iboralar ishlat, qat'iy da'vo qilma.
2. SAVDO SIGNALI YO'Q. "Oltinni sot", "dollarni ol", "long och" kabi jumlalar TAQIQLANGAN. Sen sababni va ehtimoliy ta'sirni tushuntirasan, qaror foydalanuvchida qoladi.
3. FAQAT CHIQQAN MA'LUMOT. Kelajakni bashorat qilma. "Ertaga NFP kuchli chiqadi" degan jumla yo'q.

Yana:
- O'zingdan raqam yoki voqea to'qima. Faqat berilgan ro'yxatdagi ma'lumotdan foydalanish.
- 3–4 jumla, sodda va aniq.
- Foydalanuvchi savdo qiladigan instrumentlarga bog'la.
- Emoji ishlatma. Maqtov va salomlashuv yo'q — to'g'ridan-to'g'ri mazmun.`;

/** Javob tili — interfeys tili bilan bir xil. */
const LANGUAGE_NAMES: Record<string, string> = { uz: 'o‘zbek', ru: 'rus', en: 'ingliz' };

export async function economicAnalysis(
  events: StoredEvent[],
  symbols: string[],
  d: Dict,
  locale: Locale = 'uz',
): Promise<string> {
  if (events.length === 0 || !process.env.ANTHROPIC_API_KEY) return '';

  const lines = events.map((e) => {
    const cmp = compareToForecast(e);
    const verdict =
      cmp === 'higher'
        ? d.brief.cmpHigher
        : cmp === 'lower'
          ? d.brief.cmpLower
          : cmp === 'inline'
            ? d.brief.cmpInline
            : d.brief.cmpUnknown;
    return fill(d.brief.aiEventLine, {
      time: e.time || '—',
      currency: e.currency,
      title: e.title,
      actual: e.actual || '—',
      forecast: e.forecast || '—',
      previous: e.previous || '—',
      verdict,
    });
  });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: `${RULES}\n\nJAVOB TILI: ${LANGUAGE_NAMES[locale] ?? 'o‘zbek'}. Butun javob shu tilda bo'lsin.`,
    messages: [
      {
        role: 'user',
        content: fill(d.brief.aiPrompt, {
          lines: lines.join('\n'),
          symbols: symbols.length ? symbols.join(', ') : d.brief.noSymbols,
        }),
      },
    ],
  });

  const block = response.content.find((c) => c.type === 'text');
  return block && block.type === 'text' ? block.text.trim() : '';
}
