/** Ogohlantirish dvigateli.
 *
 *  Tizim hech qachon savdoni bloklamaydi. U holatni ko'rsatadi va odam
 *  tilida tavsiya beradi — qaror har doim foydalanuvchida.
 *
 *  Matnlar ataylab do'stona: buyruq emas, maslahat. Bloklash o'rniga
 *  har bir ogohlantirish yozib boriladi, va oy oxirida "e'tibor bermagan
 *  savdolar qanday tugadi" degan raqam ko'rsatiladi — bu bloklashdan
 *  kuchliroq ishlaydi, chunki raqam o'zi gapiradi.
 */
import { correlationGroups, describeGroup, relatedSymbols, type Position } from './correlation';
import { money, num, pct, signedMoney } from './format';
import {
  isClosed,
  netPnl,
  pnlOnDay,
  rMultiple,
  recentClosed,
  riskAmount,
  summarize,
  tradesOnDay,
  winRateAfterLoss,
  type TradeLike,
} from './stats';
import { todayKeyIn } from './tz';
import { fill, type Dict } from './i18n';

export type AlertKind =
  | 'DAILY_LIMIT_NEAR'
  | 'DAILY_LIMIT_HIT'
  | 'LOSS_STREAK'
  | 'REVENGE_TRADE'
  | 'DRAWDOWN_NEAR'
  | 'CORRELATION'
  | 'RISK_TOO_BIG';

export type Severity = 'info' | 'warn' | 'serious';

export type Alert = {
  kind: AlertKind;
  severity: Severity;
  title: string;
  message: string;
  /** Qo'shimcha tavsiya — asosiy xabardan keyin, ixtiyoriy. */
  advice?: string;
  context: string;
};

export type AlertInput = {
  /** Matnlar foydalanuvchi tilida — lug'at tashqaridan beriladi. */
  d: Dict;
  account: {
    dailyLossPct: number;
    maxDrawdownPct: number;
    riskPerTradePct: number;
    startingBalance: number;
  };
  trades: TradeLike[];
  /** Foydalanuvchi mintaqasi — kun chegarasi shunda aniqlanadi. */
  timeZone: string;
  /** Kiritilayotgan savdo — bor bo'lsa, revenge va risk tekshiriladi. */
  draft?: {
    openedAt: Date;
    risk: number;
    volume: number;
  } | null;
};

const LOSS = -0.05;

