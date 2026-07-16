import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { PrismaService } from "../../database/prisma/prisma.service";
import { PasswordService } from "../auth";
import type {
  UserCreateDto,
  UserUpdateDto,
} from "./dto/user-management.dto";
import { mapUser } from "./mappers/user.mapper";

@Injectable()
export class UserManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService
  ) {}

  async list(query?: Parameters<PrismaService["users"]["findMany"]>[0]) {
    return (await this.prisma.users.findMany(query)).map(mapUser);
  }

  count(where?: Parameters<PrismaService["users"]["count"]>[0]) {
    return this.prisma.users.count(where);
  }

  async get(id: string) {
    const user = await this.prisma.users.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return mapUser(user);
  }

  async create(body: UserCreateDto) {
    await this.assertIdentityAvailable(body.username, body.email);
    const user = await this.prisma.users.create({
      data: {
        username: body.username.trim(),
        email: body.email.trim().toLowerCase(),
        full_name: body.fullName.trim(),
        password: await this.passwords.hash(body.password),
        role: body.role,
      },
    });
    return mapUser(user);
  }

  async update(id: string, body: UserUpdateDto) {
    if (body.username !== undefined || body.email !== undefined) {
      await this.assertIdentityAvailable(body.username, body.email, id);
    }

    const user = await this.prisma.users.update({
      where: { id },
      data: {
        ...(body.username === undefined
          ? {}
          : { username: body.username.trim() }),
        ...(body.email === undefined
          ? {}
          : { email: body.email.trim().toLowerCase() }),
        ...(body.fullName === undefined
          ? {}
          : { full_name: body.fullName.trim() }),
        ...(body.role === undefined ? {} : { role: body.role }),
        ...(body.password === undefined || body.password.trim() === ""
          ? {}
          : { password: await this.passwords.hash(body.password) }),
      },
    });
    return mapUser(user);
  }

  async remove(id: string) {
    return mapUser(await this.prisma.users.delete({ where: { id } }));
  }

  private async assertIdentityAvailable(
    username?: string,
    email?: string,
    excludedId?: string
  ) {
    const identities = [
      ...(username === undefined ? [] : [{ username: username.trim() }]),
      ...(email === undefined
        ? []
        : [{ email: email.trim().toLowerCase() }]),
    ];
    const existing = await this.prisma.users.findFirst({
      where: {
        ...(excludedId === undefined ? {} : { id: { not: excludedId } }),
        OR: identities,
      },
    });
    if (existing) throw new ConflictException("Username or email already exists");
  }
}
