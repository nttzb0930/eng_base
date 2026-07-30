import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import ts from "typescript";

const webRoot = join(import.meta.dirname, "..");
const auditedRoots = [
  "app/views",
  "app/features/placement-test/onboarding",
  "app/features/flashcards/components",
  "app/features/practice",
  "app/features/review",
];
const auditedAttributes = new Set([
  "aria-label",
  "title",
  "placeholder",
  "alt",
]);
const unicodeLetter = /\p{L}/u;

function tsxFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function sourceLocation(source: ts.SourceFile, position: number): string {
  const { line, character } = source.getLineAndCharacterOfPosition(position);
  return `${relative(webRoot, source.fileName).replaceAll("\\", "/")}:${line + 1}:${character + 1}`;
}

function visibleText(value: string): boolean {
  return unicodeLetter.test(value.trim());
}

test("learner presentation copy is sourced from locale catalogs", () => {
  const violations: string[] = [];

  for (const file of auditedRoots.flatMap((root) =>
    tsxFiles(join(webRoot, root))
  )) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node) && visibleText(node.text)) {
        violations.push(
          `${sourceLocation(source, node.getStart(source))} JSX text: ${node.text.trim()}`
        );
      }

      if (
        ts.isJsxAttribute(node) &&
        auditedAttributes.has(node.name.getText(source)) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer) &&
        visibleText(node.initializer.text)
      ) {
        violations.push(
          `${sourceLocation(source, node.getStart(source))} ${node.name.getText(source)}: ${node.initializer.text}`
        );
      }

      ts.forEachChild(node, visit);
    };

    visit(source);
  }

  assert.equal(
    violations.length,
    0,
    `Hard-coded learner presentation copy:\n${violations.join("\n")}`
  );
});
