import { parseToeicListeningScope } from "@/app/features/toeic-listening/toeic-listening-scope";
import { ToeicListeningListView } from "@/app/views/toeic-listening/ToeicListeningListView";
import { ToeicDictationListView } from "@/app/views/toeic-listening/ToeicDictationListView";

type ToeicListeningListPageProps = {
  searchParams: Promise<{ mode?: string | string[]; scope?: string | string[] }>;
};

export default async function ToeicListeningListPage({
  searchParams,
}: ToeicListeningListPageProps) {
  const query = await searchParams;
  const mode = Array.isArray(query.mode) ? query.mode[0] : query.mode;
  if (mode === "dictation") return <ToeicDictationListView />;
  const value = Array.isArray(query.scope) ? query.scope[0] : query.scope;
  return <ToeicListeningListView scope={parseToeicListeningScope(value)} />;
}
