/** Vaqt mintaqasi.
 *
 *  Savdo jurnalida kun chegarasi muhim: kunlik limit, kalendar katagi,
 *  sessiya va "bugun" tushunchasi — hammasi treyderning o'z mintaqasida
 *  hisoblanishi kerak, server qayerda turishidan qat'i nazar.
 *
 *  Sanalar bazada UTC da saqlanadi. Bu yerdagi funksiyalar ularni
 *  foydalanuvchi mintaqasidagi kalendar qismlariga aylantiradi.
 */

export const DEFAULT_TIMEZONE = 'Asia/Tashkent';

/** Ko'p ishlatiladigan mintaqalar — sozlamalardagi ro'yxat uchun. */
export const TIMEZONES = [
  'Asia/Tashkent',
  'Asia/Almaty',
  'Asia/Dubai',
  'Europe/Istanbul',
  'Europe/Moscow',
  'Europe/London',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC',
];

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export type LocalParts = {
  year: number;
  month: number; // 0–11
  day: number;
  hour: number;
  minute: number;
  /** 0 = dushanba … 6 = yakshanba */
  weekday: number;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatterCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
    });
    formatterCache.set(timeZone, f);
  }
  return f;
}

/** UTC vaqtni berilgan mintaqadagi kalendar qismlariga ajratadi. */
export function partsIn(date: Date, timeZone: string): LocalParts {
  const map = new Map(
    formatter(timeZone)
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );

  return {
    year: Number(map.get('year')),
    month: Number(map.get('month')) - 1,
    day: Number(map.get('day')),
    // 24:00 ba'zi muhitlarda yarim tun uchun qaytadi.
    hour: Number(map.get('hour')) % 24,
    minute: Number(map.get('minute')),
    weekday: WEEKDAY_INDEX[map.get('weekday') ?? 'Mon'] ?? 0,
  };
}

/** "2026-09-19" ko'rinishidagi kun kaliti, foydalanuvchi mintaqasida. */
export function dayKeyIn(date: Date, timeZone: string): string {
  const p = partsIn(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month + 1)}-${pad(p.day)}`;
}

/** Ikki sana foydalanuvchi mintaqasida bir kunga tushadimi. */
export function sameDayIn(a: Date, b: Date, timeZone: string): boolean {
  return dayKeyIn(a, timeZone) === dayKeyIn(b, timeZone);
}

export function hourIn(date: Date, timeZone: string): number {
  return partsIn(date, timeZone).hour;
}

export function weekdayIn(date: Date, timeZone: string): number {
  return partsIn(date, timeZone).weekday;
}

/** Bugungi kun kaliti. */
export function todayKeyIn(timeZone: string): string {
  return dayKeyIn(new Date(), timeZone);
}

/** Berilgan mintaqadagi kalendar vaqtiga mos UTC lahza.
 *  Mintaqa siljishini hisobga olib ikki bosqichda aniqlanadi.
 */
export function zonedTimeToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
): Date {
  let guess = Date.UTC(year, month, day, hour, minute);

  for (let i = 0; i < 2; i += 1) {
    const p = partsIn(new Date(guess), timeZone);
    const actual = Date.UTC(p.year, p.month, p.day, p.hour, p.minute);
    const wanted = Date.UTC(year, month, day, hour, minute);
    const drift = wanted - actual;
    if (drift === 0) break;
    guess += drift;
  }

  return new Date(guess);
}

/** Kun boshlanishi va tugashi — UTC lahzalar sifatida. */
export function dayRangeIn(key: string, timeZone: string): { from: Date; to: Date } {
  const [year, month, day] = key.split('-').map(Number);
  const from = zonedTimeToUtc(timeZone, year, month - 1, day);
  const to = zonedTimeToUtc(timeZone, year, month - 1, day + 1);
  return { from, to };
}

/** Oy boshlanishi va tugashi — UTC lahzalar sifatida. */
export function monthRangeIn(
  year: number,
  month: number,
  timeZone: string,
): { from: Date; to: Date } {
  return {
    from: zonedTimeToUtc(timeZone, year, month, 1),
    to: zonedTimeToUtc(timeZone, year, month + 1, 1),
  };
}

/** Savdo vaqtidan sessiyani taxmin qiladi — foydalanuvchi mintaqasida emas,
 *  bozor vaqtida (UTC), chunki sessiyalar bozorga bog'liq, treyderga emas.
 */
export function sessionFor(date: Date): string {
  const utcHour = date.getUTCHours();
  if (utcHour >= 0 && utcHour < 7) return 'Osiyo';
  if (utcHour >= 7 && utcHour < 12) return 'London';
  if (utcHour >= 12 && utcHour < 16) return 'Overlap';
  return 'Nyu-York';
}

/** Hafta oralig'i — dushanbadan yakshanba oxirigacha, foydalanuvchi mintaqasida.
 *  `offset` = 0 joriy hafta, 1 — o'tgan hafta va hokazo.
 */
export function weekRangeIn(
  offset: number,
  timeZone: string,
  now = new Date(),
): { from: Date; to: Date } {
  const p = partsIn(now, timeZone);
  const mondayDay = p.day - p.weekday - offset * 7;
  return {
    from: zonedTimeToUtc(timeZone, p.year, p.month, mondayDay),
    to: zonedTimeToUtc(timeZone, p.year, p.month, mondayDay + 7),
  };
}
