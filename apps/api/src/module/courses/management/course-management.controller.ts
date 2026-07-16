import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { LessonChallengeTypeSchema } from "@repo/shared/courses";
import { z } from "zod";

import { AdminJwtGuard } from "../../../common/guards/admin-jwt.guard";
import {
  FilterParse,
  type FilterParseResult,
} from "../../../common/decorators/filter-parse.decorator";
import {
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
} from "./course-management.dto";
import { CourseManagementService } from "./course-management.service";

type ManagementFilterResult = FilterParseResult<Record<string, unknown>>;
type ManagementPrismaQuery = ManagementFilterResult["prismaQuery"];
type ManagementListQuery = Omit<ManagementPrismaQuery, "skip" | "take"> &
  Partial<Pick<ManagementPrismaQuery, "skip" | "take">>;

@Controller("admin")
@UseGuards(AdminJwtGuard)
export class CourseManagementController {
  constructor(private readonly courses: CourseManagementService) {}

  private sendList(response: Response, items: unknown[]) {
    response.setHeader(
      "Content-Range",
      `items 0-${Math.max(items.length - 1, 0)}/${items.length}`
    );
    response.json(items);
  }

  private async handleListRequest(
    response: Response,
    query: ManagementFilterResult,
    listFn: (prismaQuery: ManagementListQuery) => Promise<unknown[]>,
    countFn: (where?: ManagementPrismaQuery["where"]) => Promise<number>
  ) {
    if (query.hasPage) {
      const [data, total] = await Promise.all([
        listFn(query.prismaQuery),
        countFn(query.prismaQuery.where),
      ]);
      const limit = query.limit;
      const page = query.page;
      const totalPages = Math.ceil(total / limit);

      response.json({
        data,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } else {
      const data = await listFn({
        where: query.prismaQuery.where,
        orderBy: query.prismaQuery.orderBy,
      });
      this.sendList(response, data);
    }
  }

  @Get("courses")
  async listCourses(
    @Res() response: Response,
    @FilterParse({
      allowPagination: true,
      allowSorting: true,
      defaultSortBy: "id",
      defaultSort: "asc",
      allowedSortBy: ["id", "title"],
      searchBy: ["title"],
      schema: z.object({}),
    })
    query: ManagementFilterResult
  ) {
    await this.handleListRequest(
      response,
      query,
      (prismaQuery) => this.courses.listCourses(prismaQuery),
      (where) => this.courses.countCourses(where)
    );
  }

  @Get("courses/:id")
  getCourse(@Param("id", ParseIntPipe) id: number) {
    return this.courses.getCourse(id);
  }

  @Post("courses")
  createCourse(@Body() body: CourseCreateDto) {
    return this.courses.createCourse(body);
  }

  @Put("courses/:id")
  updateCourse(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CourseUpdateDto
  ) {
    return this.courses.updateCourse(id, body);
  }

  @Delete("courses/:id")
  deleteCourse(@Param("id", ParseIntPipe) id: number) {
    return this.courses.deleteCourse(id);
  }

  @Get("units")
  async listUnits(
    @Res() response: Response,
    @FilterParse({
      allowPagination: true,
      allowSorting: true,
      defaultSortBy: "order",
      defaultSort: "asc",
      allowedSortBy: ["id", "title", "order"],
      searchBy: ["title", "description"],
      schema: z.object({
        course_id: z
          .string()
          .transform((value) => parseInt(value) || undefined)
          .optional(),
      }),
    })
    query: ManagementFilterResult
  ) {
    await this.handleListRequest(
      response,
      query,
      (prismaQuery) => this.courses.listUnits(prismaQuery),
      (where) => this.courses.countUnits(where)
    );
  }

  @Get("units/:id")
  getUnit(@Param("id", ParseIntPipe) id: number) {
    return this.courses.getUnit(id);
  }

  @Post("units")
  createUnit(@Body() body: UnitCreateDto) {
    return this.courses.createUnit(body);
  }

  @Put("units/:id")
  updateUnit(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UnitUpdateDto
  ) {
    return this.courses.updateUnit(id, body);
  }

  @Delete("units/:id")
  deleteUnit(@Param("id", ParseIntPipe) id: number) {
    return this.courses.deleteUnit(id);
  }

  @Get("lessons")
  async listLessons(
    @Res() response: Response,
    @FilterParse({
      allowPagination: true,
      allowSorting: true,
      defaultSortBy: "order",
      defaultSort: "asc",
      allowedSortBy: ["id", "title", "order"],
      searchBy: ["title"],
      schema: z.object({
        unit_id: z
          .string()
          .transform((value) => parseInt(value) || undefined)
          .optional(),
      }),
    })
    query: ManagementFilterResult
  ) {
    await this.handleListRequest(
      response,
      query,
      (prismaQuery) => this.courses.listLessons(prismaQuery),
      (where) => this.courses.countLessons(where)
    );
  }

  @Get("lessons/:id")
  getLesson(@Param("id", ParseIntPipe) id: number) {
    return this.courses.getLesson(id);
  }

  @Post("lessons")
  createLesson(@Body() body: LessonCreateDto) {
    return this.courses.createLesson(body);
  }

  @Put("lessons/:id")
  updateLesson(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: LessonUpdateDto
  ) {
    return this.courses.updateLesson(id, body);
  }

  @Delete("lessons/:id")
  deleteLesson(@Param("id", ParseIntPipe) id: number) {
    return this.courses.deleteLesson(id);
  }

  @Get("challenges")
  async listChallenges(
    @Res() response: Response,
    @FilterParse({
      allowPagination: true,
      allowSorting: true,
      defaultSortBy: "order",
      defaultSort: "asc",
      allowedSortBy: ["id", "order", "type"],
      searchBy: ["question"],
      schema: z.object({
        lesson_id: z
          .string()
          .transform((value) => parseInt(value) || undefined)
          .optional(),
        type: LessonChallengeTypeSchema.optional(),
      }),
    })
    query: ManagementFilterResult
  ) {
    await this.handleListRequest(
      response,
      query,
      (prismaQuery) => this.courses.listChallenges(prismaQuery),
      (where) => this.courses.countChallenges(where)
    );
  }

  @Get("challenges/:id")
  getChallenge(@Param("id", ParseIntPipe) id: number) {
    return this.courses.getChallenge(id);
  }

  @Post("challenges")
  createChallenge(@Body() body: ChallengeCreateDto) {
    return this.courses.createChallenge(body);
  }

  @Put("challenges/:id")
  updateChallenge(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ChallengeUpdateDto
  ) {
    return this.courses.updateChallenge(id, body);
  }

  @Delete("challenges/:id")
  deleteChallenge(@Param("id", ParseIntPipe) id: number) {
    return this.courses.deleteChallenge(id);
  }

  @Get("challengeOptions")
  async listChallengeOptions(
    @Res() response: Response,
    @FilterParse({
      allowPagination: true,
      allowSorting: true,
      defaultSortBy: "id",
      defaultSort: "asc",
      allowedSortBy: ["id"],
      searchBy: ["text"],
      schema: z.object({
        challenge_id: z
          .string()
          .transform((value) => parseInt(value) || undefined)
          .optional(),
        correct: z
          .string()
          .transform((value) => value === "true")
          .optional(),
      }),
    })
    query: ManagementFilterResult
  ) {
    await this.handleListRequest(
      response,
      query,
      (prismaQuery) => this.courses.listChallengeOptions(prismaQuery),
      (where) => this.courses.countChallengeOptions(where)
    );
  }

  @Get("challengeOptions/:id")
  getChallengeOption(@Param("id", ParseIntPipe) id: number) {
    return this.courses.getChallengeOption(id);
  }

  @Post("challengeOptions")
  createChallengeOption(@Body() body: ChallengeOptionCreateDto) {
    return this.courses.createChallengeOption(body);
  }

  @Put("challengeOptions/:id")
  updateChallengeOption(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ChallengeOptionUpdateDto
  ) {
    return this.courses.updateChallengeOption(id, body);
  }

  @Delete("challengeOptions/:id")
  deleteChallengeOption(@Param("id", ParseIntPipe) id: number) {
    return this.courses.deleteChallengeOption(id);
  }
}
