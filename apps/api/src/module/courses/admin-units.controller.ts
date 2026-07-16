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
  type UnitCreateDto,
  type UnitUpdateDto,
} from "./dto/course-content-management.dto";
import {
  type AdminListFilter,
  sendAdminListResponse,
} from "./admin-list-response";
import { CreateAdminUnitUseCase } from "./use-cases/create-admin-unit.use-case";
import { GetAdminUnitUseCase } from "./use-cases/get-admin-unit.use-case";
import { ListAdminUnitsUseCase } from "./use-cases/list-admin-units.use-case";
import { RemoveAdminUnitUseCase } from "./use-cases/remove-admin-unit.use-case";
import { UpdateAdminUnitUseCase } from "./use-cases/update-admin-unit.use-case";

@Controller("admin/units")
@UseGuards(AdminJwtGuard)
export class AdminUnitsController {
  constructor(
    private readonly list: ListAdminUnitsUseCase,
    private readonly getOne: GetAdminUnitUseCase,
    private readonly create: CreateAdminUnitUseCase,
    private readonly update: UpdateAdminUnitUseCase,
    private readonly remove: RemoveAdminUnitUseCase
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
      searchBy: ["title", "description"],
      schema: z.object({
        course_id: z
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
  createItem(@Body() body: UnitCreateDto) {
    return this.create.execute(body);
  }

  @Put(":id")
  updateItem(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UnitUpdateDto
  ) {
    return this.update.execute(id, body);
  }

  @Delete(":id")
  removeItem(@Param("id", ParseIntPipe) id: number) {
    return this.remove.execute(id);
  }
}
