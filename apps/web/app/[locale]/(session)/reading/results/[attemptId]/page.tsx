import { ReadingResultView } from "@/app/views/reading/ReadingResultView";

type ReadingResultPageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function ReadingResultPage({
  params,
}: ReadingResultPageProps) {
  const { attemptId } = await params;
  return <ReadingResultView attemptId={Number(attemptId)} />;
}
