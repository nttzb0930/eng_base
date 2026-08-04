import { ReadingSessionView } from "@/app/views/reading/ReadingSessionView";

type ReadingSessionPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ReadingSessionPage({
  params,
}: ReadingSessionPageProps) {
  const { slug } = await params;
  return <ReadingSessionView slug={decodeURIComponent(slug)} />;
}
