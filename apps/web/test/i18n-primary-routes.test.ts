import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import ts from "typescript";

type MessageCatalog = Record<string, unknown>;

const webRoot = join(import.meta.dirname, "..");
const primaryRoutes = {
  dashboard: "app/views/dashboard/DashboardView.tsx",
  learn: "app/views/learn/LearnView.tsx",
  "learn/level": "app/views/learn/LearnLevelView.tsx",
  topics: "app/views/topics/TopicsView.tsx",
  "topics/[slug]": "app/views/topics/TopicDetailView.tsx",
  practice: "app/views/practice/PracticeView.tsx",
  review: "app/views/review/ReviewView.tsx",
  flashcards: "app/views/flashcards/FlashcardsView.tsx",
  "saved-words": "app/views/saved-words/SavedWordsView.tsx",
  "placement-test": "app/views/placement-test/PlacementTestView.tsx",
} as const;

const readCatalog = (locale: "en" | "vi") =>
  JSON.parse(
    readFileSync(join(webRoot, "app", "messages", `${locale}.json`), "utf8")
  ) as MessageCatalog;

function valueAtPath(catalog: MessageCatalog, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === "object"
          ? (value as Record<string, unknown>)[key]
          : undefined,
      catalog
    );
}

test("primary learner routes reference messages available in both locales", () => {
  const catalogs = {
    en: readCatalog("en"),
    vi: readCatalog("vi"),
  };

  for (const [route, relativePath] of Object.entries(primaryRoutes)) {
    const file = join(webRoot, relativePath);
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );
    const translatorNamespaces = new Map<string, string>();

    const collectTranslators = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isCallExpression(node.initializer) &&
        ts.isIdentifier(node.initializer.expression) &&
        node.initializer.expression.text === "useTranslations" &&
        node.initializer.arguments.length === 1 &&
        ts.isStringLiteral(node.initializer.arguments[0]!)
      ) {
        translatorNamespaces.set(
          node.name.text,
          node.initializer.arguments[0]!.text
        );
      }
      ts.forEachChild(node, collectTranslators);
    };
    collectTranslators(source);

    for (const namespace of translatorNamespaces.values()) {
      for (const [locale, catalog] of Object.entries(catalogs)) {
        assert.notEqual(
          valueAtPath(catalog, namespace),
          undefined,
          `${route} uses missing ${locale} namespace ${namespace}`
        );
      }
    }

    const assertMessageCalls = (node: ts.Node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        translatorNamespaces.has(node.expression.text) &&
        node.arguments.length > 0 &&
        ts.isStringLiteral(node.arguments[0]!)
      ) {
        const namespace = translatorNamespaces.get(node.expression.text)!;
        const messagePath = `${namespace}.${node.arguments[0]!.text}`;
        for (const [locale, catalog] of Object.entries(catalogs)) {
          assert.notEqual(
            valueAtPath(catalog, messagePath),
            undefined,
            `${route} uses missing ${locale} message ${messagePath}`
          );
        }
      }
      ts.forEachChild(node, assertMessageCalls);
    };
    assertMessageCalls(source);
  }
});
