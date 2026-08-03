import { ToeicWritingSessionView } from "@/app/views/toeic-writing/ToeicWritingSessionView";

type ToeicWritingPartTwoPageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function ToeicWritingPartTwoPage({
  params,
}: ToeicWritingPartTwoPageProps) {
  const { taskId } = await params;
  return <ToeicWritingSessionView taskId={Number(taskId)} expectedPart={2} />;
}
