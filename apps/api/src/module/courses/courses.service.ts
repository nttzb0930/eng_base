import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma/prisma.service";
import { auth } from "../../common/auth-context";
import type {
  CourseDto,
  CourseLessonDto,
  CourseUnitDto,
  LessonChallengeDirection,
  LessonChallengeOptionDto,
  LessonChallengeType,
} from "@repo/shared/courses";
import type {
  challenge_options as challenge_optionsModel,
  challenge_progress as challenge_progressModel,
  challenges as challengesModel,
  courses as coursesModel,
  lessons as lessonsModel,
  units as unitsModel,
  user_progress as user_progressModel,
  user_saved_words as user_saved_wordsModel,
  user_vocabulary_progress as user_vocabulary_progressModel,
  vocabulary_examples as vocabulary_examplesModel,
  vocabulary_items as vocabulary_itemsModel,
} from "@prisma/client";

export type Course = CourseDto;
export type UnitRecord = CourseUnitDto;
export type LessonRecord = CourseLessonDto;

export type VocabularyItem = {
  id: number;
  word: string;
  normalizedWord: string;
  pos: string;
  posVi: string | null;
  cefrLevel: string;
  phonetic: string | null;
  phoneticSource: string | null;
  audioUrl: string | null;
  audioSource: string | null;
  exampleEn: string | null;
  exampleVi: string | null;
  exampleSource: string | null;
  meaningVi: string;
  primaryMeaningVi: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  userSavedWords: UserSavedWord[];
  userVocabularyProgress: UserVocabularyProgress[];
  vocabularyExamples: VocabularyExample[];
};

export type VocabularyExample = {
  id: number;
  vocabularyItemId: number;
  exampleEn: string;
  exampleVi: string | null;
  source: string;
  order: number;
  createdAt: Date;
};

