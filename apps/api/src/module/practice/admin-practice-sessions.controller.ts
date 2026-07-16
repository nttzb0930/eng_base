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
import { PracticeService } from "./practice.service";

@Controller("admin/practiceSessions")
@UseGuards(AdminJwtGuard)
export class AdminPracticeSessionsController {
  constructor(private readonly practice: PracticeService) {}

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
    if (query.hasPage) {
      const [data, total] = await Promise.all([
        this.practice.listPracticeSessions(query.prismaQuery),
        this.practice.countPracticeSessions(query.prismaQuery.where),
      ]);
      const totalPages = Math.ceil(total / query.limit);
      return response.json({
        data,
        pagination: {
          total,
          page: query.page,
          limit: query.limit,
          totalPages,
          hasNext: query.page < totalPages,
          hasPrev: query.page > 1,
        },
      });
    }

    const data = await this.practice.listPracticeSessions({
      where: query.prismaQuery.where,
      orderBy: query.prismaQuery.orderBy,
    });
    response.setHeader(
      "Content-Range",
      `items 0-${Math.max(data.length - 1, 0)}/${data.length}`
    );
    return response.json(data);
  }

  @Get(":id")
  get(@Param("id", ParseIntPipe) id: number) {
    return this.practice.getPracticeSession(id);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.practice.deletePracticeSession(id);
  }
}
