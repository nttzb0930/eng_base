import type {
  Course,
  CourseLesson,
  CourseUnit,
  LessonChallenge,
  LessonChallengeOption,
} from "@repo/shared";

import type {
  challenge_options as challenge_optionsModel,
  challenges as challengesModel,
  courses as coursesModel,
  lessons as lessonsModel,
  units as unitsModel,
} from "@prisma/client";
import type {
  ChallengeCreateDto,
  ChallengeOptionCreateDto,
  ChallengeOptionUpdateDto,
  ChallengeUpdateDto,
  CourseCreateDto,
  CourseUpdateDto,
  LessonCreateDto,
  LessonUpdateDto,
  UnitCreateDto,
  UnitUpdateDto,
} from "../dto/course-content-management.dto";

export const mapCourse = (course: coursesModel): Course => ({
  id: course.id,
  title: course.title,
  imageSrc: course.image_src,
});

export const mapUnit = (unit: unitsModel): CourseUnit => ({
  id: unit.id,
  title: unit.title,
  description: unit.description,
  courseId: unit.course_id,
  order: unit.order,
});

export const mapLesson = (lesson: lessonsModel): CourseLesson => ({
  id: lesson.id,
  title: lesson.title,
  unitId: lesson.unit_id,
  order: lesson.order,
});

export const mapChallenge = (
  challenge: challengesModel
): LessonChallenge => ({
  id: challenge.id,
  lessonId: challenge.lesson_id,
  type: challenge.type,
  question: challenge.question,
  order: challenge.order,
  vocabularyItemId: challenge.vocabulary_item_id,
  direction: challenge.direction,
});

export const mapChallengeOption = (
  option: challenge_optionsModel
): LessonChallengeOption => ({
  id: option.id,
  challengeId: option.challenge_id,
  text: option.text,
  correct: option.correct,
  imageSrc: option.image_src,
  audioSrc: option.audio_src,
});

export const toCourseCreateData = (body: CourseCreateDto) => ({
  title: body.title,
  image_src: body.imageSrc,
});

export const toCourseData = (body: CourseUpdateDto) => ({
  ...(body.title !== undefined ? { title: body.title } : {}),
  ...(body.imageSrc !== undefined ? { image_src: body.imageSrc } : {}),
});

export const toUnitCreateData = (body: UnitCreateDto) => ({
  title: body.title,
  description: body.description,
  course_id: body.courseId,
  order: body.order,
});

export const toUnitData = (body: UnitUpdateDto) => ({
  ...(body.title !== undefined ? { title: body.title } : {}),
  ...(body.description !== undefined ? { description: body.description } : {}),
  ...(body.courseId !== undefined ? { course_id: body.courseId } : {}),
  ...(body.order !== undefined ? { order: body.order } : {}),
});

export const toLessonCreateData = (body: LessonCreateDto) => ({
  title: body.title,
  unit_id: body.unitId,
  order: body.order,
});

export const toLessonData = (body: LessonUpdateDto) => ({
  ...(body.title !== undefined ? { title: body.title } : {}),
  ...(body.unitId !== undefined ? { unit_id: body.unitId } : {}),
  ...(body.order !== undefined ? { order: body.order } : {}),
});

export const toChallengeCreateData = (body: ChallengeCreateDto) => ({
  lesson_id: body.lessonId,
  type: body.type,
  question: body.question,
  order: body.order,
  vocabulary_item_id: body.vocabularyItemId ?? null,
  direction: body.direction ?? null,
});

export const toChallengeData = (body: ChallengeUpdateDto) => ({
  ...(body.lessonId !== undefined ? { lesson_id: body.lessonId } : {}),
  ...(body.type !== undefined ? { type: body.type } : {}),
  ...(body.question !== undefined ? { question: body.question } : {}),
  ...(body.order !== undefined ? { order: body.order } : {}),
  ...(body.vocabularyItemId !== undefined
    ? { vocabulary_item_id: body.vocabularyItemId }
    : {}),
  ...(body.direction !== undefined ? { direction: body.direction } : {}),
});

export const toChallengeOptionCreateData = (
  body: ChallengeOptionCreateDto
) => ({
  challenge_id: body.challengeId,
  text: body.text,
  correct: body.correct,
  image_src: body.imageSrc ?? null,
  audio_src: body.audioSrc ?? null,
});

export const toChallengeOptionData = (body: ChallengeOptionUpdateDto) => ({
  ...(body.challengeId !== undefined ? { challenge_id: body.challengeId } : {}),
  ...(body.text !== undefined ? { text: body.text } : {}),
  ...(body.correct !== undefined ? { correct: body.correct } : {}),
  ...(body.imageSrc !== undefined ? { image_src: body.imageSrc } : {}),
  ...(body.audioSrc !== undefined ? { audio_src: body.audioSrc } : {}),
});
