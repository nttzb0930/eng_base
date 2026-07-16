import { CreateAdminChallengeOptionUseCase } from "./create-admin-challenge-option.use-case";
import { CreateAdminChallengeUseCase } from "./create-admin-challenge.use-case";
import { CreateAdminCourseUseCase } from "./create-admin-course.use-case";
import { CreateAdminLessonUseCase } from "./create-admin-lesson.use-case";
import { CreateAdminUnitUseCase } from "./create-admin-unit.use-case";
import { GetAdminChallengeOptionUseCase } from "./get-admin-challenge-option.use-case";
import { GetAdminChallengeUseCase } from "./get-admin-challenge.use-case";
import { GetAdminCourseUseCase } from "./get-admin-course.use-case";
import { GetAdminLessonUseCase } from "./get-admin-lesson.use-case";
import { GetAdminUnitUseCase } from "./get-admin-unit.use-case";
import { ListAdminChallengeOptionsUseCase } from "./list-admin-challenge-options.use-case";
import { ListAdminChallengesUseCase } from "./list-admin-challenges.use-case";
import { ListAdminCoursesUseCase } from "./list-admin-courses.use-case";
import { ListAdminLessonsUseCase } from "./list-admin-lessons.use-case";
import { ListAdminUnitsUseCase } from "./list-admin-units.use-case";
import { RemoveAdminChallengeOptionUseCase } from "./remove-admin-challenge-option.use-case";
import { RemoveAdminChallengeUseCase } from "./remove-admin-challenge.use-case";
import { RemoveAdminCourseUseCase } from "./remove-admin-course.use-case";
import { RemoveAdminLessonUseCase } from "./remove-admin-lesson.use-case";
import { RemoveAdminUnitUseCase } from "./remove-admin-unit.use-case";
import { UpdateAdminChallengeOptionUseCase } from "./update-admin-challenge-option.use-case";
import { UpdateAdminChallengeUseCase } from "./update-admin-challenge.use-case";
import { UpdateAdminCourseUseCase } from "./update-admin-course.use-case";
import { UpdateAdminLessonUseCase } from "./update-admin-lesson.use-case";
import { UpdateAdminUnitUseCase } from "./update-admin-unit.use-case";

export const ADMIN_COURSE_CONTENT_USE_CASES = [
  ListAdminCoursesUseCase,
  GetAdminCourseUseCase,
  CreateAdminCourseUseCase,
  UpdateAdminCourseUseCase,
  RemoveAdminCourseUseCase,
  ListAdminUnitsUseCase,
  GetAdminUnitUseCase,
  CreateAdminUnitUseCase,
  UpdateAdminUnitUseCase,
  RemoveAdminUnitUseCase,
  ListAdminLessonsUseCase,
  GetAdminLessonUseCase,
  CreateAdminLessonUseCase,
  UpdateAdminLessonUseCase,
  RemoveAdminLessonUseCase,
  ListAdminChallengesUseCase,
  GetAdminChallengeUseCase,
  CreateAdminChallengeUseCase,
  UpdateAdminChallengeUseCase,
  RemoveAdminChallengeUseCase,
  ListAdminChallengeOptionsUseCase,
  GetAdminChallengeOptionUseCase,
  CreateAdminChallengeOptionUseCase,
  UpdateAdminChallengeOptionUseCase,
  RemoveAdminChallengeOptionUseCase,
] as const;
