import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import { mapUser } from "../mappers/user.mapper";

@Injectable()
export class RemoveAdminUserUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(id: string) {
    return mapUser(await this.prisma.users.delete({ where: { id } }));
  }
}
