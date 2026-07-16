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
import { sendAdminListResponse } from "../../common/http/admin-list-response";
import { UserCreateDto, UserUpdateDto } from "./dto/user-management.dto";
import { CreateAdminUserUseCase } from "./use-cases/create-admin-user.use-case";
import { GetAdminUserUseCase } from "./use-cases/get-admin-user.use-case";
import { ListAdminUsersUseCase } from "./use-cases/list-admin-users.use-case";
import { RemoveAdminUserUseCase } from "./use-cases/remove-admin-user.use-case";
import { UpdateAdminUserUseCase } from "./use-cases/update-admin-user.use-case";

@Controller("admin/users")
@UseGuards(AdminJwtGuard)
export class AdminUsersController {
  constructor(
    private readonly listUsers: ListAdminUsersUseCase,
    private readonly getUser: GetAdminUserUseCase,
    private readonly createUser: CreateAdminUserUseCase,
    private readonly updateUser: UpdateAdminUserUseCase,
    private readonly removeUser: RemoveAdminUserUseCase
  ) {}

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
    await sendAdminListResponse(response, query, (listQuery, includeTotal) =>
      this.listUsers.execute(listQuery, includeTotal)
    );
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.getUser.execute(id);
  }

  @Post()
  create(@Body() body: UserCreateDto) {
    return this.createUser.execute(body);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() body: UserUpdateDto) {
    return this.updateUser.execute(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.removeUser.execute(id);
  }
}
