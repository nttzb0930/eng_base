import { ToeicReadingResultView } from "@/app/views/toeic-reading/ToeicReadingResultView";

type ToeicReadingResultPageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function ToeicReadingResultPage({
  params,
}: ToeicReadingResultPageProps) {
  const { attemptId } = await params;
  return <ToeicReadingResultView attemptId={Number(attemptId)} />;
}
