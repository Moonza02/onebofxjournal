import Image from 'next/image';
import { Icon, type IconName } from '@/components/ui/icons';
import { getDict } from '@/lib/i18n/server';

export default async function AuthShell({ children }: { children: React.ReactNode }) {
  const d = await getDict();

  const features: { icon: IconName; title: string; sub: string }[] = [
    { icon: 'shield', title: d.auth.feature1Title, sub: d.auth.feature1Sub },
    { icon: 'chart', title: d.auth.feature2Title, sub: d.auth.feature2Sub },
    { icon: 'calc', title: d.auth.feature3Title, sub: d.auth.feature3Sub },
  ];

  return (
    <div className="flex min-h-screen bg-bg">
      <div className="hidden w-[760px] shrink-0 flex-col border-r border-line2 bg-panel px-[68px] py-[62px] xl:flex">
        <Image
          src="/logo-onebofx.png"
          alt="ONEBO FX"
          width={168}
          height={47}
          priority
          className="h-[47px] w-[168px] object-contain"
        />

        <h2 className="mt-[54px] max-w-[540px] font-display text-[46px] font-semibold leading-[1.12] tracking-[-0.025em] text-txt">
          {d.auth.heroTitle} <span className="text-blue">{d.auth.heroAccent}</span>
          {d.auth.heroTitleEnd}
        </h2>

        <p className="mt-5 max-w-[470px] text-[15px] leading-relaxed text-txt2">
          {d.auth.heroSub}
        </p>

        <div className="mt-11 flex flex-col gap-5">
          {features.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-blue-soft text-blue">
                <Icon name={f.icon} size={17} />
              </span>
              <div>
                <div className="text-[13.5px] font-bold text-txt">{f.title}</div>
                <div className="mt-[3px] text-xs leading-relaxed text-txt3">{f.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 grow items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[380px]">{children}</div>
      </div>
    </div>
  );
}
