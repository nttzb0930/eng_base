import type { ToeicGrammarLessonBlock } from "@repo/shared";
import { BookOpen } from "lucide-react";
import { useLocale } from "next-intl";

type ToeicGrammarLessonContentProps = {
  lessons: ToeicGrammarLessonBlock[];
  emptyLabel: string;
};

function paragraphs(value: string) {
  return value
    .split(/\r?\n\s*\r?\n/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function ToeicGrammarLessonContent({
  lessons,
  emptyLabel,
}: ToeicGrammarLessonContentProps) {
  const locale = useLocale();
  if (lessons.length === 0) {
    return (
      <div className="text-muted-foreground rounded-2xl border border-dashed px-6 py-12 text-center text-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lessons.map((lesson) => {
        const body =
          locale === "vi"
            ? (lesson.theoryContentVi ?? lesson.theoryContentEn)
            : (lesson.theoryContentEn ?? lesson.theoryContentVi);
        return (
          <article
            key={lesson.target}
            className="bg-card rounded-2xl border p-6 shadow-sm sm:p-8"
          >
            <header className="flex items-center gap-3 border-b pb-4">
              <span className="rounded-xl bg-sky-50 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-semibold tracking-tight">
                {locale === "vi"
                  ? lesson.titleVi
                  : (lesson.titleEn ?? lesson.titleVi)}
              </h2>
            </header>
            {body ? (
              <div className="text-foreground/90 mt-5 space-y-4 text-[15px] leading-7">
                {paragraphs(body).map((paragraph, index) => (
                  <p key={`${lesson.target}-${index}`}>{paragraph}</p>
                ))}
              </div>
            ) : null}
            {!body && lesson.structuredContent ? (
              <pre className="bg-muted mt-5 overflow-x-auto whitespace-pre-wrap rounded-xl p-4 text-sm leading-6">
                {JSON.stringify(lesson.structuredContent, null, 2)}
              </pre>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
