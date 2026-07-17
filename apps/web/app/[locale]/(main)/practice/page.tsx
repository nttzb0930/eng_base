import { PracticeView } from "@/app/views/practice/PracticeView";

type PracticePageProps = {
  searchParams: Promise<{
    level?: string;
    mode?: string;
  }>;
};

export default async function PracticePage({ searchParams }: PracticePageProps) {
  const { level, mode } = await searchParams;

  return <PracticeView level={level} mode={mode} />;
}
