import { parseToeicGrammarCatalogTab } from "@/app/features/toeic-grammar/toeic-grammar-route";
import { ToeicGrammarCatalogView } from "@/app/views/toeic-grammar/ToeicGrammarCatalogView";

type ToeicGrammarCatalogPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export default async function ToeicGrammarCatalogPage({
  searchParams,
}: ToeicGrammarCatalogPageProps) {
  const query = await searchParams;
  const value = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  return <ToeicGrammarCatalogView tab={parseToeicGrammarCatalogTab(value)} />;
}
