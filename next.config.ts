import type { NextConfig } from 'next';

/** Xavfsizlik header'lari.
 *  CSP ataylab qattiq emas: Next inline skript ishlatadi, shuning uchun
 *  'unsafe-inline' qoldirilgan. Google Fonts va o'z domenidan boshqa
 *  hech qayerdan resurs yuklanmaydi.
 */
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Docker obrazi uchun: Next kerakli fayllarni `.next/standalone`
   *  ichiga yig'adi, shunda obrazga butun `node_modules` ko'chirilmaydi.
   */
  output: 'standalone',
  /** Lint alohida buyruq bilan yuriladi (`npm run lint`) va CI da
   *  tekshiriladi — yig'ishni sekinlashtirmasligi uchun shu yerda o'chiq.
   */
  eslint: { ignoreDuringBuilds: true },
  poweredByHeader: false,
  /** pdfkit shrift fayllarini o'z papkasidan o'qiydi — bundle ichiga
   *  olinsa ular topilmay qoladi. Shuning uchun serverda tashqi paket
   *  sifatida qoldiriladi.
   */
  serverExternalPackages: ['pdfkit', 'nodemailer'],
  experimental: {
    serverActions: {
      // Skrinshotlar server action orqali yuboriladi — standart 1 MB yetmaydi.
      bodySizeLimit: '10mb',
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
