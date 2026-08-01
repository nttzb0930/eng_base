import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

test("Listening browser has thin localized route and route-shaped skeleton", () => {
  const page = "app/[locale]/(main)/learn/cert/toeic/listening/page.tsx";
  const loading = "app/[locale]/(main)/learn/cert/toeic/listening/loading.tsx";
  assert.ok(existsSync(resolve(process.cwd(), page)));
  assert.match(read(page), /ToeicListeningListView/);
  assert.doesNotMatch(read(page), /use client|fetch\(/);
  assert.match(read(loading), /ToeicListeningListSkeleton/);
});

test("Listening browser exposes Full and Parts 1-4 with backend progress", () => {
  const view = read("app/views/toeic-listening/ToeicListeningListView.tsx");
  const tabs = read(
    "app/features/toeic-listening/components/ToeicListeningScopeTabs.tsx"
  );
  assert.match(tabs, /PART_1|part1/);
  assert.match(tabs, /part2/);
  assert.match(tabs, /part3/);
  assert.match(tabs, /part4/);
  assert.match(view, /draftProgress/);
  assert.match(view, /role="progressbar"/);
  assert.doesNotMatch(view, /localStorage/);
});

test("TOEIC overview opens the available Listening browser", () => {
  const source = read("app/views/toeic-reading/ToeicOverviewView.tsx");
  assert.match(source, /href="\/learn\/cert\/toeic\/listening"/);
  assert.doesNotMatch(source, /listeningDescription[\s\S]{0,500}comingSoon/);
  assert.ok(
    source.indexOf('t("overview.listening")') <
      source.indexOf('t("overview.reading")')
  );
  assert.match(source, /lg:grid-cols-2/);
  assert.doesNotMatch(source, /lg:grid-cols-\[1\.2fr_0\.8fr\]/);
});

test("Listening session and result routes stay thin with dedicated skeletons", () => {
  const sessionPage = read(
    "app/[locale]/(session)/toeic/listening/tests/[testId]/page.tsx"
  );
  const resultPage = read(
    "app/[locale]/(session)/toeic/listening/results/[attemptId]/page.tsx"
  );
  assert.match(sessionPage, /ToeicListeningSessionView/);
  assert.match(resultPage, /ToeicListeningResultView/);
  assert.doesNotMatch(`${sessionPage}${resultPage}`, /use client|fetch\(/);
  assert.match(
    read("app/[locale]/(session)/toeic/listening/tests/[testId]/loading.tsx"),
    /ToeicListeningSessionSkeleton/
  );
  assert.match(
    read(
      "app/[locale]/(session)/toeic/listening/results/[attemptId]/loading.tsx"
    ),
    /ToeicListeningResultSkeleton/
  );
});

test("Listening session owns split practice feedback, authenticated media, autosave, and Full start policy", () => {
  const session = read(
    "app/views/toeic-listening/ToeicListeningSessionView.tsx"
  );
  const player = read(
    "app/features/toeic-listening/components/ToeicListeningPlayer.tsx"
  );
  const question = read(
    "app/features/toeic-listening/components/ToeicListeningQuestionGroup.tsx"
  );
  assert.match(session, /groupToeicListeningQuestions/);
  assert.match(session, /createToeicListeningDraftQueue/);
  assert.match(session, /startFullSession|fullSessionStarted/);
  assert.match(session, /xl:grid-cols-2/);
  assert.match(
    session,
    /practicePart[\s\S]*checkAnswer|checkAnswer[\s\S]*practicePart/
  );
  assert.match(player, /<audio/);
  assert.match(player, /canSeekToeicListeningMedia/);
  assert.match(player, /canReplayToeicListeningMedia/);
  assert.match(
    player,
    /mode !== "PRACTICE"[\s\S]*toeicListeningApi[\s\S]{0,80}\.media/
  );
  assert.doesNotMatch(
    player,
    /state\.status === "IDLE"[\s\S]{0,500}t\("play"\)/
  );
  assert.match(session, /fixed bottom-0/);
  assert.match(session, /answeredCount[\s\S]{0,200}questionIds\.length/);
  assert.match(session, /<Sheet[\s\S]*<ToeicListeningNavigation/);
  assert.match(
    session,
    /autoStart=\{mode === "PRACTICE" \|\| fullSessionStarted\}/
  );
  assert.match(question, /feedback/);
  assert.match(question, /questionTranslation/);
  assert.match(question, /answerTranslations/);
  assert.match(question, /vocabulary/);
  assert.match(question, /option.label/);
  assert.doesNotMatch(`${session}${player}${question}`, /localStorage/);
});

test("Listening result reviews immutable transcript, translation, explanation, image, and audio", () => {
  const result = read("app/views/toeic-listening/ToeicListeningResultView.tsx");
  assert.match(result, /transcript/);
  assert.match(result, /transcriptTranslation/);
  assert.match(result, /explanation/);
  assert.match(result, /imageMediaIds/);
  assert.match(result, /ToeicListeningPlayer/);
});
