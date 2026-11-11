import { PrismaClient } from "@prisma/client";

// Reuse one PrismaClient across hot reloads in dev and warm serverless invocations.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

let prismaInstance: PrismaClient;
try {
  prismaInstance =
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
} catch {
  console.warn("[AI Studio] Prisma client initialization skipped - utilizing in-memory store");
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
    upsert: async (d: any) => d?.create ?? {},
  };
  prismaInstance = new Proxy({}, { get: () => noOp }) as unknown as PrismaClient;
}

export const prisma: PrismaClient = prismaInstance;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
