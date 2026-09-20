/** Ikonkalar — 24px setka, 1.7px chiziq, currentColor. Maketdagi to'plam. */

const PATHS: Record<string, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  list: <path d="M8.5 6H21M8.5 12H21M8.5 18H21M3.6 6h.02M3.6 12h.02M3.6 18h.02" />,
  cal: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2.4" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  chart: <path d="M4 20V11M9.6 20V4.5M15.2 20v-6.4M20.8 20V8" />,
  book: (
    <>
      <path d="M4.5 4.6A2.6 2.6 0 0 1 7.1 2H20v15.4H7.1a2.6 2.6 0 0 0-2.6 2.6z" />
      <path d="M8.6 6.6h7.4M8.6 10.2h5" />
    </>
  ),
  pen: (
    <>
      <path d="M12.5 20.2H21" />
      <path d="M16.2 3.6a2.16 2.16 0 0 1 3.06 3.06L7.4 18.5 3.3 19.7l1.2-4.1z" />
    </>
  ),
  calc: (
    <>
      <rect x="4.5" y="2.5" width="15" height="19" rx="2.4" />
      <path d="M8.2 6.6h7.6M8.2 11.4h.02M12 11.4h.02M15.8 11.4h.02M8.2 15.1h.02M12 15.1h.02M15.8 15.1h.02M8.2 18.6h3.8" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7.6a2.4 2.4 0 0 1 2.4-2.4H18a2.4 2.4 0 0 1 2.4 2.4v8.8A2.4 2.4 0 0 1 18 18.8H5.4A2.4 2.4 0 0 1 3 16.4z" />
      <path d="M15.4 12h2.6" />
    </>
  ),
  sliders: (
    <path d="M4.6 21v-6.6M4.6 10.2V3M12 21v-8.6M12 8.2V3M19.4 21v-4.6M19.4 12.2V3M1.8 14.4h5.6M9.2 8.2h5.6M16.6 16.4h5.6" />
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.6" />
      <path d="M16 16l4.4 4.4" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8.6a6 6 0 1 0-12 0c0 6-2.4 7.6-2.4 7.6h16.8S18 14.6 18 8.6z" />
      <path d="M13.7 20.2a2 2 0 0 1-3.4 0" />
    </>
  ),
  plus: <path d="M12 5.2v13.6M5.2 12h13.6" />,
  up: <path d="M12 19V5M5.6 11.4L12 5l6.4 6.4" />,
  down: <path d="M12 5v14M18.4 12.6L12 19l-6.4-6.4" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.2V12l3 1.8" />
    </>
  ),
  check: <path d="M4.8 12.6l4.8 4.8L19.2 7" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  img: (
    <>
      <rect x="3" y="4.6" width="18" height="14.8" rx="2.4" />
      <circle cx="8.6" cy="10" r="1.8" />
      <path d="M21 16.2l-5.2-5.2L4.6 22" />
    </>
  ),
  brain: (
    <>
      <path d="M9.5 3.2a3 3 0 0 0-3 3 3 3 0 0 0-1.6 5.5A3 3 0 0 0 6.9 17a3 3 0 0 0 5.1 2.1V4.6a3 3 0 0 0-2.5-1.4z" />
      <path d="M14.5 3.2a3 3 0 0 1 3 3 3 3 0 0 1 1.6 5.5A3 3 0 0 1 17.1 17" />
    </>
  ),
  shield: <path d="M12 2.8l7.6 3v5.4c0 4.6-3.2 8.4-7.6 10-4.4-1.6-7.6-5.4-7.6-10V5.8z" />,
  logout: (
    <>
      <path d="M9.4 21H5.6A2.6 2.6 0 0 1 3 18.4V5.6A2.6 2.6 0 0 1 5.6 3h3.8" />
      <path d="M16 16.4l4.4-4.4L16 7.6M20.4 12H9.4" />
    </>
  ),
  dl: <path d="M12 3.4v12.2M6.8 10.4L12 15.6l5.2-5.2M4 20.2h16" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.4" />
      <path d="M3.6 6.4L12 13l8.4-6.6" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.2" r="4.2" />
      <path d="M4.4 20.6a7.6 7.6 0 0 1 15.2 0" />
    </>
  ),
  chev: <path d="M9.4 5.6L15.8 12l-6.4 6.4" />,
  chevd: <path d="M5.6 9.4L12 15.8l6.4-6.4" />,
  link: (
    <>
      <path d="M10.4 13.6a4 4 0 0 0 5.8.3l2.6-2.6a4 4 0 1 0-5.7-5.7l-1.5 1.5" />
      <path d="M13.6 10.4a4 4 0 0 0-5.8-.3l-2.6 2.6a4 4 0 1 0 5.7 5.7l1.5-1.5" />
    </>
  ),
  trash: (
    <>
      <path d="M4 6.4h16M9.4 6.4V4.2a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4v2.2" />
      <path d="M6.4 6.4l1 13.2a1.6 1.6 0 0 0 1.6 1.5h6a1.6 1.6 0 0 0 1.6-1.5l1-13.2" />
    </>
  ),
  lock: (
    <>
      <rect x="4.6" y="10.4" width="14.8" height="10.6" rx="2.4" />
      <path d="M8.2 10.4V7.2a3.8 3.8 0 0 1 7.6 0v3.2" />
    </>
  ),
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = 18,
  width = 1.7,
  className,
}: {
  name: IconName;
  size?: number;
  width?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
