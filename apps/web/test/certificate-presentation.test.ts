import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const webRoot = join(import.meta.dirname, "..");
const readWebFile = (path: string) => readFileSync(join(webRoot, path), "utf8");

test("Certificate discovery uses real Course identity without fictional progress", () => {
  const coursesSource = readWebFile("app/views/courses/CoursesView.tsx");

  assert.match(coursesSource, /isCertificateCourse/);
  assert.match(coursesSource, /certificateCourses/);
  assert.doesNotMatch(coursesSource, /courses\[0\]/);
  assert.doesNotMatch(coursesSource, /42%|428|1,247|0\/980|0\/1,100|0\/820/);
  assert.doesNotMatch(
    coursesSource,
    /unlockConditionIelts|unlockConditionToeic|certStatsSummary/
  );
});

test("learner views do not invent Certificate decks, counts, or memberships", () => {
  const flashcardsSource = readWebFile(
    "app/views/flashcards/FlashcardsView.tsx"
  );
  const topicDetailSource = readWebFile("app/views/topics/TopicDetailView.tsx");
  const learnSource = readWebFile("app/views/learn/LearnView.tsx");
  const generalEnglishNavigationSource = readWebFile(
    "app/features/general-english/components/GeneralEnglishSectionNav.tsx"
  );

  assert.doesNotMatch(flashcardsSource, /CERT_DECKS|percent:\s*(42|18)/);
  assert.match(flashcardsSource, /t\("certificateUnavailable"\)/);
  assert.doesNotMatch(topicDetailSource, /certDistributionTitle/);
  assert.doesNotMatch(topicDetailSource, />\s*(IELTS|TOEIC)\s*</);
  assert.doesNotMatch(learnSource, />\s*IELTS\s*</);
  assert.doesNotMatch(generalEnglishNavigationSource, /\/learn\/cert/);
});

test("English and Vietnamese explain the truthful unavailable state", () => {
  const en = JSON.parse(readWebFile("app/messages/en.json")) as {
    flashcards: Record<string, unknown>;
    topics: Record<string, unknown>;
  };
  const vi = JSON.parse(readWebFile("app/messages/vi.json")) as {
    flashcards: Record<string, unknown>;
    topics: Record<string, unknown>;
  };

  assert.match(String(en.flashcards.certificateUnavailable), /not available/i);
  assert.equal(typeof vi.flashcards.certificateUnavailable, "string");
  assert.equal(typeof en.topics.certificateUnavailableTitle, "string");
  assert.equal(typeof en.topics.certificateUnavailableDescription, "string");
  assert.equal(typeof vi.topics.certificateUnavailableTitle, "string");
  assert.equal(typeof vi.topics.certificateUnavailableDescription, "string");
});
