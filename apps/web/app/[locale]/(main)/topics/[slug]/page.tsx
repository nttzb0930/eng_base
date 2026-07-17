import { TopicDetailView } from "@/app/views/topics/TopicDetailView";

type TopicDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    level?: string;
  }>;
};

export default async function TopicDetailPage({
  params,
  searchParams,
}: TopicDetailPageProps) {
  const { slug } = await params;
  const { level } = await searchParams;

  return <TopicDetailView slug={slug} level={level} />;
}
