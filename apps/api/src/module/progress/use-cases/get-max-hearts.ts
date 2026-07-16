import type { PrismaService } from "../../../database/prisma/prisma.service";

export async function getMaxHearts(prisma: PrismaService): Promise<number> {
  const setting = await prisma.system_settings.findUnique({
    where: { key: "MAX_HEARTS" },
  });
  const parsed = Number.parseInt(setting?.value ?? "", 10);
  return Number.isNaN(parsed) ? 5 : parsed;
}
