import type {
  ToeicGrammarAnswerResult,
  ToeicGrammarVocabularyEntry,
} from "@repo/shared";
import { BookOpen, CheckCircle2, Languages, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";

type ToeicGrammarFeedbackProps = {
  result: ToeicGrammarAnswerResult;
};

const textValue = (record: Record<string, unknown>, key: string) => {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
};

function VocabularyEntry({ entry }: { entry: ToeicGrammarVocabularyEntry }) {
  if (typeof entry === "string") {
    return (
      <li className="bg-background rounded-xl border px-4 py-3 text-sm">
        {entry}
      </li>
    );
  }
  const word = textValue(entry, "word") ?? textValue(entry, "term");
  const pos = textValue(entry, "pos");
  const cefr = textValue(entry, "cefr");
  const meaning = textValue(entry, "meaning_vi") ?? textValue(entry, "meaning");
  const exampleEn = textValue(entry, "example_en");
  const exampleVi = textValue(entry, "example_vi");
  const ipaUs = textValue(entry, "ipa_us");
  const ipaUk = textValue(entry, "ipa_uk");
  const collocations = textValue(entry, "collocations");
  const synonym = textValue(entry, "synonym");

  return (
    <li className="bg-background rounded-xl border px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <strong className="text-base">{word ?? "—"}</strong>
        {pos ? <em className="text-muted-foreground">({pos})</em> : null}
        {cefr ? (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            {cefr}
          </span>
        ) : null}
      </div>
      {ipaUs || ipaUk ? (
        <p className="text-muted-foreground mt-1 text-xs">
          {ipaUs ? `US ${ipaUs}` : ""} {ipaUk ? ` · UK ${ipaUk}` : ""}
        </p>
      ) : null}
      {meaning ? <p className="mt-2 font-medium">{meaning}</p> : null}
      {exampleEn ? <p className="mt-2 italic">“{exampleEn}”</p> : null}
      {exampleVi ? (
        <p className="text-muted-foreground mt-1">{exampleVi}</p>
      ) : null}
      {collocations ? <p className="mt-2">{collocations}</p> : null}
      {synonym ? (
        <p className="text-muted-foreground mt-1">≈ {synonym}</p>
      ) : null}
    </li>
  );
}

export function ToeicGrammarFeedback({ result }: ToeicGrammarFeedbackProps) {
  const t = useTranslations("toeicGrammar.feedback");

  return (
    <section className="mt-5 space-y-4" aria-live="polite">
      <div
        className={`rounded-2xl border p-5 ${result.correct ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/50" : "border-rose-300 bg-rose-50 dark:bg-rose-950/50"}`}
      >
        <div className="flex items-center gap-3">
          {result.correct ? (
            <CheckCircle2
              className="h-6 w-6 text-emerald-600"
              aria-hidden="true"
            />
          ) : (
            <XCircle className="h-6 w-6 text-rose-600" aria-hidden="true" />
          )}
          <div>
            <h2 className="font-semibold">
              {result.correct ? t("correct") : t("incorrect")}
            </h2>
            {!result.correct ? (
              <p className="mt-1 text-sm">
                {t("correctAnswer", {
                  label: result.correctOptionLabel,
                  answer: result.correctOptionText,
                })}
              </p>
            ) : null}
          </div>
        </div>
        {result.explanationVi || result.explanationEn ? (
          <div className="border-current/10 mt-4 border-t pt-4 text-sm leading-6">
            <h3 className="font-semibold">{t("explanation")}</h3>
            <p className="mt-1">
              {result.explanationVi ?? result.explanationEn}
            </p>
          </div>
        ) : null}
      </div>

      {result.questionTranslation || result.answerTranslation ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5 dark:border-sky-900 dark:bg-sky-950/40">
          <h2 className="flex items-center gap-2 font-semibold text-sky-800 dark:text-sky-200">
            <Languages className="h-5 w-5" aria-hidden="true" />
            {t("translation")}
          </h2>
          {result.questionTranslation ? (
            <p className="mt-3 text-sm leading-6">
              {result.questionTranslation}
            </p>
          ) : null}
          {result.answerTranslation ? (
            <p className="mt-2 text-sm leading-6">{result.answerTranslation}</p>
          ) : null}
        </div>
      ) : null}

      {result.vocabulary.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <h2 className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-200">
            <BookOpen className="h-5 w-5" aria-hidden="true" />
            {t("vocabulary")}
          </h2>
          <ul className="mt-4 space-y-3">
            {result.vocabulary.map((entry, index) => (
              <VocabularyEntry key={index} entry={entry} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
