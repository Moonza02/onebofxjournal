# ONEBO FX — ishlab chiqarish uchun obraz.
#
# Uch bosqich: paketlar → yig'ish → ishga tushirish. Oxirgi obrazga
# faqat kerakli narsa tushadi, shuning uchun u kichik bo'ladi.

# ------------------------------------------------------------------ paketlar
FROM node:22-alpine AS deps

# Prisma Alpine da OpenSSL ni talab qiladi.
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# -------------------------------------------------------------------- yig'ish
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma klienti sxemadan yaratiladi.
RUN npx prisma generate

# Yig'ish paytida baza kerak emas, lekin Next sozlamalarni o'qiydi.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --------------------------------------------------------------------- ishga
FROM node:22-alpine AS runner

RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Root ostida ishlamaydi.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# `output: standalone` kerakli fayllarni o'zi yig'ib beradi.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Bu ikkitasi standalone ichiga tushmaydi: `public` da PDF uchun shriftlar,
# `prisma` da esa sxema — u baza jadvallarini yangilashda kerak.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Prisma klienti va dvigateli. Next faqat o'zi ko'rgan fayllarni
# standalone ichiga oladi — `.prisma/client` esa to'liq kerak, shuning
# uchun u aniq ko'chiriladi.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI — jadvallarni sxemaga moslash uchun. `npx` ishlatilmaydi:
# obrazda `node_modules/.bin` yo'q va npx paketni internetdan tortib
# olishga urinardi. Shuning uchun chaqiruv to'g'ridan-to'g'ri.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

# Skrinshotlar shu yerga tushadi (S3 sozlanmagan bo'lsa).
# `VOLUME` e'lon qilinmaydi: Railway va shunga o'xshash platformalar
# diskni o'zi ulaydi, Dockerfile'dagi e'lon esa ularga xalaqit beradi.
# Docker Compose'da disk `docker-compose.yml` da ko'rsatilgan.
RUN mkdir -p /app/uploads && chown nextjs:nodejs /app/uploads
ENV UPLOAD_DIR=/app/uploads

USER nextjs

EXPOSE 3000

# `HEALTHCHECK` ham yo'q: bulutli platformalar sog'liqni tashqaridan
# o'zi tekshiradi va `/api/health` manzili shu uchun turibdi.

CMD ["node", "server.js"]
