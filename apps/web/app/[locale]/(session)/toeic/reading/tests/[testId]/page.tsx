import { ToeicReadingSessionView } from "@/app/views/toeic-reading/ToeicReadingSessionView";
import { parseToeicReadingScope } from "@/app/features/toeic-reading/toeic-reading-scope";

type ToeicReadingSessionPageProps = {
  params: Promise<{ testId: string }>;
  searchParams: Promise<{ scope?: string | string[] }>;
};

export default async function ToeicReadingSessionPage({
  params,
  searchParams,
}: ToeicReadingSessionPageProps) {
  const { testId } = await params;
  const query = await searchParams;
  const value = Array.isArray(query.scope) ? query.scope[0] : query.scope;
  return (
    <ToeicReadingSessionView
      testId={Number(testId)}
      scope={parseToeicReadingScope(value)}
    />
  );
}
