import bcrypt from "bcryptjs";

import { readProductionAdminConfig } from "./production-admin-bootstrap-config";
import prisma from "./support/script-prisma";

async function main() {
  const config = readProductionAdminConfig();
  const existing = await prisma.users.findFirst({
    where: {
      OR: [{ email: config.email }, { username: config.username }],
    },
    select: { email: true, username: true, role: true },
  });

  if (existing) {
    throw new Error(
      `Admin bootstrap refused: email or username already exists (${existing.email}/${existing.username})`,
    );
  }

  const password = await bcrypt.hash(config.password, 12);
  await prisma.users.create({
    data: {
      email: config.email,
      username: config.username,
      full_name: config.fullName,
      password,
      role: "ADMIN",
      email_verified_at: new Date(),
    },
  });

  console.log(JSON.stringify({ created: true, email: config.email, username: config.username, role: "ADMIN" }));
}

void main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
