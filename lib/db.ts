// Prisma client singleton for agenticOS
// Neon PostgreSQL with connection pooling via @prisma/adapter-pg

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  
  // During build phase (no env vars), return a placeholder
  // The actual client will be created at runtime
  if (!connectionString) {
    console.warn("[db] DATABASE_URL not set - using placeholder client (build phase?)");
    const adapter = new PrismaPg("postgresql://placeholder:placeholder@placeholder/placeholder");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (PrismaClient as any)({ adapter });
  }

  const adapter = new PrismaPg(connectionString);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (PrismaClient as any)({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
