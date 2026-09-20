/** Sahifa yuklanayotganda skelet — bo'sh ekran o'rniga. */
export default function Loading() {
  return (
    <div className="flex grow flex-col gap-[18px] p-5 sm:p-[22px] sm:px-[26px]">
      <div className="h-[66px] animate-pulse rounded-[14px] bg-card" />

      <div className="flex flex-wrap gap-3.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[104px] min-w-[180px] grow basis-0 animate-pulse rounded-[13px] bg-card" />
        ))}
      </div>

      <div className="h-[300px] animate-pulse rounded-[14px] bg-card" />

      <div className="flex flex-col gap-3.5 xl:flex-row">
        <div className="h-[280px] grow animate-pulse rounded-[14px] bg-card" />
        <div className="h-[280px] w-full shrink-0 animate-pulse rounded-[14px] bg-card xl:w-[358px]" />
      </div>
    </div>
  );
}
