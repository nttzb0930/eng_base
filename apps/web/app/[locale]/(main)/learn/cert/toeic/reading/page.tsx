import { ToeicReadingListView } from "@/app/views/toeic-reading/ToeicReadingListView";
import { parseToeicReadingScope } from "@/app/features/toeic-reading/toeic-reading-scope";

type ToeicReadingListPageProps = {
  searchParams: Promise<{ scope?: string | string[] }>;
};

export default async function ToeicReadingListPage({
  searchParams,
}: ToeicReadingListPageProps) {
  const query = await searchParams;
  const value = Array.isArray(query.scope) ? query.scope[0] : query.scope;
  return <ToeicReadingListView scope={parseToeicReadingScope(value)} />;
}
