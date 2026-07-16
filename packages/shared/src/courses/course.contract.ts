import { z } from "zod";

export const CourseDtoSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  imageSrc: z.string(),
});

export type CourseDto = z.infer<typeof CourseDtoSchema>;

export const CourseUnitDtoSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string(),
  courseId: z.number().int(),
  order: z.number().int(),
});

export type CourseUnitDto = z.infer<typeof CourseUnitDtoSchema>;

export const CourseLessonDtoSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  unitId: z.number().int(),
  order: z.number().int(),
});

export type CourseLessonDto = z.infer<typeof CourseLessonDtoSchema>;

export const LESSON_CHALLENGE_TYPES = ["SELECT", "ASSIST"] as const;
export const LessonChallengeTypeSchema = z.enum(LESSON_CHALLENGE_TYPES);
export type LessonChallengeType = z.infer<typeof LessonChallengeTypeSchema>;

export const LESSON_CHALLENGE_DIRECTIONS = ["EN_TO_VI", "VI_TO_EN"] as const;
export const LessonChallengeDirectionSchema = z.enum(
  LESSON_CHALLENGE_DIRECTIONS
);
export type LessonChallengeDirection = z.infer<
  typeof LessonChallengeDirectionSchema
>;

export const LessonChallengeDtoSchema = z.object({
  id: z.number().int(),
  lessonId: z.number().int(),
  type: LessonChallengeTypeSchema,
  direction: LessonChallengeDirectionSchema.nullable(),
  question: z.string(),
  order: z.number().int(),
  vocabularyItemId: z.number().int().nullable(),
});

export type LessonChallengeDto = z.infer<typeof LessonChallengeDtoSchema>;

export const LessonChallengeOptionDtoSchema = z.object({
  id: z.number().int(),
  challengeId: z.number().int(),
  text: z.string(),
  correct: z.boolean(),
  imageSrc: z.string().nullable(),
  audioSrc: z.string().nullable(),
});

export type LessonChallengeOptionDto = z.infer<
  typeof LessonChallengeOptionDtoSchema
>;

export const CourseManagementPaginationDtoSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type CourseManagementPaginationDto = z.infer<
  typeof CourseManagementPaginationDtoSchema
>;

const paginated = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    pagination: CourseManagementPaginationDtoSchema,
  });

export const PaginatedCoursesDtoSchema = paginated(CourseDtoSchema);
export const PaginatedCourseUnitsDtoSchema = paginated(CourseUnitDtoSchema);
export const PaginatedCourseLessonsDtoSchema = paginated(CourseLessonDtoSchema);
export const PaginatedLessonChallengesDtoSchema = paginated(
  LessonChallengeDtoSchema
);
export const PaginatedLessonChallengeOptionsDtoSchema = paginated(
  LessonChallengeOptionDtoSchema
);

export type PaginatedCoursesDto = z.infer<typeof PaginatedCoursesDtoSchema>;
export type PaginatedCourseUnitsDto = z.infer<
  typeof PaginatedCourseUnitsDtoSchema
>;
export type PaginatedCourseLessonsDto = z.infer<
  typeof PaginatedCourseLessonsDtoSchema
>;
export type PaginatedLessonChallengesDto = z.infer<
  typeof PaginatedLessonChallengesDtoSchema
>;
export type PaginatedLessonChallengeOptionsDto = z.infer<
  typeof PaginatedLessonChallengeOptionsDtoSchema
>;

export const CreateCourseRequestSchema = CourseDtoSchema.pick({
  title: true,
  imageSrc: true,
});
export const UpdateCourseRequestSchema = CreateCourseRequestSchema.partial();
export type CreateCourseRequest = z.infer<typeof CreateCourseRequestSchema>;
export type UpdateCourseRequest = z.infer<typeof UpdateCourseRequestSchema>;

export const CreateCourseUnitRequestSchema = CourseUnitDtoSchema.pick({
  title: true,
  description: true,
  courseId: true,
  order: true,
});
export const UpdateCourseUnitRequestSchema =
  CreateCourseUnitRequestSchema.partial();
export type CreateCourseUnitRequest = z.infer<
  typeof CreateCourseUnitRequestSchema
>;
export type UpdateCourseUnitRequest = z.infer<
  typeof UpdateCourseUnitRequestSchema
>;

export const CreateCourseLessonRequestSchema = CourseLessonDtoSchema.pick({
  title: true,
  unitId: true,
  order: true,
});
export const UpdateCourseLessonRequestSchema =
  CreateCourseLessonRequestSchema.partial();
export type CreateCourseLessonRequest = z.infer<
  typeof CreateCourseLessonRequestSchema
>;
export type UpdateCourseLessonRequest = z.infer<
  typeof UpdateCourseLessonRequestSchema
>;

export const CreateLessonChallengeRequestSchema = z.object({
  lessonId: z.number().int(),
  type: LessonChallengeTypeSchema,
  direction: LessonChallengeDirectionSchema.nullable().optional(),
  question: z.string(),
  order: z.number().int(),
  vocabularyItemId: z.number().int().nullable().optional(),
});
export const UpdateLessonChallengeRequestSchema =
  CreateLessonChallengeRequestSchema.partial();
export type CreateLessonChallengeRequest = z.infer<
  typeof CreateLessonChallengeRequestSchema
>;
export type UpdateLessonChallengeRequest = z.infer<
  typeof UpdateLessonChallengeRequestSchema
>;

export const CreateLessonChallengeOptionRequestSchema = z.object({
  challengeId: z.number().int(),
  text: z.string(),
  correct: z.boolean(),
  imageSrc: z.string().nullable().optional(),
  audioSrc: z.string().nullable().optional(),
});
export const UpdateLessonChallengeOptionRequestSchema =
  CreateLessonChallengeOptionRequestSchema.partial();
export type CreateLessonChallengeOptionRequest = z.infer<
  typeof CreateLessonChallengeOptionRequestSchema
>;
export type UpdateLessonChallengeOptionRequest = z.infer<
  typeof UpdateLessonChallengeOptionRequestSchema
>;

export const CourseManagementPageQuerySchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  search: z.string().optional(),
});

export type CourseManagementPageQuery = z.infer<
  typeof CourseManagementPageQuerySchema
>;
