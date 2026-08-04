export type ToeicStimulusContentNode =
  | { type: "text"; value: string }
  | { type: "lineBreak" }
  | { type: "image"; src: string; alt: string }
  | {
      type:
        | "paragraph"
        | "strong"
        | "emphasis"
        | "unorderedList"
        | "orderedList"
        | "listItem"
        | "table"
        | "tableHead"
        | "tableBody"
        | "tableRow"
        | "tableHeader"
        | "tableCell";
      children: ToeicStimulusContentNode[];
    };

export type ToeicStimulusBlock = ToeicStimulusContentNode;

const elementTypes = {
  p: "paragraph",
  strong: "strong",
  b: "strong",
  em: "emphasis",
  i: "emphasis",
  ul: "unorderedList",
  ol: "orderedList",
  li: "listItem",
  table: "table",
  thead: "tableHead",
  tbody: "tableBody",
  tr: "tableRow",
  th: "tableHeader",
  td: "tableCell",
} as const;

const blockedTags = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "template",
]);

type ContainerNode = Extract<ToeicStimulusContentNode, { children: unknown }>;

export function parseToeicStimulusContent(
  source: string
): ToeicStimulusBlock[] {
  const root: { children: ToeicStimulusContentNode[] } = { children: [] };
  const stack: Array<{
    tag: string;
    node: { children: ToeicStimulusContentNode[] };
  }> = [{ tag: "root", node: root }];
  let blockedTag: string | null = null;
  let blockedDepth = 0;

  for (const token of source.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g) ?? []) {
    if (token.startsWith("<!--")) continue;

    if (token.startsWith("<")) {
      const tagMatch = token.match(/^<\s*(\/)?\s*([a-zA-Z0-9-]+)/);
      if (!tagMatch) continue;
      const closing = Boolean(tagMatch[1]);
      const tag = tagMatch[2]!.toLowerCase();

      if (blockedTag) {
        if (tag === blockedTag) {
          if (closing) blockedDepth -= 1;
          else blockedDepth += 1;
          if (blockedDepth === 0) blockedTag = null;
        }
        continue;
      }
      if (!closing && blockedTags.has(tag)) {
        blockedTag = tag;
        blockedDepth = 1;
        continue;
      }
      if (closing) {
        const index = stack.map((item) => item.tag).lastIndexOf(tag);
        if (index > 0) stack.splice(index);
        continue;
      }

      const parent = stack[stack.length - 1]!.node.children;
      if (tag === "br") {
        parent.push({ type: "lineBreak" });
        continue;
      }
      if (tag === "img") {
        const src = readAttribute(token, "src");
        if (src && isSafeImageUrl(src)) {
          parent.push({
            type: "image",
            src,
            alt: readAttribute(token, "alt") ?? "",
          });
        }
        continue;
      }

      const type = elementTypes[tag as keyof typeof elementTypes];
      if (!type) continue;
      const node: ContainerNode = { type, children: [] };
      parent.push(node);
      if (!token.endsWith("/>")) stack.push({ tag, node });
      continue;
    }

    if (blockedTag) continue;
    stack[stack.length - 1]!.node.children.push({
      type: "text",
      value: decodeEntities(token),
    });
  }

  return root.children;
}

function readAttribute(token: string, name: string) {
  const expression = new RegExp(
    `(?:\\s|^)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "i"
  );
  const match = token.replace(/^<\s*[a-zA-Z0-9-]+/, "").match(expression);
  const value = match?.[1] ?? match?.[2] ?? match?.[3];
  return value === undefined ? null : decodeEntities(value.trim());
}

function isSafeImageUrl(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("https://") || normalized.startsWith("/");
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, "\u00a0")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_match, decimal: string) =>
      String.fromCodePoint(Number(decimal))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, hexadecimal: string) =>
      String.fromCodePoint(Number.parseInt(hexadecimal, 16))
    );
}