export function evaluateAlerts({ account, trades, timeZone, draft, d }: AlertInput): Alert[] {
  const a = d.alerts;
  const alerts: Alert[] = [];
  const summary = summarize(trades, account.startingBalance);

  const todayKey = todayKeyIn(timeZone);
  const todayPnl = pnlOnDay(trades, todayKey, timeZone);
  const dayStart = summary.balance - todayPnl;
  const dailyLimit = (dayStart * account.dailyLossPct) / 100;
  const dailyUsed = Math.max(0, -todayPnl);
  const dailyRatio = dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0;

  // 1–2. Kunlik limit.
  if (dailyRatio >= 100) {
    alerts.push({
      kind: 'DAILY_LIMIT_HIT',
      severity: 'serious',
      title: a.dailyHitTitle,
      message: a.dailyHitMessage,
      advice: a.dailyHitAdvice,
      context: fill(a.dailyContext, {
        pnl: signedMoney(todayPnl),
        limit: money(dailyLimit),
      }),
    });
  } else if (dailyRatio >= 70) {
    alerts.push({
      kind: 'DAILY_LIMIT_NEAR',
      severity: 'warn',
      title: a.dailyNearTitle,
      message: fill(a.dailyNearMessage, { pct: num(dailyRatio, 0) }),
      advice: a.dailyNearAdvice,
      context: fill(a.dailyContext, {
        pnl: signedMoney(todayPnl),
        limit: money(dailyLimit),
      }),
    });
  }

  // 3. Ketma-ket ikkita stop — faqat bugungi savdolar orasida.
  //    Aks holda haftalar oldingi ikki zarar har kuni ogohlantirib turardi.
  const recent = recentClosed(tradesOnDay(trades, todayKey, timeZone), 2);
  if (recent.length === 2 && recent.every((t) => rMultiple(t) < LOSS)) {
    const after = winRateAfterLoss(trades);
    const statLine =
      after.count >= 10
        ? fill(a.lossStreakStat, {
            after: num(after.winRate, 0),
            overall: num(summary.winRate, 0),
          })
        : a.lossStreakPlain;

    alerts.push({
      kind: 'LOSS_STREAK',
      severity: 'warn',
      title: a.lossStreakTitle,
      message: statLine,
      advice: a.lossStreakAdvice,
      context: fill(a.lossStreakContext, {
        list: recent.map((t) => `${t.symbol} ${num(rMultiple(t), 2)}R`).join(', '),
      }),
    });
  }

  // 4. Umumiy drawdown.
  const ddRatio =
    account.maxDrawdownPct > 0 ? (summary.maxDrawdownPct / account.maxDrawdownPct) * 100 : 0;
  if (ddRatio >= 80) {
    alerts.push({
      kind: 'DRAWDOWN_NEAR',
      severity: 'serious',
      title: a.drawdownTitle,
      message: fill(a.drawdownMessage, { pct: num(ddRatio, 0) }),
      advice: a.drawdownAdvice,
      context: fill(a.drawdownContext, {
        used: pct(summary.maxDrawdownPct),
        limit: pct(account.maxDrawdownPct, 0),
      }),
    });
  }

  // 5. Korrelyatsiya — ochiq pozitsiyalar.
  const open: Position[] = trades
    .filter((t) => !isClosed(t))
    .map((t) => ({ id: t.id, symbol: t.symbol, direction: t.direction, risk: riskAmount(t) }));

  for (const group of correlationGroups(open).slice(0, 2)) {
    const related = relatedSymbols(group.currency, group.side);
    alerts.push({
      kind: 'CORRELATION',
      severity: 'warn',
      title: fill(a.correlationTitle, { n: group.positions.length }),
      message: fill(a.correlationMessage, {
        describe: describeGroup(group, d),
        risk: money(group.totalRisk),
      }),
      advice: related.length
        ? fill(a.correlationAdvice, { list: related.join(', ') })
        : undefined,
      context: fill(a.correlationContext, {
        currency: group.currency,
        side: group.side,
        n: group.positions.length,
      }),
    });
  }

  if (!draft) return alerts;

  // 6. Savdo riski chegaradan katta.
  const riskPct = summary.balance > 0 ? (draft.risk / summary.balance) * 100 : 0;
  if (riskPct > account.riskPerTradePct * 1.05) {
    alerts.push({
      kind: 'RISK_TOO_BIG',
      severity: 'warn',
      title: a.riskBigTitle,
      message: fill(a.riskBigMessage, {
        risk: pct(riskPct, 2),
        limit: pct(account.riskPerTradePct, 1),
      }),
      context: fill(a.riskBigContext, {
        amount: money(draft.risk),
        balance: money(summary.balance),
      }),
    });
  }

  // 7. Revenge-trade: zarardan keyin 15 daqiqa ichida, sezilarli katta hajm.
  const lastLoss = recentClosed(trades, 5).find((t) => rMultiple(t) < LOSS);
  if (lastLoss && lastLoss.closedAt) {
    const minutes = (draft.openedAt.getTime() - lastLoss.closedAt.getTime()) / 60000;
    const bigger = lastLoss.volume > 0 && draft.volume >= lastLoss.volume * 1.5;
    if (minutes >= 0 && minutes <= 15 && bigger) {
      alerts.push({
        kind: 'REVENGE_TRADE',
        severity: 'serious',
        title: a.revengeTitle,
        message: a.revengeMessage,
        advice: a.revengeAdvice,
        context: fill(a.revengeContext, {
          minutes: num(minutes, 0),
          before: num(lastLoss.volume, 2),
          after: num(draft.volume, 2),
        }),
      });
    }
  }

  return alerts;
}

/** Oy yakuni: ogohlantirishlar qanchalik ishladi. */
export type AlertOutcome = {
  total: number;
  stopped: number;
  ignored: number;
  ignoredLosses: number;
  ignoredPnl: number;
};

export function summarizeAlertOutcomes(
  alerts: { action: string | null; tradeId: string | null }[],
  trades: TradeLike[],
): AlertOutcome {
  const byId = new Map(trades.map((t) => [t.id, t]));
  let stopped = 0;
  let ignored = 0;
  let ignoredLosses = 0;
  let ignoredPnl = 0;

  for (const alert of alerts) {
    if (alert.action === 'STOPPED') {
      stopped += 1;
      continue;
    }
    if (alert.action !== 'IGNORED' || !alert.tradeId) continue;

    ignored += 1;
    const trade = byId.get(alert.tradeId);
    if (!trade || !isClosed(trade)) continue;

    const pnl = netPnl(trade);
    ignoredPnl += pnl;
    if (rMultiple(trade) < LOSS) ignoredLosses += 1;
  }

  return { total: alerts.length, stopped, ignored, ignoredLosses, ignoredPnl };
}
