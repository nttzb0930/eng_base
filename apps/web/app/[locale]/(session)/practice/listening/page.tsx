import { ListeningPracticeView } from "@/app/views/practice/ListeningPracticeView";

type ListeningPracticePageProps = {
  searchParams: Promise<{
    level?: string;
    lesson?: string;
  }>;
};

export default async function ListeningPracticePage({
  searchParams,
}: ListeningPracticePageProps) {
  const { level, lesson } = await searchParams;

  return <ListeningPracticeView level={level} lesson={lesson} />;
}
