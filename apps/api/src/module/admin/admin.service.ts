import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import {
  type UserCreateBody,
  type UserBody,
  mapUser,
} from "./admin-mappers";
import { hashPassword } from "../../auth/password";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query?: any) {
    if (query) {
      return (await this.prisma.users.findMany(query)).map(mapUser);
    }
    return (await this.prisma.users.findMany()).map(mapUser);
  }

  async countUsers(where?: any) {
    return this.prisma.users.count({ where });
  }

  async getUser(id: string) {
    const item = await this.prisma.users.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`User with ID ${id} not found`);
    return mapUser(item);
  }

  async createUser(body: UserCreateBody) {
    const existingUser = await this.prisma.users.findFirst({
      where: {
        OR: [
          { username: body.username.trim() },
          { email: body.email.trim().toLowerCase() }
        ]
      }
    });
    if (existingUser) {
      throw new ConflictException("Username or email already exists");
    }

    const hashedPassword = await hashPassword(body.password);
    const user = await this.prisma.users.create({
      data: {
        username: body.username.trim(),
        email: body.email.trim().toLowerCase(),
        full_name: body.fullName?.trim() ?? body.username.trim(),
        password: hashedPassword,
        role: body.role,
      },
    });
    return mapUser(user);
  }

  async updateUser(id: string, body: UserBody) {
    const updateData: any = {};
    if (body.username !== undefined) updateData.username = body.username.trim();
    if (body.email !== undefined) updateData.email = body.email.trim().toLowerCase();
    if (body.role !== undefined) updateData.role = body.role;
    if ((body as any).fullName !== undefined) updateData.full_name = (body as any).fullName.trim();
    if (body.password !== undefined && body.password.trim() !== "") {
      updateData.password = await hashPassword(body.password);
    }

    if (updateData.username !== undefined || updateData.email !== undefined) {
      const orConditions = [];
      if (updateData.username !== undefined) orConditions.push({ username: updateData.username });
      if (updateData.email !== undefined) orConditions.push({ email: updateData.email });
      
      const existingUser = await this.prisma.users.findFirst({
        where: {
          id: { not: id },
          OR: orConditions,
        }
      });
      if (existingUser) {
        throw new ConflictException("Username or email already exists");
      }
    }

    const user = await this.prisma.users.update({
      where: { id },
      data: updateData,
    });
    return mapUser(user);
  }

  async deleteUser(id: string) {
    const user = await this.prisma.users.delete({ where: { id } });
    return mapUser(user);
  }

  async getSystemSetting(key: string, defaultValue: string = ""): Promise<string> {
    const setting = await this.prisma.system_settings.findUnique({
      where: { key },
    });
    return setting ? setting.value : defaultValue;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    await this.prisma.system_settings.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
