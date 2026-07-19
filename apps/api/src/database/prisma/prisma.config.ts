import { PrismaPg } from "@prisma/adapter-pg";
import { resolveDatabaseUrl } from "../../config/database-url";

export function createPrismaAdapter() {
  return new PrismaPg({ connectionString: resolveDatabaseUrl(process.env) });
}
