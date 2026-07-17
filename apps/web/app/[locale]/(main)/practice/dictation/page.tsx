import { DictationPracticeView } from "@/app/views/practice/DictationPracticeView";

type DictationPracticePageProps = {
  searchParams: Promise<{
    level?: string;
    lesson?: string;
  }>;
};

export default async function DictationPracticePage({
  searchParams,
}: DictationPracticePageProps) {
  const { level, lesson } = await searchParams;

  return <DictationPracticeView level={level} lesson={lesson} />;
}
