import { redirect } from "next/navigation";

import { getUserProgress } from "@/src/modules/learning/queries";
import { getLocalizedPath } from "@/src/lib/i18n/server";
import { getWeakWordsPracticeChallenges } from "@/src/modules/practice/weak-words-session";

import { WeakWordsPracticeQuiz } from "@/src/views/practice/weak-words/practice-quiz";

const WeakWordsPracticePage = async () => {
  const [userProgress, challenges] = await Promise.all([
    getUserProgress(),
    getWeakWordsPracticeChallenges(),
  ]);

  if (!userProgress) redirect(await getLocalizedPath("/learn"));

  return <WeakWordsPracticeQuiz initialChallenges={challenges} />;
};

export default WeakWordsPracticePage;
