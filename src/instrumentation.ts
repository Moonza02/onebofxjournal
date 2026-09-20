/** Server xatolarini log'ga chiqarish.
 *
 *  Ishlab chiqarish rejimida Next server komponentidagi xatoning
 *  matnini yashiradi — brauzerga ham, log'ga ham faqat `digest`
 *  tushadi. Bu to'g'ri qaror (xato matnida maxfiy narsa bo'lishi
 *  mumkin), lekin serverning **o'z** log'ida matn ko'rinishi kerak:
 *  aks holda nosozlikni faqat taxmin bilan qidirasan.
 *
 *  `onRequestError` aynan shuning uchun: Next uni har bir server
 *  xatosida chaqiradi va biz matnni Railway log'iga yozamiz.
 */
export function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const where = `${request?.method ?? '?'} ${request?.path ?? '?'}`;

  console.error(`[server-error] ${where} — ${err.name}: ${err.message}`);
  if (err.stack) console.error(err.stack);

  const cause = (err as { cause?: unknown }).cause;
  if (cause) console.error('[server-error] sabab:', cause);
}
