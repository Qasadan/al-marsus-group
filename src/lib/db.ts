import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Recycle a stale cached instance on module re-evaluation (dev HMR). If the
// cached client opened its SQLite connection while the database file was
// momentarily read-only, every write through it fails forever — a fresh
// PrismaClient opens a fresh connection with the current permissions.
if (globalForPrisma.prisma) {
  try {
    void globalForPrisma.prisma.$disconnect()
  } catch {
    // ignore — best-effort cleanup
  }
  globalForPrisma.prisma = undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
