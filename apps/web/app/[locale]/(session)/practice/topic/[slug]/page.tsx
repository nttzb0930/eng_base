import { TopicPracticeView } from "@/app/views/topics/TopicPracticeView";

type TopicPracticePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    mode?: string;
  }>;
};

export default async function TopicPracticePage({
  params,
  searchParams,
}: TopicPracticePageProps) {
  const { slug } = await params;
  const { mode } = await searchParams;

  return <TopicPracticeView slug={slug} mode={mode} />;
}
