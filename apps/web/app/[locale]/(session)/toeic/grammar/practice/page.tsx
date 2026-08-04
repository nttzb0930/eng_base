import { notFound } from "next/navigation";

import { parseToeicGrammarPracticeRoute } from "@/app/features/toeic-grammar/toeic-grammar-route";
import { ToeicGrammarPracticeView } from "@/app/views/toeic-grammar/ToeicGrammarPracticeView";

type ToeicGrammarPracticePageProps = { searchParams: Promise<{ mode?: string | string[]; target?: string | string[] }> };

export default async function ToeicGrammarPracticePage({ searchParams }: ToeicGrammarPracticePageProps) {
  const query = await searchParams;
  const mode = Array.isArray(query.mode) ? query.mode[0] : query.mode;
  const target = Array.isArray(query.target) ? query.target[0] : query.target;
  const route = parseToeicGrammarPracticeRoute(mode, target);
  if (!route) notFound();
  return <ToeicGrammarPracticeView mode={route.mode} target={route.target} />;
}
