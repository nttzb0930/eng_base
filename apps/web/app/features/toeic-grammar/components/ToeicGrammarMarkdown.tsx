import { BookOpenCheck, Info } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/app/utils/cn";
import { parseToeicGrammarMarkdown } from "../toeic-grammar-markdown";

type ToeicGrammarMarkdownProps = {
  value: string;
};

function MarkdownBody({ value }: ToeicGrammarMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        h1: ({ children }) => (
          <h1 className="mt-8 border-b pb-3 text-2xl font-bold tracking-tight first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-8 border-b pb-3 text-xl font-semibold tracking-tight first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-6 text-lg font-semibold tracking-tight">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="my-3 whitespace-pre-line leading-7">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="my-4 list-disc space-y-2 pl-6">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-4 list-decimal space-y-2 pl-6">{children}</ol>
        ),
        code: ({ children }) => (
          <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-[0.9em]">
            {children}
          </code>
        ),
        pre: ({ children }) => (
          <pre className="bg-muted my-4 overflow-x-auto rounded-xl p-4 text-sm leading-6">
            {children}
          </pre>
        ),
        hr: () => <hr className="border-border my-7" />,
        a: ({ href, children }) => {
          const external = Boolean(href && /^https?:\/\//u.test(href));
          return (
            <a
              className="text-primary underline underline-offset-4"
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer noopener" : undefined}
            >
              {children}
            </a>
          );
        },
      }}
    >
      {value}
    </ReactMarkdown>
  );
}

export function ToeicGrammarMarkdown({
  value,
}: ToeicGrammarMarkdownProps) {
  return (
    <div className="text-foreground/90 text-[15px]">
      {parseToeicGrammarMarkdown(value).map((block, index) => {
        const directive = block.kind !== "markdown";
        const Icon = block.kind === "example" ? BookOpenCheck : Info;
        return (
          <section
            key={`${block.kind}-${index}`}
            className={cn(
              directive && "my-5 rounded-xl border px-5 py-4",
              block.kind === "example" &&
                "border-violet-200 bg-violet-50/60 dark:border-violet-900 dark:bg-violet-950/30",
              block.kind === "note" &&
                "border-sky-200 bg-sky-50/60 dark:border-sky-900 dark:bg-sky-950/30"
            )}
          >
            {directive ? (
              <Icon className="mb-2 h-5 w-5" aria-hidden="true" />
            ) : null}
            <MarkdownBody value={block.content} />
          </section>
        );
      })}
    </div>
  );
}
