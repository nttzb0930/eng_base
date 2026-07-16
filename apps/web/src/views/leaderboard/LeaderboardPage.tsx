import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FeedWrapper } from "@/src/components/feed-wrapper";
import { Avatar, AvatarImage } from "@/src/components/ui/avatar";
import { Separator } from "@/src/components/ui/separator";
import { getLocalizedPath } from "@/src/lib/i18n/server";
import {
  getTopTenUsers,
  getUserProgress,
} from "@/src/modules/learning/queries";

const LeaderboardPage = async () => {
  const t = await getTranslations("leaderboard");
  const userProgressData = getUserProgress();
  const leaderboardData = getTopTenUsers();

  const [userProgress, leaderboard] = await Promise.all([
    userProgressData,
    leaderboardData,
  ]);

  if (!userProgress || !userProgress.activeCourse) {
    redirect(await getLocalizedPath("/courses"));
  }

  return (
    <div className="flex justify-center px-6 w-full">
      <div className="w-full max-w-[672px]">
        <FeedWrapper>
          <div className="flex w-full flex-col items-center">
            <Image
              src="/leaderboard.svg"
              alt={t("title")}
              height={90}
              width={90}
            />

            <h1 className="my-6 text-center text-2xl font-bold text-neutral-800">
              {t("title")}
            </h1>
            <p className="mb-6 text-center text-lg text-muted-foreground">
              {t("description")}
            </p>

            <Separator className="mb-4 h-0.5 rounded-full" />
            {leaderboard.map((userProgress, i) => (
              <div
                key={userProgress.userId}
                className="flex w-full items-center rounded-xl p-2 px-4 hover:bg-gray-200/50"
              >
                <p className="mr-4 font-bold text-lime-700">{i + 1}</p>

                <Avatar className="ml-3 mr-6 h-12 w-12 border bg-green-500">
                  <AvatarImage
                    src={userProgress.userImageSrc}
                    className="object-cover"
                  />
                </Avatar>

                <p className="flex-1 font-bold text-neutral-800">
                  {userProgress.userName}
                </p>
                <p className="text-muted-foreground">{userProgress.points} XP</p>
              </div>
            ))}
          </div>
        </FeedWrapper>
      </div>
    </div>
  );
};

export default LeaderboardPage;
