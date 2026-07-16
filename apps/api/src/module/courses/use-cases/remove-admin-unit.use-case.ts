import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapUnit } from "../mappers/course-content.mapper";

@Injectable()
export class RemoveAdminUnitUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: number) {
    return mapUnit(await this.prisma.units.delete({ where: { id } }));
  }
}
