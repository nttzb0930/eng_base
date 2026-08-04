import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test("dictation lesson ranges are sourced from both locale catalogs", () => {
  const view = read("app/views/toeic-listening/ToeicDictationSessionView.tsx");
  const en = JSON.parse(read("app/messages/en.json")) as {
    toeicDictation: { session: Record<string, string> };
  };
  const vi = JSON.parse(read("app/messages/vi.json")) as {
    toeicDictation: { session: Record<string, string> };
  };

  assert.match(view, /fullTitle: t\("lessonRange", \{/);
  assert.doesNotMatch(view, /fullTitle:\s*`Bài/u);
  assert.equal(
    en.toeicDictation.session.lessonRange,
    "Lesson {lesson} (Questions {start}–{end})"
  );
  assert.equal(
    vi.toeicDictation.session.lessonRange,
    "Bài {lesson} (Câu {start}–{end})"
  );
});
