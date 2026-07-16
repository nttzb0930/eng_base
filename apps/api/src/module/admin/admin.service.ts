import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";
import {
  type ChallengeBody,
  type ChallengeCreateBody,
  type ChallengeOptionBody,
  type ChallengeOptionCreateBody,
  type CourseBody,
  type CourseCreateBody,
  type LessonBody,
  type LessonCreateBody,
  mapChallenge,
  mapChallengeOption,
  mapCourse,
  mapLesson,
  mapUnit,
  type UnitBody,
  type UnitCreateBody,
  toChallengeCreateData,
  toChallengeData,
  toChallengeOptionCreateData,
  toChallengeOptionData,
  toCourseCreateData,
  toCourseData,
  toLessonCreateData,
  toLessonData,
  toUnitCreateData,
  toUnitData,
  type UserCreateBody,
  type UserBody,
  mapUser,
} from "./admin-mappers";
import { hashPassword } from "../../auth/password";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses(query?: any) {
    if (query) {
      return (await this.prisma.courses.findMany(query)).map(mapCourse);
    }
    return (await this.prisma.courses.findMany()).map(mapCourse);
  }

  async countCourses(where?: any) {
    return this.prisma.courses.count({ where });
  }

  async getCourse(id: number) {
    const item = await this.prisma.courses.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Course with ID ${id} not found`);
    return mapCourse(item);
  }

  async createCourse(body: CourseCreateBody) {
    return mapCourse(
      await this.prisma.courses.create({ data: toCourseCreateData(body) })
    );
  }

  async updateCourse(id: number, body: CourseBody) {
    return mapCourse(
      await this.prisma.courses.update({
        where: { id },
        data: toCourseData(body),
      })
    );
  }

  async deleteCourse(id: number) {
    return mapCourse(await this.prisma.courses.delete({ where: { id } }));
  }

  async listUnits(query?: any) {
    if (query) {
      return (await this.prisma.units.findMany(query)).map(mapUnit);
    }
    return (await this.prisma.units.findMany()).map(mapUnit);
  }

  async countUnits(where?: any) {
    return this.prisma.units.count({ where });
  }

  async getUnit(id: number) {
    const item = await this.prisma.units.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Unit with ID ${id} not found`);
    return mapUnit(item);
  }

  async createUnit(body: UnitCreateBody) {
    return mapUnit(
      await this.prisma.units.create({ data: toUnitCreateData(body) })
    );
  }

  async updateUnit(id: number, body: UnitBody) {
    return mapUnit(
      await this.prisma.units.update({ where: { id }, data: toUnitData(body) })
    );
  }

  async deleteUnit(id: number) {
    return mapUnit(await this.prisma.units.delete({ where: { id } }));
  }

  async listLessons(query?: any) {
    if (query) {
      return (await this.prisma.lessons.findMany(query)).map(mapLesson);
    }
    return (await this.prisma.lessons.findMany()).map(mapLesson);
  }

  async countLessons(where?: any) {
    return this.prisma.lessons.count({ where });
  }

  async getLesson(id: number) {
    const item = await this.prisma.lessons.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Lesson with ID ${id} not found`);
    return mapLesson(item);
  }

  async createLesson(body: LessonCreateBody) {
    return mapLesson(
      await this.prisma.lessons.create({ data: toLessonCreateData(body) })
    );
  }

  async updateLesson(id: number, body: LessonBody) {
    return mapLesson(
      await this.prisma.lessons.update({
        where: { id },
        data: toLessonData(body),
      })
    );
  }

  async deleteLesson(id: number) {
    return mapLesson(await this.prisma.lessons.delete({ where: { id } }));
  }

  async listChallenges(query?: any) {
    if (query) {
      return (await this.prisma.challenges.findMany(query)).map(mapChallenge);
    }
    return (await this.prisma.challenges.findMany()).map(mapChallenge);
  }

  async countChallenges(where?: any) {
    return this.prisma.challenges.count({ where });
  }

  async getChallenge(id: number) {
    const item = await this.prisma.challenges.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Challenge with ID ${id} not found`);
    return mapChallenge(item);
  }

  async createChallenge(body: ChallengeCreateBody) {
    return mapChallenge(
      await this.prisma.challenges.create({
        data: toChallengeCreateData(body),
      })
    );
  }

  async updateChallenge(id: number, body: ChallengeBody) {
    return mapChallenge(
      await this.prisma.challenges.update({
        where: { id },
        data: toChallengeData(body),
      })
    );
  }

  async deleteChallenge(id: number) {
    return mapChallenge(
      await this.prisma.challenges.delete({ where: { id } })
    );
  }

  async listChallengeOptions(query?: any) {
    if (query) {
      return (await this.prisma.challenge_options.findMany(query)).map(
        mapChallengeOption
      );
    }
    return (await this.prisma.challenge_options.findMany()).map(
      mapChallengeOption
    );
  }

  async countChallengeOptions(where?: any) {
    return this.prisma.challenge_options.count({ where });
  }

  async getChallengeOption(id: number) {
    const item = await this.prisma.challenge_options.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException(`Challenge option with ID ${id} not found`);
    return mapChallengeOption(item);
  }

  async createChallengeOption(body: ChallengeOptionCreateBody) {
    return mapChallengeOption(
      await this.prisma.challenge_options.create({
        data: toChallengeOptionCreateData(body),
      })
    );
  }

  async updateChallengeOption(id: number, body: ChallengeOptionBody) {
    return mapChallengeOption(
      await this.prisma.challenge_options.update({
        where: { id },
        data: toChallengeOptionData(body),
      })
    );
  }

  async deleteChallengeOption(id: number) {
    return mapChallengeOption(
      await this.prisma.challenge_options.delete({ where: { id } })
    );
  }

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
