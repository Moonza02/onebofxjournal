import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

/** Tranzaksiya ichidagi klient.
 *
 *  `db.$transaction(async (tx) => ...)` ga beriladigan `tx` — to'liq
 *  `PrismaClient` emas: undan ulanishni boshqaradigan va ichma-ich
 *  tranzaksiya ochadigan metodlar olib tashlangan. Turini shu yerda
 *  bir marta e'lon qilamiz, har joyda takrorlamaymiz.
 */
export type Tx = Omit<
  typeof db,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
>;
