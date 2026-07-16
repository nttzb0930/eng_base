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
import { UserCreateBody, UserBody } from "./admin-mappers";
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
