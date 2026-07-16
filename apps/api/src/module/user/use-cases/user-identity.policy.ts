import { ConflictException } from "@nestjs/common";

import type { PrismaService } from "../../../database/prisma/prisma.service";

export async function assertUserIdentityAvailable(
  prisma: PrismaService,
  username?: string,
  email?: string,
  excludedId?: string
) {
  const identities = [
    ...(username === undefined ? [] : [{ username: username.trim() }]),
    ...(email === undefined ? [] : [{ email: email.trim().toLowerCase() }]),
  ];
  const existing = await prisma.users.findFirst({
    where: {
      ...(excludedId === undefined ? {} : { id: { not: excludedId } }),
      OR: identities,
    },
  });
  if (existing) {
    throw new ConflictException("Username or email already exists");
  }
}
