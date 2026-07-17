import { redirect } from "next/navigation";

import { getLocalizedPath } from "@/app/i18n/server";
import { getUserProgress } from "@/src/modules/learning/queries";
import { getDailyReviewChallenges } from "@/src/modules/review/daily-review";

import { DailyReviewQuiz } from "@/src/views/review/daily-review-quiz";

const DailyReviewPage = async () => {
  const [userProgress, challenges] = await Promise.all([
    getUserProgress(),
    getDailyReviewChallenges(),
  ]);

  if (!userProgress) redirect(await getLocalizedPath("/learn"));

  return <DailyReviewQuiz initialChallenges={challenges} />;
};

export default DailyReviewPage;
