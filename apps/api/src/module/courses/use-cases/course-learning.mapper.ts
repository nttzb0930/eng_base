import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma/prisma.service";
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
import type {
  UserSavedWord,
  UserVocabularyProgress,
  VocabularyExample,
  VocabularyItem,
} from "../../vocabulary";

export type Course = CourseDto;

export type UnitRecord = CourseUnitDto;

export type LessonRecord = CourseLessonDto;

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

export type RawVocabularyItem = vocabulary_itemsModel & {
  user_saved_words?: user_saved_wordsModel[];
  user_vocabulary_progress?: user_vocabulary_progressModel[];
  vocabulary_examples?: vocabulary_examplesModel[];
};

export type RawChallenge = challengesModel & {
  challenge_options?: challenge_optionsModel[];
  challenge_progress?: challenge_progressModel[];
  vocabulary_items?: RawVocabularyItem | null;
};

export type RawLesson = lessonsModel & {
  challenges?: RawChallenge[];
  units?: unitsModel | null;
};

export type RawUnit = unitsModel & {
  lessons?: RawLesson[];
};

export type RawUserProgress = user_progressModel & {
  courses?: coursesModel | null;
};

@Injectable()
export class CourseLearningMapper {
  constructor(protected readonly prisma: PrismaService) {}

  protected mapCourse(course: coursesModel): Course {
    return {
      id: course.id,
      title: course.title,
      imageSrc: course.image_src,
    };
  }

  protected mapUnitRecord(unit: unitsModel): UnitRecord {
    return {
      id: unit.id,
      title: unit.title,
      description: unit.description,
      courseId: unit.course_id,
      order: unit.order,
    };
  }

  protected mapLessonRecord(lesson: lessonsModel): LessonRecord {
    return {
      id: lesson.id,
      title: lesson.title,
      unitId: lesson.unit_id,
      order: lesson.order,
    };
  }

  protected mapUserProgress(
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

  protected mapSavedWord(savedWord: user_saved_wordsModel): UserSavedWord {
    return {
      id: savedWord.id,
      userId: savedWord.user_id,
      vocabularyItemId: savedWord.vocabulary_item_id,
      createdAt: savedWord.created_at,
    };
  }

  protected mapUserVocabularyProgress(
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

  protected mapVocabularyExample(
    example: vocabulary_examplesModel
  ): VocabularyExample {
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

  protected mapVocabularyItem(item: RawVocabularyItem): VocabularyItem {
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

  protected mapChallengeOption(
    option: challenge_optionsModel
  ): ChallengeOption {
    return {
      id: option.id,
      challengeId: option.challenge_id,
      text: option.text,
      correct: option.correct,
      imageSrc: option.image_src,
      audioSrc: option.audio_src,
    };
  }

  protected mapChallengeProgress(
    progress: challenge_progressModel
  ): ChallengeProgress {
    return {
      id: progress.id,
      userId: progress.user_id,
      challengeId: progress.challenge_id,
      completed: progress.completed,
    };
  }

  protected mapChallenge(challenge: RawChallenge): Challenge {
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

  protected mapLessonWithChallenges(lesson: RawLesson): LessonWithChallenges {
    return {
      ...this.mapLessonRecord(lesson),
      challenges: lesson.challenges?.map((x) => this.mapChallenge(x)) ?? [],
    };
  }

  protected mapUnitWithLessons(unit: RawUnit): UnitWithLessons {
    return {
      ...this.mapUnitRecord(unit),
      lessons:
        unit.lessons?.map((lesson) => ({
          ...this.mapLessonRecord(lesson),
          completed: false,
        })) ?? [],
    };
  }
}
