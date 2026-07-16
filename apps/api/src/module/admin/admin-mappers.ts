import type {
  challenge_optionsModel,
  challengesModel,
  coursesModel,
  lessonsModel,
  unitsModel,
} from "../../generated/prisma/models";

import {
  CourseCreateDto as CourseCreateBody,
  CourseUpdateDto as CourseBody,
  UnitCreateDto as UnitCreateBody,
  UnitUpdateDto as UnitBody,
  LessonCreateDto as LessonCreateBody,
  LessonUpdateDto as LessonBody,
  ChallengeCreateDto as ChallengeCreateBody,
  ChallengeUpdateDto as ChallengeBody,
  ChallengeOptionCreateDto as ChallengeOptionCreateBody,
  ChallengeOptionUpdateDto as ChallengeOptionBody,
  UserCreateDto as UserCreateBody,
  UserUpdateDto as UserBody,
} from "./dto/admin.dto";

export {
  CourseCreateBody,
  CourseBody,
  UnitCreateBody,
  UnitBody,
  LessonCreateBody,
  LessonBody,
  ChallengeCreateBody,
  ChallengeBody,
  ChallengeOptionCreateBody,
  ChallengeOptionBody,
  UserCreateBody,
  UserBody,
};

export const mapCourse = (course: coursesModel) => ({
  id: course.id,
  title: course.title,
  imageSrc: course.image_src,
});

export const mapUnit = (unit: unitsModel) => ({
  id: unit.id,
  title: unit.title,
  description: unit.description,
  courseId: unit.course_id,
  order: unit.order,
});

export const mapLesson = (lesson: lessonsModel) => ({
  id: lesson.id,
  title: lesson.title,
  unitId: lesson.unit_id,
  order: lesson.order,
});

export const mapChallenge = (challenge: challengesModel) => ({
  id: challenge.id,
  lessonId: challenge.lesson_id,
  type: challenge.type,
  question: challenge.question,
  order: challenge.order,
  vocabularyItemId: challenge.vocabulary_item_id,
  direction: challenge.direction,
});

export const mapChallengeOption = (option: challenge_optionsModel) => ({
  id: option.id,
  challengeId: option.challenge_id,
  text: option.text,
  correct: option.correct,
  imageSrc: option.image_src,
  audioSrc: option.audio_src,
});

export const toCourseCreateData = (body: CourseCreateBody) => ({
  title: body.title,
  image_src: body.imageSrc,
});

export const toCourseData = (body: CourseBody) => ({
  ...(body.title !== undefined ? { title: body.title } : {}),
  ...(body.imageSrc !== undefined ? { image_src: body.imageSrc } : {}),
});

export const toUnitCreateData = (body: UnitCreateBody) => ({
  title: body.title,
  description: body.description,
  course_id: body.courseId,
  order: body.order,
});

export const toUnitData = (body: UnitBody) => ({
  ...(body.title !== undefined ? { title: body.title } : {}),
  ...(body.description !== undefined ? { description: body.description } : {}),
  ...(body.courseId !== undefined ? { course_id: body.courseId } : {}),
  ...(body.order !== undefined ? { order: body.order } : {}),
});

export const toLessonCreateData = (body: LessonCreateBody) => ({
  title: body.title,
  unit_id: body.unitId,
  order: body.order,
});

export const toLessonData = (body: LessonBody) => ({
  ...(body.title !== undefined ? { title: body.title } : {}),
  ...(body.unitId !== undefined ? { unit_id: body.unitId } : {}),
  ...(body.order !== undefined ? { order: body.order } : {}),
});

export const toChallengeCreateData = (body: ChallengeCreateBody) => ({
  lesson_id: body.lessonId,
  type: body.type,
  question: body.question,
  order: body.order,
  vocabulary_item_id: body.vocabularyItemId ?? null,
  direction: body.direction ?? null,
});

export const toChallengeData = (body: ChallengeBody) => ({
  ...(body.lessonId !== undefined ? { lesson_id: body.lessonId } : {}),
  ...(body.type !== undefined ? { type: body.type } : {}),
  ...(body.question !== undefined ? { question: body.question } : {}),
  ...(body.order !== undefined ? { order: body.order } : {}),
  ...(body.vocabularyItemId !== undefined
    ? { vocabulary_item_id: body.vocabularyItemId }
    : {}),
  ...(body.direction !== undefined ? { direction: body.direction } : {}),
});

export const toChallengeOptionCreateData = (body: ChallengeOptionCreateBody) => ({
  challenge_id: body.challengeId,
  text: body.text,
  correct: body.correct,
  image_src: body.imageSrc ?? null,
  audio_src: body.audioSrc ?? null,
});

export const toChallengeOptionData = (body: ChallengeOptionBody) => ({
  ...(body.challengeId !== undefined ? { challenge_id: body.challengeId } : {}),
  ...(body.text !== undefined ? { text: body.text } : {}),
  ...(body.correct !== undefined ? { correct: body.correct } : {}),
  ...(body.imageSrc !== undefined ? { image_src: body.imageSrc } : {}),
  ...(body.audioSrc !== undefined ? { audio_src: body.audioSrc } : {}),
});

export const mapUser = (user: any) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});

