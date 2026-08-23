import { PrismaClient } from "@prisma/client";

// Next dev-mode hot reload would otherwise open a new pool on every edit.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Prisma stores our structured blobs as JSON strings; these keep that noise in one place. */
export function readJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export const writeJson = (value: unknown): string => JSON.stringify(value);
