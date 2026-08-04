import { ToeicListeningResultView } from "@/app/views/toeic-listening/ToeicListeningResultView";

type ToeicListeningResultPageProps = {
  params: Promise<{ attemptId: string }>;
};

export default async function ToeicListeningResultPage({
  params,
}: ToeicListeningResultPageProps) {
  const { attemptId } = await params;
  return <ToeicListeningResultView attemptId={Number(attemptId)} />;
}
