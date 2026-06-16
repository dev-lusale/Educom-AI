import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Fallback: if DATABASE_URL env var is placeholder text, use the real URL directly
const dbUrl = process.env.DATABASE_URL?.includes("USER:PASSWORD")
  ? "postgresql://postgres.fjjpcbmtmrgiqnwgyfow:Bmw202320%21%40@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?sslmode=require"
  : process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
