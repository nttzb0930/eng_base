import { FillBlankPracticeView } from "@/app/views/practice/FillBlankPracticeView";

type FillBlankPracticePageProps = {
  searchParams: Promise<{
    level?: string;
    lesson?: string;
  }>;
};

export default async function FillBlankPracticePage({
  searchParams,
}: FillBlankPracticePageProps) {
  const { level, lesson } = await searchParams;

  return <FillBlankPracticeView level={level} lesson={lesson} />;
}