export type UserVocabularyProgress = {
  id: number;
  userId: string;
  vocabularyItemId: number;
  correctCount: number;
  wrongCount: number;
  reviewCount: number;
  masteryLevel: string;
  easeFactor: number;
  intervalDays: number;
  repetitionCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserSavedWord = {
  id: number;
  userId: string;
  vocabularyItemId: number;
  createdAt: Date;
};

export type ChallengeOption = LessonChallengeOptionDto;

export type ChallengeProgress = {
  id: number;
  userId: string;
  challengeId: number;
  completed: boolean;
};

export type Challenge = {
  id: number;
  lessonId: number;
  vocabularyItemId: number | null;
  type: LessonChallengeType;
  direction: LessonChallengeDirection | null;
  question: string;
  order: number;
  challengeOptions: ChallengeOption[];
  challengeProgress: ChallengeProgress[];
  vocabularyItem: VocabularyItem | null;
};

export type LessonWithChallenges = LessonRecord & {
  challenges: Challenge[];
};

export type LessonWithCompletion = LessonRecord & {
  completed: boolean;
};

export type LessonWithUnit = LessonRecord & {
  unit: UnitRecord;
};

export type UnitWithLessons = UnitRecord & {
  lessons: LessonWithCompletion[];
};

export type UserProgress = {
  userId: string;
  userName: string;
  userImageSrc: string;
  activeCourseId: number | null;
  hearts: number;
  points: number;
  activeCourse: Course | null;
  isPlacementTestConfirmed: boolean;
  primaryLanguage: string;
};

type RawVocabularyItem = vocabulary_itemsModel & {
  user_saved_words?: user_saved_wordsModel[];
  user_vocabulary_progress?: user_vocabulary_progressModel[];
  vocabulary_examples?: vocabulary_examplesModel[];
};

type RawChallenge = challengesModel & {
  challenge_options?: challenge_optionsModel[];
  challenge_progress?: challenge_progressModel[];
  vocabulary_items?: RawVocabularyItem | null;
};

type RawLesson = lessonsModel & {
  challenges?: RawChallenge[];
  units?: unitsModel | null;
};

type RawUnit = unitsModel & {
  lessons?: RawLesson[];
};

type RawUserProgress = user_progressModel & {
  courses?: coursesModel | null;
};

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  mapCourse(course: coursesModel): Course {
    return {
      id: course.id,
      title: course.title,
      imageSrc: course.image_src,
    };
  }

  mapUnitRecord(unit: unitsModel): UnitRecord {
    return {
      id: unit.id,
      title: unit.title,
      description: unit.description,
      courseId: unit.course_id,
      order: unit.order,
    };
  }

  mapLessonRecord(lesson: lessonsModel): LessonRecord {
    return {
      id: lesson.id,
      title: lesson.title,
      unitId: lesson.unit_id,
      order: lesson.order,
    };
  }

  mapUserProgress(
    progress: RawUserProgress,
    isPlacementTestConfirmed = false
  ): UserProgress {
    return {
      userId: progress.user_id,
      userName: progress.user_name,
      userImageSrc: progress.user_image_src,
      activeCourseId: progress.active_course_id,
      hearts: progress.hearts,
      points: progress.points,
      activeCourse: progress.courses ? this.mapCourse(progress.courses) : null,
      isPlacementTestConfirmed,
      primaryLanguage: progress.primary_language,
    };
  }

  mapSavedWord(savedWord: user_saved_wordsModel): UserSavedWord {
    return {
      id: savedWord.id,
      userId: savedWord.user_id,
      vocabularyItemId: savedWord.vocabulary_item_id,
      createdAt: savedWord.created_at,
    };
  }

  mapUserVocabularyProgress(
    progress: user_vocabulary_progressModel
  ): UserVocabularyProgress {
    return {
      id: progress.id,
      userId: progress.user_id,
      vocabularyItemId: progress.vocabulary_item_id,
      correctCount: progress.correct_count,
      wrongCount: progress.wrong_count,
      reviewCount: progress.review_count,
      masteryLevel: progress.mastery_level,
      easeFactor: progress.ease_factor,
      intervalDays: progress.interval_days,
      repetitionCount: progress.repetition_count,
      lastReviewedAt: progress.last_reviewed_at,
      nextReviewAt: progress.next_review_at,
      createdAt: progress.created_at,
      updatedAt: progress.updated_at,
    };
  }

  mapVocabularyExample(example: vocabulary_examplesModel): VocabularyExample {
    return {
      id: example.id,
      vocabularyItemId: example.vocabulary_item_id,
      exampleEn: example.example_en,
      exampleVi: example.example_vi,
      source: example.source,
      order: example.order,
      createdAt: example.created_at,
    };
  }

  mapVocabularyItem(item: RawVocabularyItem): VocabularyItem {
    return {
      id: item.id,
      word: item.word,
      normalizedWord: item.normalized_word,
      pos: item.pos,
      posVi: item.pos_vi,
      cefrLevel: item.cefr_level,
      phonetic: item.phonetic,
      phoneticSource: item.phonetic_source,
      audioUrl: item.audio_url,
      audioSource: item.audio_source,
      exampleEn: item.example_en,
      exampleVi: item.example_vi,
      exampleSource: item.example_source,
      meaningVi: item.meaning_vi,
      primaryMeaningVi: item.primary_meaning_vi,
      source: item.source,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      userSavedWords:
        item.user_saved_words?.map((x) => this.mapSavedWord(x)) ?? [],
      userVocabularyProgress:
        item.user_vocabulary_progress?.map((x) =>
          this.mapUserVocabularyProgress(x)
        ) ?? [],
      vocabularyExamples:
        item.vocabulary_examples?.map((x) => this.mapVocabularyExample(x)) ??
        [],
    };
  }

  mapChallengeOption(option: challenge_optionsModel): ChallengeOption {
    return {
      id: option.id,
      challengeId: option.challenge_id,
      text: option.text,
      correct: option.correct,
      imageSrc: option.image_src,
      audioSrc: option.audio_src,
    };
  }

  mapChallengeProgress(progress: challenge_progressModel): ChallengeProgress {
    return {
      id: progress.id,
      userId: progress.user_id,
      challengeId: progress.challenge_id,
      completed: progress.completed,
    };
  }

  mapChallenge(challenge: RawChallenge): Challenge {
    return {
      id: challenge.id,
      lessonId: challenge.lesson_id,
      vocabularyItemId: challenge.vocabulary_item_id,
      type: challenge.type,
      direction: challenge.direction,
      question: challenge.question,
      order: challenge.order,
      challengeOptions:
        challenge.challenge_options?.map((x) => this.mapChallengeOption(x)) ??
        [],
      challengeProgress:
        challenge.challenge_progress?.map((x) =>
          this.mapChallengeProgress(x)
        ) ?? [],
      vocabularyItem: challenge.vocabulary_items
        ? this.mapVocabularyItem(challenge.vocabulary_items)
        : null,
    };
  }

  mapLessonWithChallenges(lesson: RawLesson): LessonWithChallenges {
    return {
      ...this.mapLessonRecord(lesson),
      challenges: lesson.challenges?.map((x) => this.mapChallenge(x)) ?? [],
    };
  }

  mapUnitWithLessons(unit: RawUnit): UnitWithLessons {
    return {
      ...this.mapUnitRecord(unit),
      lessons:
        unit.lessons?.map((lesson) => ({
          ...this.mapLessonRecord(lesson),
          completed: false,
        })) ?? [],
    };
  }

  async getCourses() {
    const data = await this.prisma.courses.findMany();
    return data.map((x) => this.mapCourse(x));
  }

  async getUserProgress() {
    const { userId } = await auth();

    if (!userId) return null;

    const data = await this.prisma.user_progress.findUnique({
      where: { user_id: userId },
      include: {
        courses: true,
      },
    });

    const session = await this.prisma.placement_test_sessions.findUnique({
      where: { user_id: userId },
      select: { status: true },
    });
    const isConfirmed = session?.status === "CONFIRMED";

    if (data) return this.mapUserProgress(data, isConfirmed);

    const dbUser = await this.prisma.users.findUnique({
      where: { id: userId },
    });
    const userName = dbUser?.full_name || dbUser?.username || "User";
    const syncedProgress = await this.prisma.user_progress.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        active_course_id: null,
        user_name: userName,
        user_image_src: "/mascot.svg",
      },
      update: {
        user_name: userName,
        user_image_src: "/mascot.svg",
      },
      include: {
        courses: true,
      },
    });

    return this.mapUserProgress(syncedProgress, isConfirmed);
  }

  async getUnits() {
    const { userId } = await auth();
    const userProgress = await this.getUserProgress();

    if (!userId || !userProgress?.activeCourseId) return [];

    const data = await this.prisma.units.findMany({
      where: { course_id: userProgress.activeCourseId },
      orderBy: { order: "asc" },
      include: {
        lessons: {
          orderBy: { order: "asc" },
          include: {
            challenges: {
              orderBy: { order: "asc" },
              include: {
                challenge_progress: {
                  where: { user_id: userId },
                },
              },
            },
          },
        },
      },
    });

    return data.map((rawUnit) => {
      const unit = this.mapUnitWithLessons(rawUnit);
      const lessons = rawUnit.lessons.map((rawLesson) => {
        const lesson = this.mapLessonWithChallenges(rawLesson);

        if (lesson.challenges.length === 0)
          return { ...this.mapLessonRecord(rawLesson), completed: false };

        const completed = lesson.challenges.every((challenge) => {
          return (
            challenge.challengeProgress.length > 0 &&
            challenge.challengeProgress.every((progress) => progress.completed)
          );
        });

        return { ...this.mapLessonRecord(rawLesson), completed };
      });

      return { ...unit, lessons };
    });
  }

  async getCourseById(courseId: number) {
    const data = await this.prisma.courses.findUnique({
      where: { id: courseId },
      include: {
        units: {
          orderBy: { order: "asc" },
          include: {
            lessons: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!data) return null;

    const course = this.mapCourse(data);
    return {
      ...course,
      units: data.units.map((unit) => ({
        ...this.mapUnitRecord(unit),
        lessons: unit.lessons.map((x) => this.mapLessonRecord(x)),
      })),
    };
  }

  async getCourseProgress() {
    const { userId } = await auth();
    const userProgress = await this.getUserProgress();

    if (!userId || !userProgress?.activeCourseId) return null;

    const unitsInActiveCourse = await this.prisma.units.findMany({
      where: { course_id: userProgress.activeCourseId },
      orderBy: { order: "asc" },
      include: {
        lessons: {
          orderBy: { order: "asc" },
          include: {
            units: true,
            challenges: {
              include: {
                vocabulary_items: true,
                challenge_progress: {
                  where: { user_id: userId },
                },
              },
            },
          },
        },
      },
    });

    const firstUncompletedLesson = unitsInActiveCourse
      .flatMap((unit) => unit.lessons)
      .map((lesson): LessonWithChallenges & { unit: UnitRecord } => ({
        ...this.mapLessonWithChallenges(lesson),
        unit: this.mapUnitRecord(lesson.units),
      }))
      .find((lesson) => {
        return lesson.challenges.some((challenge) => {
          return (
            challenge.challengeProgress.length === 0 ||
            challenge.challengeProgress.some((progress) => !progress.completed)
          );
        });
      });

    return {
      activeLesson: firstUncompletedLesson
        ? {
            id: firstUncompletedLesson.id,
            title: firstUncompletedLesson.title,
            unitId: firstUncompletedLesson.unitId,
            order: firstUncompletedLesson.order,
            unit: firstUncompletedLesson.unit,
          }
        : undefined,
      activeLessonId: firstUncompletedLesson?.id,
    };
  }

  async getLesson(id?: number) {
    const { userId } = await auth();

    if (!userId) return null;

    const courseProgress = await this.getCourseProgress();
    const lessonId = id || courseProgress?.activeLessonId;

    if (!lessonId) return null;

    const data = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      include: {
        challenges: {
          orderBy: { order: "asc" },
          include: {
            vocabulary_items: {
              include: {
                user_saved_words: {
                  where: { user_id: userId },
                },
                user_vocabulary_progress: {
                  where: { user_id: userId },
                },
                vocabulary_examples: {
                  orderBy: { order: "asc" },
                },
              },
            },
            challenge_options: true,
            challenge_progress: {
              where: { user_id: userId },
            },
          },
        },
      },
    });

    if (!data) return null;

    const lesson = this.mapLessonWithChallenges(data);
    const normalizedChallenges = lesson.challenges.map((challenge) => {
      const completed =
        challenge.challengeProgress.length > 0 &&
        challenge.challengeProgress.every((progress) => progress.completed);

      return { ...challenge, completed };
    });

    return { ...lesson, challenges: normalizedChallenges };
  }

  async getLessonPercentage() {
    const courseProgress = await this.getCourseProgress();

    if (!courseProgress?.activeLessonId) return 0;

    const lesson = await this.getLesson(courseProgress?.activeLessonId);

    if (!lesson) return 0;

    const completedChallenges = lesson.challenges.filter(
      (challenge) => challenge.completed
    );

    return Math.round(
      (completedChallenges.length / lesson.challenges.length) * 100
    );
  }

  async getTopTenUsers() {
    const { userId } = await auth();

    if (!userId) return [];

    const data = await this.prisma.user_progress.findMany({
      orderBy: { points: "desc" },
      take: 10,
    });

    return data.map((progress) => ({
      userId: progress.user_id,
      userName: progress.user_name,
      userImageSrc: progress.user_image_src,
      points: progress.points,
    }));
  }
}
