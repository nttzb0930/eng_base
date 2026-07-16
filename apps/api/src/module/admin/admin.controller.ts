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

import { AdminJwtGuard } from "../../auth/admin-jwt.guard";
import {
  ChallengeBody,
  ChallengeCreateBody,
  ChallengeOptionBody,
  ChallengeOptionCreateBody,
  CourseBody,
  CourseCreateBody,
  LessonBody,
  LessonCreateBody,
  UnitBody,
  UnitCreateBody,
  UserCreateBody,
  UserBody,
} from "./admin-mappers";
import { AdminService } from "./admin.service";
import { PracticeService } from "../practice/practice.service";
import { FilterParse, FilterParseResult } from "../../support/decorators/filter-parse.decorator";
import { z } from "zod";

@Controller("admin")
@UseGuards(AdminJwtGuard)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly practice: PracticeService,
  ) {}

  private sendList(response: Response, items: unknown[]) {
    response.setHeader("Content-Range", `items 0-${Math.max(items.length - 1, 0)}/${items.length}`);
    response.json(items);
  }

  private async handleListRequest(
    response: Response,
    query: FilterParseResult<any>,
    listFn: (prismaQuery: any) => Promise<any[]>,
    countFn: (where?: any) => Promise<number>,
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
      const data = await listFn({ where: query.prismaQuery.where, orderBy: query.prismaQuery.orderBy });
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
    query: FilterParseResult<any>,
  ) {
    await this.handleListRequest(
      response,
      query,
      (q) => this.admin.listCourses(q),
      (w) => this.admin.countCourses(w),
    );
  }

  @Get("courses/:id")
  getCourse(@Param("id", ParseIntPipe) id: number) {
    return this.admin.getCourse(id);
  }

  @Post("courses")
  createCourse(@Body() body: CourseCreateBody) {
    return this.admin.createCourse(body);
  }

  @Put("courses/:id")
  updateCourse(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CourseBody
  ) {
    return this.admin.updateCourse(id, body);
  }

  @Delete("courses/:id")
  deleteCourse(@Param("id", ParseIntPipe) id: number) {
    return this.admin.deleteCourse(id);
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
        course_id: z.string().transform(v => parseInt(v) || undefined).optional(),
      }),
    })
    query: FilterParseResult<any>,
  ) {
    await this.handleListRequest(
      response,
      query,
      (q) => this.admin.listUnits(q),
      (w) => this.admin.countUnits(w),
    );
  }

  @Get("units/:id")
  getUnit(@Param("id", ParseIntPipe) id: number) {
    return this.admin.getUnit(id);
  }

  @Post("units")
  createUnit(@Body() body: UnitCreateBody) {
    return this.admin.createUnit(body);
  }

  @Put("units/:id")
  updateUnit(@Param("id", ParseIntPipe) id: number, @Body() body: UnitBody) {
    return this.admin.updateUnit(id, body);
  }

  @Delete("units/:id")
  deleteUnit(@Param("id", ParseIntPipe) id: number) {
    return this.admin.deleteUnit(id);
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
        unit_id: z.string().transform(v => parseInt(v) || undefined).optional(),
      }),
    })
    query: FilterParseResult<any>,
  ) {
    await this.handleListRequest(
      response,
      query,
      (q) => this.admin.listLessons(q),
      (w) => this.admin.countLessons(w),
    );
  }

  @Get("lessons/:id")
  getLesson(@Param("id", ParseIntPipe) id: number) {
    return this.admin.getLesson(id);
  }

  @Post("lessons")
  createLesson(@Body() body: LessonCreateBody) {
    return this.admin.createLesson(body);
  }

  @Put("lessons/:id")
  updateLesson(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: LessonBody
  ) {
    return this.admin.updateLesson(id, body);
  }

  @Delete("lessons/:id")
  deleteLesson(@Param("id", ParseIntPipe) id: number) {
    return this.admin.deleteLesson(id);
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
        lesson_id: z.string().transform(v => parseInt(v) || undefined).optional(),
        type: z.enum(["SELECT", "ASSIST"]).optional(),
      }),
    })
    query: FilterParseResult<any>,
  ) {
    await this.handleListRequest(
      response,
      query,
      (q) => this.admin.listChallenges(q),
      (w) => this.admin.countChallenges(w),
    );
  }

  @Get("challenges/:id")
  getChallenge(@Param("id", ParseIntPipe) id: number) {
    return this.admin.getChallenge(id);
  }

  @Post("challenges")
  createChallenge(@Body() body: ChallengeCreateBody) {
    return this.admin.createChallenge(body);
  }

  @Put("challenges/:id")
  updateChallenge(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ChallengeBody
  ) {
    return this.admin.updateChallenge(id, body);
  }

  @Delete("challenges/:id")
  deleteChallenge(@Param("id", ParseIntPipe) id: number) {
    return this.admin.deleteChallenge(id);
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
        challenge_id: z.string().transform(v => parseInt(v) || undefined).optional(),
        correct: z.string().transform(v => v === "true").optional(),
      }),
    })
    query: FilterParseResult<any>,
  ) {
    await this.handleListRequest(
      response,
      query,
      (q) => this.admin.listChallengeOptions(q),
      (w) => this.admin.countChallengeOptions(w),
    );
  }

  @Get("challengeOptions/:id")
  getChallengeOption(@Param("id", ParseIntPipe) id: number) {
    return this.admin.getChallengeOption(id);
  }

  @Post("challengeOptions")
  createChallengeOption(@Body() body: ChallengeOptionCreateBody) {
    return this.admin.createChallengeOption(body);
  }

  @Put("challengeOptions/:id")
  updateChallengeOption(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ChallengeOptionBody
  ) {
    return this.admin.updateChallengeOption(id, body);
  }

  @Delete("challengeOptions/:id")
  deleteChallengeOption(@Param("id", ParseIntPipe) id: number) {
    return this.admin.deleteChallengeOption(id);
  }

  @Get("users")
  async listUsers(
    @Res() response: Response,
    @FilterParse({
      allowPagination: true,
      allowSorting: true,
      defaultSortBy: "username",
      defaultSort: "asc",
      allowedSortBy: ["username", "email", "role", "created_at"],
      searchBy: ["username", "email"],
      schema: z.object({
        role: z.string().optional(),
      }),
    })
    query: FilterParseResult<any>,
  ) {
    await this.handleListRequest(
      response,
      query,
      (q) => this.admin.listUsers(q),
      (w) => this.admin.countUsers(w),
    );
  }

  @Get("users/:id")
  getUser(@Param("id") id: string) {
    return this.admin.getUser(id);
  }

  @Post("users")
  createUser(@Body() body: UserCreateBody) {
    return this.admin.createUser(body);
  }

  @Put("users/:id")
  updateUser(
    @Param("id") id: string,
    @Body() body: UserBody
  ) {
    return this.admin.updateUser(id, body);
  }

  @Delete("users/:id")
  deleteUser(@Param("id") id: string) {
    return this.admin.deleteUser(id);
  }

  @Get("practiceSessions")
  async listPracticeSessions(
    @Res() response: Response,
    @FilterParse({
      allowPagination: true,
      allowSorting: true,
      defaultSortBy: "created_at",
      defaultSort: "desc",
      allowedSortBy: ["id", "created_at", "accuracy"],
      searchBy: ["mode"],
      schema: z.object({
        user_id: z.string().optional(),
      }),
    })
    query: FilterParseResult<any>,
  ) {
    await this.handleListRequest(
      response,
      query,
      (q) => this.practice.listPracticeSessions(q),
      (w) => this.practice.countPracticeSessions(w),
    );
  }

  @Get("practiceSessions/:id")
  getPracticeSession(@Param("id", ParseIntPipe) id: number) {
    return this.practice.getPracticeSession(id);
  }

  @Delete("practiceSessions/:id")
  deletePracticeSession(@Param("id", ParseIntPipe) id: number) {
    return this.practice.deletePracticeSession(id);
  }

  @Get("settings/:key")
  getSetting(@Param("key") key: string) {
    return this.admin.getSystemSetting(key, key === "MAX_HEARTS" ? "5" : "");
  }

  @Post("settings/:key")
  updateSetting(
    @Param("key") key: string,
    @Body() body: { value: string }
  ) {
    return this.admin.setSystemSetting(key, body.value);
  }
}
