import { parseToeicListeningScope } from "@/app/features/toeic-listening/toeic-listening-scope";
import { ToeicListeningSessionView } from "@/app/views/toeic-listening/ToeicListeningSessionView";

type ToeicListeningSessionPageProps = {
  params: Promise<{ testId: string }>;
  searchParams: Promise<{ scope?: string | string[] }>;
};

export default async function ToeicListeningSessionPage({
  params,
  searchParams,
}: ToeicListeningSessionPageProps) {
  const { testId } = await params;
  const query = await searchParams;
  const value = Array.isArray(query.scope) ? query.scope[0] : query.scope;
  return (
    <ToeicListeningSessionView
      testId={Number(testId)}
      scope={parseToeicListeningScope(value)}
    />
  );
}
