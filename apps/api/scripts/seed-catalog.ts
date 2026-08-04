import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "../src/database/prisma/prisma.config.js";

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main() {
  const course = await prisma.courses.upsert({
    where: { code: "toeic-600" },
    create: {
      code: "toeic-600",
      title: "TOEIC 600+",
      image_src: "/mascot.svg",
    },
    update: {
      title: "TOEIC 600+",
      image_src: "/mascot.svg",
    },
  });

  console.log(JSON.stringify({ course: { id: course.id, code: course.code } }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
