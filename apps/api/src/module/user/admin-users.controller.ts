import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
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
import {
  UserCreateDto,
  UserUpdateDto,
} from "./dto/user-management.dto";
import { UserManagementService } from "./user-management.service";

@Controller("admin/users")
@UseGuards(AdminJwtGuard)
export class AdminUsersController {
  constructor(private readonly users: UserManagementService) {}

  @Get()
  async list(
    @Res() response: Response,
    @FilterParse({
      allowPagination: true,
      allowSorting: true,
      defaultSortBy: "username",
      defaultSort: "asc",
      allowedSortBy: ["username", "email", "role", "created_at"],
      searchBy: ["username", "email"],
      schema: z.object({ role: z.string().optional() }),
    })
    query: FilterParseResult<Record<string, unknown>>
  ) {
    if (query.hasPage) {
      const [data, total] = await Promise.all([
        this.users.list(query.prismaQuery),
        this.users.count({ where: query.prismaQuery.where }),
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

    const data = await this.users.list({
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
  get(@Param("id") id: string) {
    return this.users.get(id);
  }

  @Post()
  create(@Body() body: UserCreateDto) {
    return this.users.create(body);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: UserUpdateDto) {
    return this.users.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.users.remove(id);
  }
}
