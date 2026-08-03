import { Module } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { resolve } from "node:path";

import { UserJwtGuard } from "../../common/guards/user-jwt.guard";
import { WritingAiRateLimitGuard } from "../../common/guards/writing-ai-rate-limit.guard";
import { applicationConfig, geminiConfig } from "../../config";
import { PrismaService } from "../../database/prisma/prisma.service";
import { ToeicWritingController } from "./toeic-writing.controller";
import { ToeicWritingMediaController } from "./toeic-writing-media.controller";
import {
  createGeminiWritingClient,
  GeminiWritingProvider,
} from "./provider/gemini-writing.provider";
import { PrismaWritingAiRepository } from "./repository/prisma-writing-ai.repository";
import { PrismaWritingPartOneTaskSource } from "./repository/prisma-writing-task.repository";
import { OwnedWritingPictureResolver } from "./services/writing-picture-resolver";
import { WritingAiObservabilityService } from "./observability/writing-ai-observability.service";
import { DeleteToeicWritingDraftUseCase } from "./use-cases/delete-toeic-writing-draft.use-case";
import { GetToeicWritingDraftUseCase } from "./use-cases/get-toeic-writing-draft.use-case";
import { GetToeicWritingImageUseCase } from "./use-cases/get-toeic-writing-image.use-case";
import { GetToeicWritingOverviewUseCase } from "./use-cases/get-toeic-writing-overview.use-case";
import { GetToeicWritingSubmissionUseCase } from "./use-cases/get-toeic-writing-submission.use-case";
import { GetToeicWritingTaskUseCase } from "./use-cases/get-toeic-writing-task.use-case";
import { GradeToeicWritingPartOneUseCase } from "./use-cases/grade-toeic-writing-part-one.use-case";
import { GetToeicWritingQuotaUseCase } from "./use-cases/get-toeic-writing-quota.use-case";
import { GetToeicWritingGradeUseCase } from "./use-cases/get-toeic-writing-grade.use-case";
import { ListToeicWritingGradesUseCase } from "./use-cases/list-toeic-writing-grades.use-case";
import { RecordToeicWritingAssistanceUseCase } from "./use-cases/record-toeic-writing-assistance.use-case";
import { ListToeicWritingTasksUseCase } from "./use-cases/list-toeic-writing-tasks.use-case";
import { SaveToeicWritingDraftUseCase } from "./use-cases/save-toeic-writing-draft.use-case";
import { SubmitToeicWritingTaskUseCase } from "./use-cases/submit-toeic-writing-task.use-case";

@Module({
  controllers: [ToeicWritingController, ToeicWritingMediaController],
  providers: [
    GetToeicWritingOverviewUseCase,
    ListToeicWritingTasksUseCase,
    GetToeicWritingTaskUseCase,
    GetToeicWritingDraftUseCase,
    SaveToeicWritingDraftUseCase,
    DeleteToeicWritingDraftUseCase,
    SubmitToeicWritingTaskUseCase,
    GetToeicWritingSubmissionUseCase,
    {
      provide: GradeToeicWritingPartOneUseCase,
      inject: [
        PrismaService,
        applicationConfig.KEY,
        geminiConfig.KEY,
        WritingAiObservabilityService,
      ],
      useFactory: (
        prisma: PrismaService,
        application: ConfigType<typeof applicationConfig>,
        gemini: ConfigType<typeof geminiConfig>,
        observability: WritingAiObservabilityService
      ) => {
        const repository = new PrismaWritingAiRepository(prisma);
        const provider = gemini.enabled
          ? new GeminiWritingProvider(
              createGeminiWritingClient(gemini.apiKey),
              gemini
            )
          : {
              gradePartOne: () =>
                Promise.reject(new Error("Writing AI is disabled")),
            };
        return new GradeToeicWritingPartOneUseCase(
          new PrismaWritingPartOneTaskSource(prisma),
          repository,
          provider,
          new OwnedWritingPictureResolver(
            repository,
            resolve(application.licensedContentRoot, "writing")
          ),
          gemini,
          observability
        );
      },
    },
    {
      provide: GetToeicWritingQuotaUseCase,
      inject: [PrismaService, geminiConfig.KEY],
      useFactory: (
        prisma: PrismaService,
        gemini: ConfigType<typeof geminiConfig>
      ) =>
        new GetToeicWritingQuotaUseCase(
          new PrismaWritingAiRepository(prisma),
          gemini.dailyLimit
        ),
    },
    {
      provide: GetToeicWritingGradeUseCase,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new GetToeicWritingGradeUseCase(
          new PrismaWritingAiRepository(prisma)
        ),
    },
    {
      provide: ListToeicWritingGradesUseCase,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new ListToeicWritingGradesUseCase(
          new PrismaWritingAiRepository(prisma)
        ),
    },
    {
      provide: RecordToeicWritingAssistanceUseCase,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        new RecordToeicWritingAssistanceUseCase(
          new PrismaWritingPartOneTaskSource(prisma),
          new PrismaWritingAiRepository(prisma)
        ),
    },
    {
      provide: GetToeicWritingImageUseCase,
      inject: [PrismaService, applicationConfig.KEY],
      useFactory: (
        prisma: PrismaService,
        application: ConfigType<typeof applicationConfig>
      ) =>
        new GetToeicWritingImageUseCase(
          prisma,
          resolve(application.licensedContentRoot, "writing")
        ),
    },
    UserJwtGuard,
    WritingAiRateLimitGuard,
    WritingAiObservabilityService,
  ],
})
export class ToeicWritingModule {}
