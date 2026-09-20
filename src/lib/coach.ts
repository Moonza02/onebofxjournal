import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { db } from './db';
import { evaluateAlerts } from './alerts';
import { money, num, signedMoney } from './format';
import {
  isClosed,
  netPnl,
  pnlOnDay,
  rMultiple,
  recentClosed,
  summarize,
  tradesOnDay,
  type TradeLike,
} from './stats';
import { todayKeyIn } from './tz';
import type { ChatRow } from './coach.types';
import { fill, type Dict } from './i18n';

/** Psixologiya suhbati.
 *
 *  Bu yerdagi asosiy g'oya: javob bo'sh tasalli bo'lmasin. Model
 *  foydalanuvchining o'sha paytdagi haqiqiy holatini — bugungi natija,
 *  limitning qancha qismi ishlatilgani, ketma-ket zararlar, ochiq
 *  savdolar — ko'rib turadi va shu asosda gapiradi.
 *
 *  Nima yo'q: savdo signali, bozor bashorati, tashxis. Bularning har biri
 *  quyidagi qoidalarda alohida taqiqlangan.
 */

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

/** Suhbat tarixidan modelga nechta xabar beriladi. */
export const HISTORY_LIMIT = 20;

export { MESSAGE_MAX, MOODS } from './coach.types';
export type { ChatRole, ChatRow } from './coach.types';

/* ------------------------------------------------------------------ tarix */

export async function getChat(userId: string, take = 60): Promise<ChatRow[]> {
  const rows: ChatRow[] = await db.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: { id: true, role: true, content: true, moodTag: true, createdAt: true },
  });
  return rows.reverse();
}

export async function clearChat(userId: string): Promise<void> {
  await db.chatMessage.deleteMany({ where: { userId } });
}

/* ------------------------------------------------------------------ kontekst */

export type CoachContext = {
  /** Modelga beriladigan matn. */
  text: string;
  /** Interfeysda ko'rsatiladigan qisqa holat. */
  todayPnl: number;
  todayCount: number;
  lossStreakToday: number;
  openCount: number;
  limitUsedPct: number;
};

type AccountLike = {
  name: string;
  startingBalance: number;
  dailyLossPct: number;
  maxDrawdownPct: number;
  riskPerTradePct: number;
};

/** Foydalanuvchining hozirgi holati — faqat o'z ma'lumotidan.
 *  Hech qanday tashqi manba yoki bozor narxi ishlatilmaydi.
 */
export function buildContext(
  account: AccountLike,
  trades: TradeLike[],
  timeZone: string,
  d: Dict,
): CoachContext {
  const summary = summarize(trades, account.startingBalance);
  const todayKey = todayKeyIn(timeZone);
  const today = tradesOnDay(trades, todayKey, timeZone);
  const todayPnl = pnlOnDay(trades, todayKey, timeZone);

  const dayStart = summary.balance - todayPnl;
  const dailyLimit = (dayStart * account.dailyLossPct) / 100;
  const limitUsedPct = dailyLimit > 0 ? (Math.max(0, -todayPnl) / dailyLimit) * 100 : 0;

  // Bugungi ketma-ket zararlar — eskisi emas, aynan shu kunniki.
  const closedToday = today.filter(isClosed).sort((a, b) => +a.closedAt! - +b.closedAt!);
  let lossStreakToday = 0;
  for (let i = closedToday.length - 1; i >= 0; i -= 1) {
    if (rMultiple(closedToday[i]) < -0.05) lossStreakToday += 1;
    else break;
  }

  const openCount = trades.filter((t) => !isClosed(t)).length;

  const alerts = evaluateAlerts({ account, trades, timeZone, d });

  const last = recentClosed(trades, 5).map((t) => {
    const r = rMultiple(t);
    return `  · ${t.symbol} ${t.direction === 'LONG' ? 'long' : 'short'} — ${
      r >= 0 ? '+' : '−'
    }${num(Math.abs(r), 2)}R (${signedMoney(netPnl(t), 0)})${t.ruleCompliant ? '' : d.coach.ctxNotCompliant}`;
  });

  const lines = [
    fill(d.coach.ctxAccount, { name: account.name, balance: money(summary.balance, 0) }),
    fill(d.coach.ctxToday, { n: today.length, pnl: signedMoney(todayPnl) }),
    fill(d.coach.ctxLimit, {
      limit: money(dailyLimit, 0),
      used: money(Math.max(0, -todayPnl), 0),
      pct: num(limitUsedPct, 0),
    }),
    lossStreakToday > 0
      ? fill(d.coach.ctxLossStreak, { n: lossStreakToday })
      : d.coach.ctxNoLossStreak,
    openCount > 0 ? fill(d.coach.ctxOpen, { n: openCount }) : d.coach.ctxNoOpen,
    summary.count >= 10
      ? fill(d.coach.ctxOverall, {
          n: summary.count,
          wr: num(summary.winRate, 0),
          r: `${summary.totalR >= 0 ? '+' : '−'}${num(Math.abs(summary.totalR), 2)}`,
          rc: num(summary.ruleCompliance, 0),
        })
      : fill(d.coach.ctxOverallFew, { n: summary.count }),
    last.length ? `${d.coach.ctxRecent}\n${last.join('\n')}` : d.coach.ctxNoClosed,
    alerts.length
      ? fill(d.coach.ctxAlerts, { list: alerts.map((a) => a.title).join('; ') })
      : d.coach.ctxNoAlerts,
  ];

  return {
    text: lines.join('\n'),
    todayPnl,
    todayCount: today.length,
    lossStreakToday,
    openCount,
    limitUsedPct,
  };
}

