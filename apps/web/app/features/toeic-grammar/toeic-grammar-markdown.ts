export type ToeicGrammarMarkdownBlock = {
  kind: "markdown" | "example" | "note";
  content: string;
};

const openingDirective = /^:::(example|note)\s*$/u;
const closingDirective = /^:::\s*$/u;

export function parseToeicGrammarMarkdown(
  value: string
): ToeicGrammarMarkdownBlock[] {
  const lines = value.replace(/\r\n?/gu, "\n").split("\n");
  const blocks: ToeicGrammarMarkdownBlock[] = [];
  let markdown: string[] = [];

  const flushMarkdown = () => {
    const content = markdown.join("\n").trim();
    if (content) blocks.push({ kind: "markdown", content });
    markdown = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const match = openingDirective.exec(lines[index] ?? "");
    if (!match) {
      markdown.push(lines[index] ?? "");
      continue;
    }

    const closingIndex = lines.findIndex(
      (line, candidate) => candidate > index && closingDirective.test(line)
    );
    if (closingIndex < 0) {
      markdown.push(...lines.slice(index));
      break;
    }

    flushMarkdown();
    const content = lines.slice(index + 1, closingIndex).join("\n").trim();
    if (content) {
      blocks.push({
        kind: match[1] as "example" | "note",
        content,
      });
    }
    index = closingIndex;
  }

  flushMarkdown();
  return blocks;
}
