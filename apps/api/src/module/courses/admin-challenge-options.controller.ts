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
  type ChallengeOptionCreateDto,
  type ChallengeOptionUpdateDto,
} from "./dto/course-content-management.dto";
import {
  type AdminListFilter,
  sendAdminListResponse,
} from "./admin-list-response";
import { CreateAdminChallengeOptionUseCase } from "./use-cases/create-admin-challenge-option.use-case";
import { GetAdminChallengeOptionUseCase } from "./use-cases/get-admin-challenge-option.use-case";
import { ListAdminChallengeOptionsUseCase } from "./use-cases/list-admin-challenge-options.use-case";
import { RemoveAdminChallengeOptionUseCase } from "./use-cases/remove-admin-challenge-option.use-case";
import { UpdateAdminChallengeOptionUseCase } from "./use-cases/update-admin-challenge-option.use-case";

@Controller("admin/challengeOptions")
@UseGuards(AdminJwtGuard)
export class AdminChallengeOptionsController {
  constructor(
    private readonly list: ListAdminChallengeOptionsUseCase,
    private readonly getOne: GetAdminChallengeOptionUseCase,
    private readonly create: CreateAdminChallengeOptionUseCase,
    private readonly update: UpdateAdminChallengeOptionUseCase,
    private readonly remove: RemoveAdminChallengeOptionUseCase
  ) {}

  @Get()
  async listItems(
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
  createItem(@Body() body: ChallengeOptionCreateDto) {
    return this.create.execute(body);
  }

  @Put(":id")
  updateItem(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ChallengeOptionUpdateDto
  ) {
    return this.update.execute(id, body);
  }

  @Delete(":id")
  removeItem(@Param("id", ParseIntPipe) id: number) {
    return this.remove.execute(id);
  }
}
