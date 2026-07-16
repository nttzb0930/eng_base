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
  type LessonCreateDto,
  type LessonUpdateDto,
} from "./dto/course-content-management.dto";
import {
  type AdminListFilter,
  sendAdminListResponse,
} from "./admin-list-response";
import { CreateAdminLessonUseCase } from "./use-cases/create-admin-lesson.use-case";
import { GetAdminLessonUseCase } from "./use-cases/get-admin-lesson.use-case";
import { ListAdminLessonsUseCase } from "./use-cases/list-admin-lessons.use-case";
import { RemoveAdminLessonUseCase } from "./use-cases/remove-admin-lesson.use-case";
import { UpdateAdminLessonUseCase } from "./use-cases/update-admin-lesson.use-case";

@Controller("admin/lessons")
@UseGuards(AdminJwtGuard)
export class AdminLessonsController {
  constructor(
    private readonly list: ListAdminLessonsUseCase,
    private readonly getOne: GetAdminLessonUseCase,
    private readonly create: CreateAdminLessonUseCase,
    private readonly update: UpdateAdminLessonUseCase,
    private readonly remove: RemoveAdminLessonUseCase
  ) {}

  @Get()
  async listItems(
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
  createItem(@Body() body: LessonCreateDto) {
    return this.create.execute(body);
  }

  @Put(":id")
  updateItem(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: LessonUpdateDto
  ) {
    return this.update.execute(id, body);
  }

  @Delete(":id")
  removeItem(@Param("id", ParseIntPipe) id: number) {
    return this.remove.execute(id);
  }
}
