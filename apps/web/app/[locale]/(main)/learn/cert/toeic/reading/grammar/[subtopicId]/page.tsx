import { ToeicGrammarLessonView } from "@/app/views/toeic-grammar/ToeicGrammarLessonView";

type PageProps = {
  params: Promise<{ subtopicId: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function ToeicGrammarLessonPage({
  params,
  searchParams,
}: PageProps) {
  const [{ subtopicId }, query] = await Promise.all([params, searchParams]);
  const rawTab = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  return (
    <ToeicGrammarLessonView
      subtopicId={subtopicId}
      tab={rawTab === "practice" ? "practice" : "lesson"}
    />
  );
}
