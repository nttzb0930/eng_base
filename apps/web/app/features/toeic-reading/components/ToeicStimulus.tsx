import type { ToeicReadingStimulus } from "@repo/shared";
import { Languages } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import {
  parseToeicStimulusContent,
  type ToeicStimulusContentNode,
} from "../toeic-stimulus-content";

type ToeicStimulusProps = {
  stimulus: ToeicReadingStimulus;
};

export function ToeicStimulus({ stimulus }: ToeicStimulusProps) {
  const t = useTranslations("toeicReading");

  return (
    <article className="bg-card rounded-2xl border p-6 sm:p-8">
      <h3 className="sr-only">{t("session.stimulus")}</h3>
      {stimulus.body ? (
        <div className="text-foreground space-y-4 text-base leading-8">
          {parseToeicStimulusContent(stimulus.body).map((node, index) =>
            renderNode(node, `stimulus-${stimulus.id}-${index}`)
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t("session.stimulusUnavailable")}
        </p>
      )}
      {stimulus.translation ? (
        <details className="mt-6 border-t pt-4">
          <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-emerald-300">
            <Languages className="h-4 w-4" aria-hidden="true" />
            {t("session.showTranslation")}
          </summary>
          <p className="text-muted-foreground mt-3 whitespace-pre-line text-sm leading-7">
            {stimulus.translation}
          </p>
        </details>
      ) : null}
    </article>
  );
}

function renderNode(node: ToeicStimulusContentNode, key: string) {
  if (node.type === "text") {
    return (
      <span key={key} className="whitespace-pre-wrap">
        {node.value}
      </span>
    );
  }
  if (node.type === "lineBreak") return <br key={key} />;
  if (node.type === "image") {
    return (
      <Image
        key={key}
        src={node.src}
        alt={node.alt}
        width={960}
        height={640}
        unoptimized
        className="my-4 h-auto max-w-full rounded-lg border object-contain"
      />
    );
  }

  const children = node.children.map((child, index) =>
    renderNode(child, `${key}-${index}`)
  );
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{children}</p>;
    case "strong":
      return <strong key={key}>{children}</strong>;
    case "emphasis":
      return <em key={key}>{children}</em>;
    case "unorderedList":
      return (
        <ul key={key} className="list-disc space-y-1 pl-6">
          {children}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="list-decimal space-y-1 pl-6">
          {children}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children}</li>;
    case "table":
      return (
        <div key={key} className="max-w-full overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">{children}</table>
        </div>
      );
    case "tableHead":
      return <thead key={key}>{children}</thead>;
    case "tableBody":
      return <tbody key={key}>{children}</tbody>;
    case "tableRow":
      return <tr key={key}>{children}</tr>;
    case "tableHeader":
      return (
        <th key={key} className="bg-muted border p-2 text-left font-semibold">
          {children}
        </th>
      );
    case "tableCell":
      return (
        <td key={key} className="border p-2 align-top">
          {children}
        </td>
      );
  }
}