/* ------------------------------------------------------------------ qoidalar */

const RULES = `Sen ONEBO FX treyding jurnalidagi suhbatdoshsan. Vazifang — treyderning hozirgi ruhiy holatini tushunish, uni tinchlantirish va o'ziga kelishiga yordam berish.

QAT'IY TAQIQLAR:
1. SAVDO SIGNALI YO'Q. "Oltinni sot", "long och", "bu yerdan kir", "stopni bu yerga qo'y" — bularning hammasi taqiqlangan. Bozor yo'nalishi haqida bashorat ham qilma.
2. TASHXIS YO'Q. "Senda tashvish buzilishi bor", "bu depressiya" deyish mumkin emas. Sen shifokor emassan.
3. RAQAM TO'QIMA. Faqat "HOLAT" bo'limida berilgan raqamlarni ishlat. Berilmagan narsani bilmayman deb ayt.
4. ZARARNI CHIROYLI QILIB KO'RSATMA. "Hechqisi yo'q, ertaga qaytarasan" degan tasalli yolg'on va zararli. Zarar — zarar; gap uni qanday qabul qilishda.

QANDAY GAPIRASAN:
- FOYDALANUVCHI TILIDA javob ber (quyida ko'rsatiladi), sodda va issiq. Emoji yo'q. Rasmiy bo'lma, lekin yengil-elpi ham bo'lma.
- Qisqa: 3–6 jumla. Foydalanuvchi uzun ma'ruza o'qishni istamaydi, u hozir asabiy.
- Avval holatini tan ol, keyin gapir. Darrov maslahat berishga shoshilma.
- Ketma-ket savol berib so'roq qilma — bitta savol yetadi, ba'zan umuman kerak emas.
- HOLAT dagi raqamlarni faqat mavzuga tegishli bo'lsa ishlat. Har javobda statistika o'qib berma.

MUHIM HOLATLAR:
- Qaytarib olish istagi (revenge) sezilsa: bu istak bozordan emas, ichkaridan kelishini ayt. Bloklamaysan, lekin to'g'ridan-to'g'ri aytasan: hozir kirish qaror emas, reaksiya.
- Kunlik limit tugagan yoki ketma-ket zarar bo'lsa: bugun to'xtashni tavsiya qil. Bozor ertaga ham shu yerda.
- Foydadan keyingi ortiqcha ishonch ham xavf — buni ham ayt.
- Qoidaga rioya qilinmagan savdolar haqida gapirganda ayblama; nima uchun shunday bo'lganini tushunishga yordam ber.

XAVFSIZLIK:
Agar foydalanuvchi o'z hayotiga zarar yetkazish, umidsizlik, "hammasi tugadi", oilaviy yoki qarz tufayli chidab bo'lmas holat haqida yozsa — savdo mavzusini butunlay yig'ishtir. Uning og'irligini tan ol, yolg'iz emasligini ayt va bugun ishonadigan tirik odam bilan — yaqini yoki mutaxassis bilan — gaplashishni iltimos qil. Pul yo'qotish odamning qiymatini belgilamaydi. Bu holatda statistika, maslahat va savdo haqida hech narsa yozma.`;

/** Model javobi. API kaliti yo'q bo'lsa `null` — chaqiruvchi tomon buni
 *  xatolik sifatida ko'rsatadi.
 */
/** Javob tili — interfeys tili bilan bir xil bo'lishi kerak. */
const LANGUAGE_NAMES: Record<string, string> = {
  uz: 'o‘zbek',
  ru: 'rus',
  en: 'ingliz',
};

export async function coachReply(
  history: ChatRow[],
  message: string,
  context: CoachContext,
  userName: string,
  locale = 'uz',
): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messages = history.slice(-HISTORY_LIMIT).map((m) => ({
    role: m.role === 'USER' ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));

  messages.push({ role: 'user', content: message });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: `${RULES}\n\nJAVOB TILI: ${LANGUAGE_NAMES[locale] ?? 'o‘zbek'}. Butun javob shu tilda bo'lsin.\n\nFoydalanuvchi ismi: ${userName}.\n\nHOLAT (hozirgi haqiqiy ma'lumot):\n${context.text}`,
    messages,
  });

  const block = response.content.find((c) => c.type === 'text');
  const text = block && block.type === 'text' ? block.text.trim() : '';
  return text || null;
}

/* ------------------------------------------------------------------ AI'siz yordam */

export type Grounding = { title: string; steps: string[] };

/** AI ishlamasa ham foyda beradigan qism — oddiy, tekshirilgan usullar.
 *  Holatga qarab tanlanadi.
 */
export function grounding(context: CoachContext, d: Dict): Grounding {
  const c = d.coach;

  if (context.lossStreakToday >= 2 || context.limitUsedPct >= 80) {
    return {
      title: c.groundStreakTitle,
      steps: [c.groundStreak1, c.groundStreak2, c.groundStreak3, c.groundStreak4],
    };
  }

  if (context.openCount > 0) {
    return {
      title: c.groundOpenTitle,
      steps: [c.groundOpen1, c.groundOpen2, c.groundOpen3, c.groundOpen4],
    };
  }

  return {
    title: c.groundPreTitle,
    steps: [c.groundPre1, c.groundPre2, c.groundPre3, c.groundPre4],
  };
}
