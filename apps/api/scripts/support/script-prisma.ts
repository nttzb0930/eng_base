import { PrismaClient } from "@prisma/client";

import { createPrismaAdapter } from "../../src/database/prisma/prisma.config";

const globalForPrisma = globalThis as unknown as {
  scriptPrisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

const PRISMA_SCHEMA_VERSION = "2026-07-31-toeic-reading-content";

const prisma =
  globalForPrisma.scriptPrisma &&
  globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION
    ? globalForPrisma.scriptPrisma
    : new PrismaClient({ adapter: createPrismaAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.scriptPrisma = prisma;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}

export default prisma;
