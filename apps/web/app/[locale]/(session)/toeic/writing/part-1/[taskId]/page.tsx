import { ToeicWritingSessionView } from "@/app/views/toeic-writing/ToeicWritingSessionView";

type ToeicWritingPartOnePageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function ToeicWritingPartOnePage({
  params,
}: ToeicWritingPartOnePageProps) {
  const { taskId } = await params;
  return <ToeicWritingSessionView taskId={Number(taskId)} expectedPart={1} />;
}
