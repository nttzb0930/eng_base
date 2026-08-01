import { parseToeicListeningScope } from "@/app/features/toeic-listening/toeic-listening-scope";
import { ToeicListeningListView } from "@/app/views/toeic-listening/ToeicListeningListView";

type ToeicListeningListPageProps = {
  searchParams: Promise<{ scope?: string | string[] }>;
};

export default async function ToeicListeningListPage({
  searchParams,
}: ToeicListeningListPageProps) {
  const query = await searchParams;
  const value = Array.isArray(query.scope) ? query.scope[0] : query.scope;
  return <ToeicListeningListView scope={parseToeicListeningScope(value)} />;
}
