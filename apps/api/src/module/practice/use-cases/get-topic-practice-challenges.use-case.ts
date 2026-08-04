import { Injectable, NotFoundException } from "@nestjs/common";
import type { TopicPracticeMode } from "@repo/shared";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type { ChallengeOption } from "../../courses";
import { SystemSettingsReader } from "../../settings";
import {
  getDistractors,
  getVocabularyLearnerState,
  mapVocabularyItem,
  toReviewSourceItem,
} from "../../vocabulary";
import {
  PracticeSource,
  type RandomSource,
  type WeakWordsPracticeChallenge,
} from "./practice-source";

@Injectable()
export class GetTopicPracticeChallengesUseCase extends PracticeSource {
  constructor(prisma: PrismaService, settings: SystemSettingsReader) {
    super(prisma, settings);
  }

  async execute(
    userId: string,
    slug: string,
    mode: TopicPracticeMode,
    random: RandomSource = this.random,
  ): Promise<WeakWordsPracticeChallenge[]> {
    const weakWordsLimit = await this.getWeakWordsLimit();
    const topic = await this.prisma.vocabulary_topics.findUnique({
      where: { slug: slug.trim().toLowerCase() },
      include: {
        vocabulary_item_topics: {
          include: {
            vocabulary_items: {
              include: {
                user_saved_words: { where: { user_id: userId } },
                user_vocabulary_progress: { where: { user_id: userId } },
                vocabulary_examples: {
                  orderBy: [{ order: "asc" }, { id: "asc" }],
                },
              },
            },
          },
        },
      },
    });

    if (!topic) {
      throw new NotFoundException("TOPIC_NOT_FOUND");
    }

    const now = new Date();
    const topicItems = topic.vocabulary_item_topics.map(({ vocabulary_items }) =>
      mapVocabularyItem(vocabulary_items),
    );
    const eligibleItems = topicItems.filter((item) => {
      const state = getVocabularyLearnerState(item, now);

      if (mode === "weak") return state.weak;
      if (mode === "new") return state.unlearned;
      return true;
    });
    const selectedItems = this.shuffle(eligibleItems, random).slice(
      0,
      weakWordsLimit,
    );
    const distractorPool = topicItems.map(toReviewSourceItem);

    return selectedItems.map((item, index) => {
      const challengeId = index + 1;
      const direction = index % 2 === 0 ? "EN_TO_VI" : "VI_TO_EN";
      const target = toReviewSourceItem(item);
      const distractors = getDistractors(
        target,
        distractorPool,
        3,
        random,
      );
      const challengeOptions = this.shuffle(
        [target, ...distractors],
        random,
      ).map(
        (option, optionIndex): ChallengeOption => ({
          id: challengeId * 10 + optionIndex,
          challengeId,
          text:
            direction === "EN_TO_VI"
              ? option.primaryMeaningVi
              : option.word,
          correct: option.id === target.id,
          imageSrc: null,
          audioSrc: null,
        }),
      );

      return {
        id: challengeId,
        type: direction === "EN_TO_VI" ? "SELECT" : "ASSIST",
        direction,
        question:
          direction === "EN_TO_VI"
            ? `What does "${item.word}" mean?`
            : `Which word means "${item.primaryMeaningVi}"?`,
        vocabularyItem: item,
        challengeOptions,
      };
    });
  }
}
