import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../../../database/prisma/prisma.service";
import type {
  ChallengeCreateDto,
  ChallengeOptionCreateDto,
  ChallengeOptionUpdateDto,
  ChallengeUpdateDto,
  CourseCreateDto,
  CourseUpdateDto,
  LessonCreateDto,
  LessonUpdateDto,
  UnitCreateDto,
  UnitUpdateDto,
} from "../dto/course-content-management.dto";
import {
  mapChallenge,
  mapChallengeOption,
  mapCourse,
  mapLesson,
  mapUnit,
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
} from "../mappers/course-content.mapper";

@Injectable()
export class CourseContentManagementUseCases {
  constructor(private readonly prisma: PrismaService) {}

  async listCourses(
    query?: Parameters<PrismaService["courses"]["findMany"]>[0]
  ) {
    if (query) {
      return (await this.prisma.courses.findMany(query)).map(mapCourse);
    }
    return (await this.prisma.courses.findMany()).map(mapCourse);
  }

  async countCourses(
    where?: NonNullable<
      Parameters<PrismaService["courses"]["count"]>[0]
    >["where"]
  ) {
    return this.prisma.courses.count({ where });
  }

  async getCourse(id: number) {
    const item = await this.prisma.courses.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Course with ID ${id} not found`);
    return mapCourse(item);
  }

  async createCourse(body: CourseCreateDto) {
    return mapCourse(
      await this.prisma.courses.create({ data: toCourseCreateData(body) })
    );
  }

  async updateCourse(id: number, body: CourseUpdateDto) {
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

  async listUnits(query?: Parameters<PrismaService["units"]["findMany"]>[0]) {
    if (query) {
      return (await this.prisma.units.findMany(query)).map(mapUnit);
    }
    return (await this.prisma.units.findMany()).map(mapUnit);
  }

  async countUnits(
    where?: NonNullable<Parameters<PrismaService["units"]["count"]>[0]>["where"]
  ) {
    return this.prisma.units.count({ where });
  }

  async getUnit(id: number) {
    const item = await this.prisma.units.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Unit with ID ${id} not found`);
    return mapUnit(item);
  }

  async createUnit(body: UnitCreateDto) {
    return mapUnit(
      await this.prisma.units.create({ data: toUnitCreateData(body) })
    );
  }

  async updateUnit(id: number, body: UnitUpdateDto) {
    return mapUnit(
      await this.prisma.units.update({
        where: { id },
        data: toUnitData(body),
      })
    );
  }

  async deleteUnit(id: number) {
    return mapUnit(await this.prisma.units.delete({ where: { id } }));
  }

  async listLessons(
    query?: Parameters<PrismaService["lessons"]["findMany"]>[0]
  ) {
    if (query) {
      return (await this.prisma.lessons.findMany(query)).map(mapLesson);
    }
    return (await this.prisma.lessons.findMany()).map(mapLesson);
  }

  async countLessons(
    where?: NonNullable<
      Parameters<PrismaService["lessons"]["count"]>[0]
    >["where"]
  ) {
    return this.prisma.lessons.count({ where });
  }

  async getLesson(id: number) {
    const item = await this.prisma.lessons.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Lesson with ID ${id} not found`);
    return mapLesson(item);
  }

  async createLesson(body: LessonCreateDto) {
    return mapLesson(
      await this.prisma.lessons.create({ data: toLessonCreateData(body) })
    );
  }

  async updateLesson(id: number, body: LessonUpdateDto) {
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

  async listChallenges(
    query?: Parameters<PrismaService["challenges"]["findMany"]>[0]
  ) {
    if (query) {
      return (await this.prisma.challenges.findMany(query)).map(mapChallenge);
    }
    return (await this.prisma.challenges.findMany()).map(mapChallenge);
  }

  async countChallenges(
    where?: NonNullable<
      Parameters<PrismaService["challenges"]["count"]>[0]
    >["where"]
  ) {
    return this.prisma.challenges.count({ where });
  }

  async getChallenge(id: number) {
    const item = await this.prisma.challenges.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Challenge with ID ${id} not found`);
    return mapChallenge(item);
  }

  async createChallenge(body: ChallengeCreateDto) {
    return mapChallenge(
      await this.prisma.challenges.create({
        data: toChallengeCreateData(body),
      })
    );
  }

  async updateChallenge(id: number, body: ChallengeUpdateDto) {
    return mapChallenge(
      await this.prisma.challenges.update({
        where: { id },
        data: toChallengeData(body),
      })
    );
  }

  async deleteChallenge(id: number) {
    return mapChallenge(await this.prisma.challenges.delete({ where: { id } }));
  }

  async listChallengeOptions(
    query?: Parameters<PrismaService["challenge_options"]["findMany"]>[0]
  ) {
    if (query) {
      return (await this.prisma.challenge_options.findMany(query)).map(
        mapChallengeOption
      );
    }
    return (await this.prisma.challenge_options.findMany()).map(
      mapChallengeOption
    );
  }

  async countChallengeOptions(
    where?: NonNullable<
      Parameters<PrismaService["challenge_options"]["count"]>[0]
    >["where"]
  ) {
    return this.prisma.challenge_options.count({ where });
  }

  async getChallengeOption(id: number) {
    const item = await this.prisma.challenge_options.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException(`Challenge option with ID ${id} not found`);
    }
    return mapChallengeOption(item);
  }

  async createChallengeOption(body: ChallengeOptionCreateDto) {
    return mapChallengeOption(
      await this.prisma.challenge_options.create({
        data: toChallengeOptionCreateData(body),
      })
    );
  }

  async updateChallengeOption(id: number, body: ChallengeOptionUpdateDto) {
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
}
