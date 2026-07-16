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

import { FilterParse } from "../../common/decorators/filter-parse.decorator";
import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import {
  type ChallengeCreateDto,
  type ChallengeUpdateDto,
} from "./dto/course-content-management.dto";
import {
  type AdminListFilter,
  sendAdminListResponse,
} from "./admin-list-response";
import { CreateAdminChallengeUseCase } from "./use-cases/create-admin-challenge.use-case";
import { GetAdminChallengeUseCase } from "./use-cases/get-admin-challenge.use-case";
import { ListAdminChallengesUseCase } from "./use-cases/list-admin-challenges.use-case";
import { RemoveAdminChallengeUseCase } from "./use-cases/remove-admin-challenge.use-case";
import { UpdateAdminChallengeUseCase } from "./use-cases/update-admin-challenge.use-case";

@Controller("admin/challenges")
@UseGuards(AdminJwtGuard)
export class AdminChallengesController {
  constructor(
    private readonly list: ListAdminChallengesUseCase,
    private readonly getOne: GetAdminChallengeUseCase,
    private readonly create: CreateAdminChallengeUseCase,
    private readonly update: UpdateAdminChallengeUseCase,
    private readonly remove: RemoveAdminChallengeUseCase
  ) {}

  @Get()
  async listItems(
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
  createItem(@Body() body: ChallengeCreateDto) {
    return this.create.execute(body);
  }

  @Put(":id")
  updateItem(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ChallengeUpdateDto
  ) {
    return this.update.execute(id, body);
  }

  @Delete(":id")
  removeItem(@Param("id", ParseIntPipe) id: number) {
    return this.remove.execute(id);
  }
}
