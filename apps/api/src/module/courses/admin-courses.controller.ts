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
import { z } from "zod";

import { FilterParse } from "../../common/decorators/filter-parse.decorator";
import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import {
  type CourseCreateDto,
  type CourseUpdateDto,
} from "./dto/course-content-management.dto";
import {
  type AdminListFilter,
  sendAdminListResponse,
} from "./admin-list-response";
import { CreateAdminCourseUseCase } from "./use-cases/create-admin-course.use-case";
import { GetAdminCourseUseCase } from "./use-cases/get-admin-course.use-case";
import { ListAdminCoursesUseCase } from "./use-cases/list-admin-courses.use-case";
import { RemoveAdminCourseUseCase } from "./use-cases/remove-admin-course.use-case";
import { UpdateAdminCourseUseCase } from "./use-cases/update-admin-course.use-case";

@Controller("admin/courses")
@UseGuards(AdminJwtGuard)
export class AdminCoursesController {
  constructor(
    private readonly list: ListAdminCoursesUseCase,
    private readonly getOne: GetAdminCourseUseCase,
    private readonly create: CreateAdminCourseUseCase,
    private readonly update: UpdateAdminCourseUseCase,
    private readonly remove: RemoveAdminCourseUseCase
  ) {}

  @Get()
  async listItems(
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
    query: AdminListFilter
  ) {
    await sendAdminListResponse(response, query, (prismaQuery, includeTotal) =>
      this.list.execute(prismaQuery, includeTotal)
    );
  }

  @Get(":id")
  getItem(@Param("id", ParseIntPipe) id: number) {
    return this.getOne.execute(id);
  }

  @Post()
  createItem(@Body() body: CourseCreateDto) {
    return this.create.execute(body);
  }

  @Put(":id")
  updateItem(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: CourseUpdateDto
  ) {
    return this.update.execute(id, body);
  }

  @Delete(":id")
  removeItem(@Param("id", ParseIntPipe) id: number) {
    return this.remove.execute(id);
  }
}
