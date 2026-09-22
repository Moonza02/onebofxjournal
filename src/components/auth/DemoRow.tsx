import DemoButton from '@/components/landing/DemoButton';
import { getI18n } from '@/lib/i18n/server';

/** Kirish va ro'yxat sahifalarining tagidagi «demo» yo'li.
 *
 *  Uchinchi yo'l shu yerda turishi kerak: yangi odam eshik oldida
 *  turganda uning uchta imkoni bor — kirish, hisob ochish, yoki
 *  hech narsa yozmasdan ichkarini ko'rish. Uchinchisini faqat ochiq
 *  sahifada qoldirsak, to'g'ridan-to'g'ri kirish sahifasiga kelgan
 *  odam uni umuman ko'rmaydi.
 */
export default async function DemoRow() {
  const { d } = await getI18n();

  return (
    <div className="mt-7 border-t border-line2 pt-5">
      <p className="mb-3 text-center text-[12.5px] leading-relaxed text-txt3">{d.demo.ctaNote}</p>
      <DemoButton label={d.demo.ctaButton} busy={d.demo.opening} />
    </div>
  );
}
