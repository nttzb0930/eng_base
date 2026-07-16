import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";

import {
  FilterParse,
  type FilterParseResult,
} from "../../common/decorators/filter-parse.decorator";
import { AdminJwtGuard } from "../../common/guards/admin-jwt.guard";
import { sendAdminListResponse } from "../../common/http/admin-list-response";
import { GetAdminPracticeSessionUseCase } from "./use-cases/get-admin-practice-session.use-case";
import { ListAdminPracticeSessionsUseCase } from "./use-cases/list-admin-practice-sessions.use-case";
import { RemoveAdminPracticeSessionUseCase } from "./use-cases/remove-admin-practice-session.use-case";

@Controller("admin/practiceSessions")
@UseGuards(AdminJwtGuard)
export class AdminPracticeSessionsController {
  constructor(
    private readonly listSessions: ListAdminPracticeSessionsUseCase,
    private readonly getSession: GetAdminPracticeSessionUseCase,
    private readonly removeSession: RemoveAdminPracticeSessionUseCase
  ) {}

  @Get()
  async list(
    @Res() response: Response,
    @FilterParse({
      allowPagination: true,
      allowSorting: true,
      defaultSortBy: "created_at",
      defaultSort: "desc",
      allowedSortBy: ["id", "created_at", "accuracy"],
      searchBy: ["mode"],
      schema: z.object({ user_id: z.string().optional() }),
    })
    query: FilterParseResult<Record<string, unknown>>
  ) {
    await sendAdminListResponse(response, query, (listQuery, includeTotal) =>
      this.listSessions.execute(listQuery, includeTotal)
    );
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.getSession.execute(id);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.removeSession.execute(id);
  }
}
