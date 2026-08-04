import prisma from "../support/script-prisma.js";

async function main() {
  const [course, writingSets, writingTasks] = await Promise.all([
    prisma.courses.findUnique({
      where: { code: "toeic-600" },
      select: { id: true, code: true },
    }),
    prisma.toeic_writing_sets.count(),
    prisma.toeic_writing_tasks.count(),
  ]);

  console.log(
    JSON.stringify(
      {
        course,
        writingSets,
        writingTasks,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
