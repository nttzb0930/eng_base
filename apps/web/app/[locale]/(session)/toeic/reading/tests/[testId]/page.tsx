import { ToeicReadingSessionView } from "@/app/views/toeic-reading/ToeicReadingSessionView";
import { ToeicReadingPracticeView } from "@/app/views/toeic-reading/ToeicReadingPracticeView";
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
  const scope = parseToeicReadingScope(value);
  if (scope === "full") {
    return <ToeicReadingSessionView testId={Number(testId)} scope={scope} />;
  }
  return <ToeicReadingPracticeView testId={Number(testId)} part={scope} />;
}
